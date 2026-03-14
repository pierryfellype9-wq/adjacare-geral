import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true })
  }

  const body = req.body

  console.log("Webhook recebido:", body)

  const leadId = body["leads[status][0][id]"]
  const statusId = body["leads[status][0][status_id]"]

  console.log("Lead:", leadId)
  console.log("Status:", statusId)

  const STATUS_PEDIDO_REALIZADO = "93433903"

  if (!leadId) {
    return res.status(200).json({ ok: true })
  }

  if (statusId !== STATUS_PEDIDO_REALIZADO) {
    return res.status(200).json({ ok: true })
  }

  const { error } = await supabase
    .from("pedidos")
    .insert([
      {
        titulo: "Pedido via WhatsApp",
        descricao: `Kommo Lead ${leadId}`,
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
  } else {
    console.log("Pedido criado com sucesso")
  }

  return res.status(200).json({ ok: true })
}
