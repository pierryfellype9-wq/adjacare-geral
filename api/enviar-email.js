import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"
import { authorizeRequest, rejectUnauthorized } from "../server/authorize.js"

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" })
  }

  try {
    const authorization = await authorizeRequest(req, [
      "Administrador",
      "Dirigente",
      "Mídia",
      "Secretaria",
      "EBD",
    ])
    if (authorization.error) return rejectUnauthorized(res, authorization)

    const { assunto, mensagem, para, departamento } = req.body

    let listaEmails = []

    if (para) {
      listaEmails = Array.isArray(para) ? para : [para]
    } else if (departamento) {
      const { data: users, error } = await supabase
        .from("users")
        .select("email")
        .eq("role", departamento)
        .not("email", "is", null)

      if (error) throw error

      listaEmails = [...new Set(
        (users || [])
          .map((u) => u.email?.trim())
          .filter(Boolean)
      )]
    } else {
      return res.status(400).json({
        error: "Nenhum destinatário informado. Envie 'para' ou 'departamento'."
      })
    }

    if (!listaEmails.length) {
      return res.status(400).json({
        error: "Nenhum e-mail encontrado para envio."
      })
    }

    console.log("para recebido:", para)
    console.log("departamento recebido:", departamento)
    console.log("lista final:", listaEmails)

    const resposta = await resend.emails.send({
      from: "Sistema ADJACARÉ <midia@adjacare.org>",
      to: listaEmails,
      subject: assunto,
      html: mensagem
    })

    console.log("Resposta Resend:", resposta)

    return res.status(200).json({
      ok: true,
      listaEmails,
      resposta
    })
  } catch (err) {
    console.log("Erro ao enviar email:", err)
    return res.status(500).json({
      error: err.message || "Erro interno ao enviar e-mail"
    })
  }
}
