import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true })
  }

  // --- 1) normalizar body (Kommo pode enviar form-data) ---
  let body = req.body

  // se vier como string (application/x-www-form-urlencoded)
  if (typeof body === "string") {
    const params = new URLSearchParams(body)
    body = Object.fromEntries(params.entries())
  }

  // se vier como objeto mas com valores tipo "a[b][c]"
  // logar tudo para descobrir as chaves reais
  console.log("BODY:", body)
  console.log("KEYS:", Object.keys(body))

  // --- 2) tentar extrair status e lead id de vários formatos ---
  let statusId =
    body["lead[STATUS]"] ||
    body["leads[update][0][status_id]"] ||
    body?.leads?.update?.[0]?.status_id

  let leadId =
    body["lead[ID]"] ||
    body["leads[update][0][id]"] ||
    body?.leads?.update?.[0]?.id

  console.log("Status recebido:", statusId)
  console.log("Lead recebido:", leadId)

  const STATUS_PEDIDO_REALIZADO = "93433903"

  if (!statusId || statusId != STATUS_PEDIDO_REALIZADO) {
    return res.status(200).json({ ok: true })
  }

  // evitar duplicado
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
    console.log("Erro ao inserir:", error)
  } else {
    console.log("Pedido criado com sucesso")
  }

  return res.status(200).json({ ok: true })
}
