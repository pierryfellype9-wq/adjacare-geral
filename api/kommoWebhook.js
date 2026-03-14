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

  const mensagem = body["message[add][0][text]"]
  const leadId = body["message[add][0][entity_id]"]

  console.log("Mensagem:", mensagem)
  console.log("Lead:", leadId)

  if (!leadId) {
    return res.status(200).json({ ok: true })
  }

  // evitar duplicação
  const { data: existe } = await supabase
    .from("pedidos")
    .select("id")
    .eq("descricao", `Kommo Lead ${leadId}`)
    .limit(1)

  if (existe && existe.length > 0) {
    console.log("Pedido já existe")
    return res.status(200).json({ ok: true })
  }

  const { error } = await supabase
    .from("pedidos")
    .insert([
      {
        titulo: "Pedido via WhatsApp",
        descricao: mensagem || `Kommo Lead ${leadId}`,
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
