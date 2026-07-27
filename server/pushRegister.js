import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function bearerToken(req) {
  const authorization = String(req.headers.authorization || "");
  return authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
}

async function usuarioAutenticado(req) {
  const accessToken = bearerToken(req);
  if (!accessToken) return null;

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id,role")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  return profile ? { ...profile, auth_user_id: data.user.id } : null;
}

export async function registrarPush(req, res) {
  if (!["POST", "DELETE"].includes(req.method)) {
    return res.status(405).json({ erro: "Método não permitido." });
  }

  try {
    const usuario = await usuarioAutenticado(req);
    if (!usuario) return res.status(401).json({ erro: "Sessão inválida." });

    const token = String(req.body?.token || "").trim();
    if (token.length < 20 || token.length > 4096) {
      return res.status(400).json({ erro: "Token do aparelho inválido." });
    }

    if (req.method === "DELETE") {
      const { error } = await supabase
        .from("app_push_tokens")
        .delete()
        .eq("token", token)
        .eq("auth_user_id", usuario.auth_user_id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    const platform = ["android", "ios", "web"].includes(req.body?.platform)
      ? req.body.platform
      : "android";

    const { error } = await supabase.from("app_push_tokens").upsert(
      {
        token,
        auth_user_id: usuario.auth_user_id,
        role: usuario.role,
        platform,
        ativo: true,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "token" }
    );
    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Erro ao registrar push:", error);
    return res
      .status(500)
      .json({ erro: "Não foi possível registrar este aparelho." });
  }
}
