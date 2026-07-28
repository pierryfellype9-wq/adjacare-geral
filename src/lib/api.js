import { supabase } from "./supabase"

export async function apiFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  if (!token) {
    throw new Error("Sua sessão expirou. Saia e entre novamente.")
  }

  return fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}
