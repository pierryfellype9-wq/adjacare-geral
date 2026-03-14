import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {

  try {

    const body = req.body

    const leadId = body["leads[status][0][id]"]

    if (!leadId) {
      return res.status(200).json({ ok: true })
    }

    // BUSCAR LEAD NO KOMMO
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

    function pegarCampo(nome) {
      const campo = campos.find(c => c.field_name === nome)
      return campo ? campo.values[0].value : null
    }

    const nome = lead._embedded.contacts?.[0]?.name || "Sem nome"

    const ministerio = pegarCampo("Ministério")
    const descricao = pegarCampo("Descrição")
    const prazo = pegarCampo("Prazo")

    await supabase
      .from("pedidos")
      .insert({
        nome,
        ministerio,
        descricao,
        prazo,
        status: "Pendente"
      })

    return res.status(200).json({ ok: true })

  } catch (err) {

    console.error(err)

    return res.status(500).json({ error: "Erro no webhook" })

  }
}
