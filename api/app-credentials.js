import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function autorizar(req, podeAlterar = false) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "")
  if (!token) return { status: 401, error: "Sessão não informada." }

  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) return { status: 401, error: "Sessão inválida." }

  const { data: perfil, error: perfilError } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle()

  if (perfilError) return { status: 403, error: "Perfil não encontrado." }

  const permitidos = podeAlterar ? ["Administrador"] : ["Administrador", "Mídia"]
  if (!permitidos.includes(perfil?.role)) {
    return { status: 403, error: "Você não tem permissão para esta ação." }
  }

  return { perfil }
}

export default async function handler(req, res) {
  try {
    const acesso = await autorizar(req, req.method !== "GET")
    if (acesso.error) return res.status(acesso.status).json({ error: acesso.error })

    if (req.method === "GET") {
      const { categoria } = req.query

      let query = supabase
        .from("app_credentials")
        .select("*")
        .order("nome_app", { ascending: true })

      if (categoria && categoria !== "Todas") {
        query = query.eq("categoria", categoria)
      }

      const { data, error } = await query

      if (error) throw error

      return res.status(200).json(data || [])
    }

    if (req.method === "POST") {
      const {
        nome_app,
        categoria,
        login,
        senha,
        link,
        observacoes,
        usuario,
      } = req.body

      if (!nome_app || !senha) {
        return res.status(400).json({
          error: "Nome do app e senha são obrigatórios.",
        })
      }

      const { data, error } = await supabase
        .from("app_credentials")
        .insert([
          {
            nome_app,
            categoria,
            login,
            senha,
            link,
            observacoes,
            created_by: usuario || "Sistema",
            updated_by: usuario || "Sistema",
          },
        ])
        .select()

      if (error) throw error

      return res.status(201).json(data?.[0])
    }

    if (req.method === "PUT") {
      const {
        id,
        nome_app,
        categoria,
        login,
        senha,
        link,
        observacoes,
        usuario,
      } = req.body

      if (!id) {
        return res.status(400).json({ error: "ID não informado." })
      }

      if (!nome_app || !senha) {
        return res.status(400).json({
          error: "Nome do app e senha são obrigatórios.",
        })
      }

      const { data, error } = await supabase
        .from("app_credentials")
        .update({
          nome_app,
          categoria,
          login,
          senha,
          link,
          observacoes,
          updated_by: usuario || "Sistema",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()

      if (error) throw error

      return res.status(200).json(data?.[0])
    }

    if (req.method === "DELETE") {
      const { id } = req.body

      if (!id) {
        return res.status(400).json({ error: "ID não informado." })
      }

      const { error } = await supabase
        .from("app_credentials")
        .delete()
        .eq("id", id)

      if (error) throw error

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: "Método não permitido." })
  } catch (error) {
    console.error("Erro app-credentials:", error)
    return res.status(500).json({
      error: error.message || "Erro interno do servidor.",
    })
  }
}
