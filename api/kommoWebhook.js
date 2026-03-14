import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {

  try {

    const body = req.body

    const leadId = body["leads[status][0][id]"]
    const statusId = body["leads[status][0][status_id]"]

    const STATUS_PEDIDO_REALIZADO = "93433903"

    if (!leadId || statusId !== STATUS_PEDIDO_REALIZADO) {
      return res.status(200).json({ ok: true })
    }

    // buscar dados do lead no Kommo
    const response = await fetch(
      `https://adjacare.kommo.com/api/v4/leads/${leadId}?with=contacts`,
      {
        headers: {
          Authorization: `Bearer ${process.env.KOMMO_TOKEN}`
        }
      }
    )

    const lead = await response.json()

   const campos = lead.custom_fields_values || []

function campo(nome){
  const c = campos.find(c => c.field_name === nome)
  return c ? c.values[0].value : null
}

const origem = campo("Origem Pedido")

// se não veio do WhatsApp, ignora
if (origem !== "WhatsApp") {
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

    return res.status(200).json({ ok: true })

  } catch (err) {

    console.error("Erro webhook:", err)

    return res.status(200).json({ ok: true })
  }

}
