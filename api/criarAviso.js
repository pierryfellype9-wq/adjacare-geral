import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  try {
    const {
      titulo,
      mensagem,
      destino,
      fixado,
      urgente,
      expira_em
    } = req.body

    await supabase
      .from("avisos")
      .insert({
        titulo,
        mensagem,
        destino,
        fixado: !!fixado,
        urgente: !!urgente,
        expira_em: expira_em || null
      })

    const { data: usuarios } = await supabase
      .from("users")
      .select("email,role")

    const emails = (usuarios || [])
      .filter(u => destino === "Todos" || u.role === destino)
      .map(u => u.email)
      .filter(Boolean)

    const mensagemFormatada = (mensagem || "").replace(/\n/g, "<br>")

    if (emails.length > 0) {
      await resend.emails.send({
        from: "Sistema ADJACARÉ <midia@adjacare.org>",
        to: emails,
        subject: `Novo aviso: ${titulo}`,
        html: `
          <h2>${titulo}</h2>

          <p>${mensagemFormatada}</p>

          <p><b>Destino:</b> ${destino}</p>
          ${fixado ? `<p><b>Fixado:</b> Sim</p>` : ""}
          ${urgente ? `<p><b>Urgente:</b> Sim</p>` : ""}
          ${expira_em ? `<p><b>Expira em:</b> ${expira_em}</p>` : ""}

          <p>Sistema ADJACARÉ</p>
        `
      })
    }

    return res.status(200).json({ ok: true })

  } catch (e) {
    console.log(e)
    return res.status(500).json({ erro: e.message })
  }
}
