export const SUPABASE_URL = "https://sibajiipwduomikejftf.supabase.co";
export const SUPABASE_KEY = "sb_publishable_2Hpl1N4rqWl6Wu-DjzajMg_Y5uKp4gJ";

export async function supabaseRest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error((await response.text()) || "Não foi possível concluir a operação.");
  return response.status === 204 ? null : response.json();
}
