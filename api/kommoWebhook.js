import { createClient } from "@supabase/supabase-js"

export const config = {
  api: {
    bodyParser: true
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {

  try {

    const body = req.body || {}

    console.log("Webhook recebido:", body)

    const leadId = body["leads[status][0][id]"]
    const statusId = String(body["leads[status][0][status_id]"] || "")

    const STATUS_PEDIDO_REALIZADO = "93433903"

    if (!leadId) {
      return res.status(200).json({ ok: true })
    }

    if (statusId !== STATUS_PEDIDO_REALIZADO) {
      console.log("Status ignorado:", statusId)
      return res.status(200).json({ ok: true })
    }

    // buscar dados do lead no Kommo
    const response = await fetch(
      `https://${process.env.KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads/${leadId}?with=contacts`,
      {
        headers: {
          Authorization: `Bearer ${process.env.KOMMO_TOKEN}`
        }
      }
    )

    const lead = await response.json()

    const campos = lead._embedded?.custom_fields_values || []

    function campo(nome){
      const c = campos.find(c => c.field_name === nome)
      return c ? c.values[0].value : null
    }

    const origem = campo("Origem Pedido")

    // só aceitar pedidos vindos do WhatsApp
    if (origem !== "WhatsApp") {
      console.log("Origem ignorada:", origem)
      return res.status(200).json({ ok: true })
    }

    const nome =
      lead._embedded?.contacts?.[0]?.name ||
      "Cliente WhatsApp"

    const ministerio = campo("Ministério")
    const descricao = campo("Descrição")
    const prazo = campo("Prazo")

    await supabase
      .from("pedidos")
      .insert([
        {
          titulo: `Pedido WhatsApp - ${nome}`,
          nome,
          ministerio,
          descricao,
          prazo,
          prioridade: "Normal",
          destino: "Mídia",
          status: "Pendente",
          criado_por: "WhatsApp",
          data: new Date().toISOString()
        }
      ])

    console.log("Pedido criado com sucesso")

    return res.status(200).json({ ok: true })

  } catch (err) {

    console.error("Erro webhook:", err)

    return res.status(200).json({ ok: true })

  }

}
