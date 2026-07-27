import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { enviarPush } from "../server/pushNotifications.js"
import { registrarPush } from "../server/pushRegister.js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.query?.acao === "push-register") {
    return registrarPush(req, res)
  }

  try {
    const {
      titulo,
      mensagem,
      destino,
      fixado,
      urgente,
      expira_em
    } = req.body

    const { data: aviso, error: erroAviso } = await supabase
      .from("avisos")
      .insert({
        titulo,
        mensagem,
        destino,
        fixado: !!fixado,
        urgente: !!urgente,
        expira_em: expira_em || null
      })
      .select("id,titulo,mensagem,destino,fixado,urgente")
      .single()

    if (erroAviso) throw erroAviso

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

    await enviarPush({
      titulo: urgente ? `🚨 Aviso urgente: ${titulo}` : `📢 Novo aviso: ${titulo}`,
      mensagem,
      destino,
      preferencia: "notificar_avisos",
      dados: {
        tipo: "aviso",
        aviso_id: aviso.id,
        path: "/avisos",
      },
    }).catch((error) => console.error("Aviso salvo, mas o push falhou:", error))

    return res.status(200).json({ ok: true })

  } catch (e) {
    console.log(e)
    return res.status(500).json({ erro: e.message })
  }
}
