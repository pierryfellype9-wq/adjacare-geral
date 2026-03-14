import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {

  try {

    const body = req.body

    console.log("Webhook recebido:", JSON.stringify(body))

    if (!body?.leads) {
      return res.status(200).json({ ok: true, message: "Sem leads" })
    }

    const leads = body.leads.add || body.leads.update

    if (!leads || leads.length === 0) {
      return res.status(200).json({ ok: true, message: "Nenhum lead" })
    }

    const lead = leads[0]

    const titulo = "Pedido via WhatsApp"

    const descricao = lead.name || "Pedido enviado pelo WhatsApp"

    const { error } = await supabase
      .from("pedidos")
      .insert([
        {
          titulo: titulo,
          descricao: descricao,
          prioridade: "Normal",
          destino: "Mídia",
          ministerio: "WhatsApp",
          criado_por: "WhatsApp",
          status: "Pendente",
          data: new Date().toISOString()
        }
      ])

    if (error) {
      console.log("Erro ao salvar:", error)
    }

    res.status(200).json({ ok: true })

  } catch (err) {

    console.log("Erro webhook:", err)

    res.status(200).json({ ok: false })

  }

}
