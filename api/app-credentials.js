import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  try {
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
