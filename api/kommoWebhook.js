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

  if (!body["message[add][0][text]"]) {
    return res.status(200).json({ ok: true })
  }

  const mensagem = body["message[add][0][text]"]

  await supabase
    .from("pedidos")
    .insert([
      {
        titulo: "Pedido via WhatsApp",
        descricao: mensagem,
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
