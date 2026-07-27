import { createClient } from "@supabase/supabase-js"
import { google } from "googleapis"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function normalizarPerfil(valor = "") {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" })
  }

  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "")
    if (!token) {
      return res.status(401).json({ erro: "Sessão não informada" })
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return res.status(401).json({ erro: "Sessão inválida" })
    }

    const { data: perfil, error: perfilError } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle()

    const perfisPermitidos = ["administrador", "dirigente", "secretaria", "secretario"]
    if (perfilError || !perfisPermitidos.includes(normalizarPerfil(perfil?.role))) {
      return res
        .status(403)
        .json({ erro: "Você não tem permissão para editar a agenda" })
    }

    const {
      titulo,
      descricao,
      ministerio,
      solicitante,
      inicio,
      fim,
      publico,
    } = req.body

    if (!titulo || !inicio || !fim) {
      return res.status(400).json({ erro: "Dados incompletos" })
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_KEY),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    })

    const client = await auth.getClient()
    const calendar = google.calendar({ version: "v3", auth: client })

    const descricaoFinal = `${descricao || ""}

Ministério: ${ministerio || "-"}
Solicitado por: ${solicitante || "-"}
Visibilidade: ${publico ? "Público" : "Interno"}`

    await calendar.events.insert({
      calendarId: "midia@adjacare.org",
      requestBody: {
        summary: titulo,
        description: descricaoFinal,
        start: {
          dateTime: `${inicio}:00`,
          timeZone: "America/Sao_Paulo",
        },
        end: {
          dateTime: `${fim}:00`,
          timeZone: "America/Sao_Paulo",
        },
      },
    })

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error("Erro criar evento:", error)
    return res.status(500).json({
      erro: "Erro ao criar evento",
      detalhe: error.message,
    })
  }
}
