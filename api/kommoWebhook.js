import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true })
  }

  console.log("Webhook recebido:", req.body)

  let body = req.body

  // se vier como string (form-data da Kommo)
  if (typeof body === "string") {
    const params = new URLSearchParams(body)
    body = Object.fromEntries(params.entries())
  }

  const statusId = body["lead[STATUS]"]
  const leadId = body["ID"]

  console.log("Status recebido:", statusId)
  console.log("Lead recebido:", leadId)

  const STATUS_PEDIDO_REALIZADO = "93433903"

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
