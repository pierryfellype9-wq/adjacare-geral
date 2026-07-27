import { createClient } from "@supabase/supabase-js";
import { getVercelOidcToken } from "@vercel/functions/oidc";
import { google } from "googleapis";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || "sistema-adjacare";
const GOOGLE_CLOUD_PROJECT_NUMBER =
  process.env.GOOGLE_CLOUD_PROJECT_NUMBER || "399762898590";
const GOOGLE_WORKLOAD_IDENTITY_POOL =
  process.env.GOOGLE_WORKLOAD_IDENTITY_POOL || "vercel-adjacare";
const GOOGLE_WORKLOAD_IDENTITY_PROVIDER =
  process.env.GOOGLE_WORKLOAD_IDENTITY_PROVIDER || "vercel-production";
const GOOGLE_SERVICE_ACCOUNT_EMAIL =
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
  "firebase-adminsdk-fbsvc@sistema-adjacare.iam.gserviceaccount.com";

function credenciaisFirebase() {
  const valor = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!valor) return null;

  try {
    return JSON.parse(valor);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT não contém um JSON válido.");
  }
}

function textoPush(valor, limite) {
  return String(valor || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limite);
}

async function tokenAcessoFirebase(credentials) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return typeof token === "string" ? token : token?.token;
}

async function obterTokenOidcVercel() {
  try {
    return await getVercelOidcToken();
  } catch (error) {
    console.warn("Não foi possível obter o token OIDC da Vercel:", error);
    return process.env.VERCEL_OIDC_TOKEN || null;
  }
}

async function tokenAcessoFirebaseVercel(oidcToken) {
  if (!oidcToken) return null;

  const audience =
    `//iam.googleapis.com/projects/${GOOGLE_CLOUD_PROJECT_NUMBER}` +
    `/locations/global/workloadIdentityPools/${GOOGLE_WORKLOAD_IDENTITY_POOL}` +
    `/providers/${GOOGLE_WORKLOAD_IDENTITY_PROVIDER}`;

  const respostaSts = await fetch("https://sts.googleapis.com/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      audience,
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      scope: "https://www.googleapis.com/auth/cloud-platform",
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      subject_token: oidcToken,
    }),
  });

  if (!respostaSts.ok) {
    throw new Error(
      `Falha ao trocar o token OIDC da Vercel (${respostaSts.status}): ` +
        (await respostaSts.text())
    );
  }

  const federacao = await respostaSts.json();
  if (!federacao.access_token) {
    throw new Error("O Google não retornou o token federado.");
  }

  const conta = encodeURIComponent(GOOGLE_SERVICE_ACCOUNT_EMAIL);
  const respostaIam = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${conta}:generateAccessToken`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${federacao.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scope: ["https://www.googleapis.com/auth/firebase.messaging"],
        lifetime: "3600s",
      }),
    }
  );

  if (!respostaIam.ok) {
    throw new Error(
      `Falha ao assumir a conta de serviço do Firebase (${respostaIam.status}): ` +
        (await respostaIam.text())
    );
  }

  const credencial = await respostaIam.json();
  return credencial.accessToken || null;
}

async function removerTokenInvalido(token) {
  await supabase.from("app_push_tokens").delete().eq("token", token);
}

async function enviarParaToken({
  token,
  titulo,
  mensagem,
  dados,
  projectId,
  accessToken,
}) {
  const resposta = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: textoPush(titulo, 80),
            body: textoPush(mensagem, 220),
          },
          data: Object.fromEntries(
            Object.entries(dados || {}).map(([chave, valor]) => [
              chave,
              String(valor ?? ""),
            ])
          ),
          android: {
            priority: "high",
            notification: {
              channel_id: "adjacare_principal",
              sound: "default",
            },
          },
        },
      }),
    }
  );

  if (resposta.ok) return true;

  const detalhe = await resposta.text();
  if (/UNREGISTERED|registration-token-not-registered|NOT_FOUND/i.test(detalhe)) {
    await removerTokenInvalido(token);
    return false;
  }

  throw new Error(
    `Firebase recusou a notificação (${resposta.status}): ${detalhe}`
  );
}

export async function enviarPush({
  titulo,
  mensagem,
  dados = {},
  roles,
  destino,
  preferencia,
}) {
  const credentials = credenciaisFirebase();
  const oidcToken = await obterTokenOidcVercel();
  const usaOidcVercel = Boolean(oidcToken);
  if (!usaOidcVercel && !credentials?.project_id) {
    console.warn(
      "Push não enviado: VERCEL_OIDC_TOKEN e FIREBASE_SERVICE_ACCOUNT não configurados."
    );
    return { enviados: 0, configurado: false };
  }

  let consulta = supabase
    .from("app_push_tokens")
    .select("token,role")
    .eq("ativo", true);

  if (preferencia) consulta = consulta.eq(preferencia, true);
  if (Array.isArray(roles) && roles.length) consulta = consulta.in("role", roles);
  if (destino && destino !== "Todos") consulta = consulta.eq("role", destino);

  const { data: dispositivos, error } = await consulta;
  if (error) throw error;

  const tokens = [
    ...new Set((dispositivos || []).map((item) => item.token).filter(Boolean)),
  ];
  if (!tokens.length) return { enviados: 0, configurado: true };

  const accessToken = usaOidcVercel
    ? await tokenAcessoFirebaseVercel(oidcToken)
    : await tokenAcessoFirebase(credentials);
  if (!accessToken) throw new Error("Não foi possível autenticar no Firebase.");
  const projectId = credentials?.project_id || FIREBASE_PROJECT_ID;

  const resultados = await Promise.allSettled(
    tokens.map((token) =>
      enviarParaToken({
        token,
        titulo,
        mensagem,
        dados,
        projectId,
        accessToken,
      })
    )
  );

  resultados
    .filter((resultado) => resultado.status === "rejected")
    .forEach((resultado) => console.error("Falha no push:", resultado.reason));

  return {
    enviados: resultados.filter(
      (resultado) => resultado.status === "fulfilled" && resultado.value
    ).length,
    configurado: true,
  };
}
