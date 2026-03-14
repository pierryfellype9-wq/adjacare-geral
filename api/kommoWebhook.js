import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {

  console.log("Webhook recebido:", req.body)

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true })
  }

  const body = req.body

  // Só continuar se for evento de LEAD
  if (!body?.leads?.update) {
    return res.status(200).json({ ok: true })
  }

  const lead = body.leads.update[0]

  // status do pipeline
  const statusId = lead.status_id

  // ID do status "Pedido realizado"
  const STATUS_PEDIDO_REALIZADO = 12345678

  if (statusId !== STATUS_PEDIDO_REALIZADO) {
    return res.status(200).json({ ok: true })
  }

  await supabase
    .from("pedidos")
    .insert([
      {
        titulo: "Pedido via WhatsApp",
        descricao: lead.name || "Pedido vindo da Kommo",
        prioridade: "Normal",
        destino: "Mídia",
        ministerio: "WhatsApp",
        criado_por: "WhatsApp",
        status: "Pendente",
        data: new Date().toISOString()
      }
    ])

  res.status(200).json({ ok: true })

}
