import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://adjacare.org",
  "https://www.adjacare.org",
  "https://sistema.adjacare.org",
  "https://tetelestai.adjacare.org",
  "http://localhost:5173",
  "http://localhost:4173",
]);

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

function isAllowedOrigin(origin: string | null) {
  return Boolean(origin && (allowedOrigins.has(origin) || origin.endsWith(".adjacare.org")));
}

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin! : "https://sistema.adjacare.org",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(
  body: unknown,
  status: number,
  origin: string | null,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      ...extraHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function clientKey(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 0, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  return { allowed: true, retryAfter: 0 };
}

function registerFailure(key: string) {
  const now = Date.now();
  const current = attempts.get(key);

  attempts.set(key, {
    count: current && current.resetAt > now ? current.count + 1 : 1,
    resetAt: current && current.resetAt > now ? current.resetAt : now + WINDOW_MS,
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) return new Response(null, { status: 403 });
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ ok: false, message: "Método não permitido." }, 405, origin);
  }

  if (!isAllowedOrigin(origin)) {
    return json({ ok: false, message: "Origem não autorizada." }, 403, origin);
  }

  const rateKey = clientKey(req);
  const rate = checkRateLimit(rateKey);

  if (!rate.allowed) {
    return json(
      { ok: false, message: "Muitas tentativas. Tente novamente mais tarde." },
      429,
      origin,
      { "Retry-After": String(rate.retryAfter) },
    );
  }

  try {
    const payload = await req.json().catch(() => null);
    const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
    const password = typeof payload?.password === "string" ? payload.password : "";

    if (!email || !email.includes("@") || password.length < 4 || password.length > 128) {
      registerFailure(rateKey);
      return json({ ok: false, message: "Credenciais inválidas." }, 401, origin);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
    const secretKeys = secretKeysRaw ? JSON.parse(secretKeysRaw) : {};
    const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !secretKey) {
      console.error("Configuração administrativa do Supabase ausente.");
      return json({ ok: false, message: "Serviço temporariamente indisponível." }, 503, origin);
    }

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: legacyUser, error: legacyError } = await admin
      .from("users")
      .select("*")
      .ilike("email", email)
      .maybeSingle();

    if (legacyError) {
      console.error("Erro consultando usuário legado:", legacyError.message);
      return json({ ok: false, message: "Serviço temporariamente indisponível." }, 503, origin);
    }

    if (!legacyUser || legacyUser.senha !== password) {
      registerFailure(rateKey);
      return json({ ok: false, message: "E-mail ou senha inválidos." }, 401, origin);
    }

    const role = legacyUser.role ?? legacyUser.perfil ?? "Usuário";
    const nome = legacyUser.nome ?? legacyUser.nome_completo ?? email.split("@")[0];
    const appMetadata = {
      role,
      legacy_user_id: String(legacyUser.id),
    };

    let authUserId = legacyUser.auth_user_id as string | null;

    if (authUserId) {
      const { error: updateAuthError } = await admin.auth.admin.updateUserById(authUserId, {
        password,
        email_confirm: true,
        app_metadata: appMetadata,
        user_metadata: { nome },
      });

      if (updateAuthError) {
        console.error("Erro sincronizando usuário Auth:", updateAuthError.message);
        return json(
          { ok: false, message: "Não foi possível concluir a migração do acesso." },
          409,
          origin,
        );
      }
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: appMetadata,
        user_metadata: { nome },
      });

      if (createError || !created.user) {
        console.error("Erro criando usuário Auth:", createError?.message ?? "usuário não retornado");
        return json(
          { ok: false, message: "Não foi possível concluir a migração do acesso." },
          409,
          origin,
        );
      }

      authUserId = created.user.id;

      const { error: linkError } = await admin
        .from("users")
        .update({
          auth_user_id: authUserId,
          migrated_to_auth_at: new Date().toISOString(),
        })
        .eq("id", legacyUser.id);

      if (linkError) {
        console.error("Erro vinculando usuário legado ao Auth:", linkError.message);
        await admin.auth.admin.deleteUser(authUserId).catch(() => undefined);
        return json(
          { ok: false, message: "Não foi possível concluir a migração do acesso." },
          503,
          origin,
        );
      }
    }

    attempts.delete(rateKey);
    return json({ ok: true, migrated: true }, 200, origin);
  } catch (error) {
    console.error("Falha inesperada na migração de login:", error);
    return json({ ok: false, message: "Serviço temporariamente indisponível." }, 500, origin);
  }
});
