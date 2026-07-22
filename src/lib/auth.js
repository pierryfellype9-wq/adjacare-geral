import { supabase } from "./supabase"

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000

export function sanitizeUser(user) {
  if (!user || typeof user !== "object") return null

  const { senha: _senha, ...safeUser } = user
  return safeUser
}

function saveLocalUser(user) {
  const safeUser = sanitizeUser(user)
  localStorage.setItem("loginTime", String(Date.now()))
  localStorage.setItem("user", JSON.stringify(safeUser))
  return safeUser
}

async function loadProfile(authUser) {
  if (!authUser) return null

  let query = supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", authUser.id)
    .maybeSingle()

  let { data, error } = await query

  if ((!data || error) && authUser.email) {
    const fallback = await supabase
      .from("users")
      .select("*")
      .ilike("email", authUser.email)
      .maybeSingle()

    data = fallback.data
    error = fallback.error
  }

  if (error || !data) return null
  return sanitizeUser(data)
}

export async function signInRolling(email, password) {
  const normalizedEmail = email.trim().toLowerCase()

  let authResult = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (authResult.error) {
    const migration = await supabase.functions.invoke("migrar-login-legado", {
      body: { email: normalizedEmail, password },
    })

    if (migration.error || !migration.data?.ok) {
      throw new Error("E-mail ou senha inválidos.")
    }

    authResult = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })
  }

  if (authResult.error || !authResult.data.user) {
    throw new Error("Não foi possível iniciar sua sessão.")
  }

  const profile = await loadProfile(authResult.data.user)
  if (!profile) {
    await supabase.auth.signOut()
    throw new Error("Seu cadastro não foi encontrado no sistema.")
  }

  return saveLocalUser(profile)
}

export async function restoreRollingSession() {
  const loginTime = Number(localStorage.getItem("loginTime") || 0)
  const isExpired = !loginTime || Date.now() - loginTime > SESSION_DURATION_MS

  if (isExpired) {
    await signOutRolling()
    return null
  }

  const { data } = await supabase.auth.getUser()
  if (data.user) {
    const profile = await loadProfile(data.user)
    if (profile) return saveLocalUser(profile)
  }

  // Mantém sessões antigas abertas durante a migração para não interromper o site.
  const stored = localStorage.getItem("user")
  if (!stored) return null

  try {
    const profile = sanitizeUser(JSON.parse(stored))
    if (profile) localStorage.setItem("user", JSON.stringify(profile))
    return profile
  } catch {
    await signOutRolling()
    return null
  }
}

export async function signOutRolling() {
  await supabase.auth.signOut().catch(() => undefined)
  localStorage.removeItem("loginTime")
  localStorage.removeItem("user")
}

export function isLocalSessionExpired() {
  const loginTime = Number(localStorage.getItem("loginTime") || 0)
  return Boolean(loginTime && Date.now() - loginTime > SESSION_DURATION_MS)
}
