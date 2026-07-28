import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function authorizeRequest(req, allowedRoles = null) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "")
  if (!token) return { error: "Sessão não informada.", status: 401 }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !authData.user) {
    return { error: "Sessão inválida.", status: 401 }
  }

  let { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id,nome,email,role,turma_ebd,turmas_ebd,auth_user_id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle()

  if ((!profile || profileError) && authData.user.email) {
    const fallback = await supabaseAdmin
      .from("users")
      .select("id,nome,email,role,turma_ebd,turmas_ebd,auth_user_id")
      .ilike("email", authData.user.email)
      .maybeSingle()
    profile = fallback.data
    profileError = fallback.error
  }

  if (profileError || !profile) {
    return { error: "Perfil do usuário não encontrado.", status: 403 }
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return { error: "Você não tem permissão para esta ação.", status: 403 }
  }

  return { authUser: authData.user, profile, supabaseAdmin }
}

export function rejectUnauthorized(res, authorization) {
  return res.status(authorization.status || 403).json({
    error: authorization.error,
    erro: authorization.error,
  })
}
