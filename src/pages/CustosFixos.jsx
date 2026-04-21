import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function CustosFixos() {
  const [custos, setCustos] = useState([])
  const [loading, setLoading] = useState(true)

  async function carregar() {
    setLoading(true)

    const { data, error } = await supabase
      .from("custos_fixos")
      .select("*")
      .order("data_proximo_pagamento", { ascending: true })

    if (!error) setCustos(data || [])
    else console.error(error)

    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function marcarComoPago(item) {
    const hoje = new Date().toISOString().split("T")[0]

    // cria histórico
    await supabase.from("historico_pagamentos_custos").insert({
      custo_id: item.id,
      valor_pago: item.valor,
      data_pagamento: hoje,
      referencia: hoje
    })

    // calcula próxima data
    let novaData = new Date(item.data_proximo_pagamento)

    if (item.frequencia === "mensal") {
      novaData.setMonth(novaData.getMonth() + 1)
    } else if (item.frequencia === "anual") {
      novaData.setFullYear(novaData.getFullYear() + 1)
    }

    await supabase
      .from("custos_fixos")
      .update({
        data_proximo_pagamento: novaData.toISOString().split("T")[0],
        status: "Pago"
      })
      .eq("id", item.id)

    carregar()
  }

  if (loading) return <p style={{ padding: 20 }}>Carregando...</p>

  return (
    <div style={{ padding: 20 }}>
      <h1>Custos Fixos</h1>

      {custos.map((c) => (
        <div key={c.id} style={{
          border: "1px solid #ddd",
          padding: 15,
          marginBottom: 10,
          borderRadius: 10
        }}>
          <h3>{c.nome}</h3>
          <p>R$ {c.valor}</p>
          <p>Vence: {c.data_proximo_pagamento}</p>
          <p>Status: {c.status}</p>

          <button onClick={() => marcarComoPago(c)}>
            Marcar como pago
          </button>
        </div>
      ))}
    </div>
  )
}
