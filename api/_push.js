import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function removerTokenInvalido(token) {
  await supabase.from("app_push_tokens").delete().eq("token", token);
}

async function enviarParaToken({ token, titulo, mensagem, dados, credentials, accessToken }) {
  const projectId = credentials.project_id;
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

  throw new Error(`Firebase recusou a notificação (${resposta.status}): ${detalhe}`);
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
  if (!credentials?.project_id) {
    console.warn("Push não enviado: FIREBASE_SERVICE_ACCOUNT não configurado.");
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

  const tokens = [...new Set((dispositivos || []).map((item) => item.token).filter(Boolean))];
  if (!tokens.length) return { enviados: 0, configurado: true };

  const accessToken = await tokenAcessoFirebase(credentials);
  if (!accessToken) throw new Error("Não foi possível autenticar no Firebase.");

  const resultados = await Promise.allSettled(
    tokens.map((token) =>
      enviarParaToken({
        token,
        titulo,
        mensagem,
        dados,
        credentials,
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
