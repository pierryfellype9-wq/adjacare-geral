import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {

  console.log("Webhook recebido")

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true })
  }

  let body = req.body

  // alguns webhooks chegam como string
  if (typeof body === "string") {
    try {
      body = JSON.parse(body)
    } catch (e) {
      console.log("Erro ao converter body")
      return res.status(200).json({ ok: true })
    }
  }

  console.log("Body:", body)

  // só continuar se for update de lead
  if (!body?.leads?.update) {
    return res.status(200).json({ ok: true })
  }

  const lead = body.leads.update[0]

  if (!lead) {
    return res.status(200).json({ ok: true })
  }

  const statusId = lead.status_id

  // status do pipeline que representa pedido finalizado
  const STATUS_PEDIDO_REALIZADO = 93433903

  // se não for esse status, ignora
  if (statusId !== STATUS_PEDIDO_REALIZADO) {
    return res.status(200).json({ ok: true })
  }

  console.log("Lead válido recebido:", lead.id)

  // evita duplicar pedidos
  const { data: existente } = await supabase
    .from("pedidos")
    .select("id")
    .eq("descricao", `Kommo Lead ${lead.id}`)
    .limit(1)

  if (existente && existente.length > 0) {
    console.log("Pedido já existe")
    return res.status(200).json({ ok: true })
  }

  const { error } = await supabase
    .from("pedidos")
    .insert([
      {
        titulo: "Pedido via WhatsApp",
        descricao: `Kommo Lead ${lead.id}`,
        prioridade: "Normal",
        destino: "Mídia",
        ministerio: "WhatsApp",
        criado_por: "WhatsApp",
        status: "Pendente",
        data: new Date().toISOString()
      }
    ])

  if (error) {
    console.log("Erro ao inserir pedido:", error)
  } else {
    console.log("Pedido criado com sucesso")
  }

  return res.status(200).json({ ok: true })
}
