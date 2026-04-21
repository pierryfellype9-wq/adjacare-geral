import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function formatarData(data) {
  if (!data) return "-"
  const dt = new Date(data + "T00:00:00")
  return dt.toLocaleDateString("pt-BR")
}

function calcularStatus(item) {
  if (!item?.data_proximo_pagamento) return "Sem data"
  if (item?.status === "Cancelado") return "Cancelado"

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const vencimento = new Date(item.data_proximo_pagamento + "T00:00:00")
  vencimento.setHours(0, 0, 0, 0)

  const diff = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24))

  if (diff < 0) return "Atrasado"
  if (diff <= 5) return "Próximo"
  return "Em dia"
}

function corStatus(status) {
  if (status === "Em dia") {
    return {
      fundo: "#e8f7ee",
      texto: "#1f8f4c",
      borda: "#b7e4c7",
    }
  }

  if (status === "Próximo") {
    return {
      fundo: "#fff6e5",
      texto: "#b26a00",
      borda: "#f2cf8a",
    }
  }

  if (status === "Atrasado") {
    return {
      fundo: "#fdecec",
      texto: "#c62828",
      borda: "#f3b3b3",
    }
  }

  return {
    fundo: "#f3f4f6",
    texto: "#6b7280",
    borda: "#d1d5db",
  }
}

function calcularProximaData(dataAtual, frequencia) {
  if (!dataAtual) return null

  const base = new Date(dataAtual + "T00:00:00")

  if (frequencia === "mensal") {
    base.setMonth(base.getMonth() + 1)
  } else if (frequencia === "anual") {
    base.setFullYear(base.getFullYear() + 1)
  } else {
    return null
  }

  const ano = base.getFullYear()
  const mes = String(base.getMonth() + 1).padStart(2, "0")
  const dia = String(base.getDate()).padStart(2, "0")

  return `${ano}-${mes}-${dia}`
}

export default function CustosFixos({ user }) {
  const [custos, setCustos] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [processandoId, setProcessandoId] = useState(null)

  const [form, setForm] = useState({
    nome: "",
    valor: "",
    frequencia: "mensal",
    data_proximo_pagamento: "",
    status: "Ativo",
  })

  async function carregarCustos() {
    setLoading(true)

    const { data, error } = await supabase
      .from("custos_fixos")
      .select("*")
      .order("data_proximo_pagamento", { ascending: true })

    if (error) {
      console.error("Erro ao carregar custos:", error)
      setCustos([])
    } else {
      setCustos(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    carregarCustos()
  }, [])

  const custosTratados = useMemo(() => {
    return (custos || []).map((item) => ({
      ...item,
      statusVisual: calcularStatus(item),
    }))
  }, [custos])

  const totalMensal = useMemo(() => {
    return custosTratados
      .filter((item) => item.status !== "Cancelado")
      .reduce((acc, item) => {
        const valor = Number(item.valor || 0)

        if (item.frequencia === "mensal") return acc + valor
        if (item.frequencia === "anual") return acc + valor / 12

        return acc
      }, 0)
  }, [custosTratados])

  const totalAtrasado = useMemo(() => {
    return custosTratados
      .filter((item) => item.statusVisual === "Atrasado")
      .reduce((acc, item) => acc + Number(item.valor || 0), 0)
  }, [custosTratados])

  const proximosVencimentos = useMemo(() => {
    return custosTratados.filter((item) => item.statusVisual === "Próximo").length
  }, [custosTratados])

  function atualizarCampo(e) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function cadastrarCusto(e) {
    e.preventDefault()

    if (!form.nome || !form.valor || !form.data_proximo_pagamento) {
      alert("Preencha nome, valor e data.")
      return
    }

    try {
      setSalvando(true)

      const { error } = await supabase.from("custos_fixos").insert({
        nome: form.nome,
        valor: Number(form.valor),
        frequencia: form.frequencia,
        data_proximo_pagamento: form.data_proximo_pagamento,
        status: form.status,
      })

      if (error) throw error

      setForm({
        nome: "",
        valor: "",
        frequencia: "mensal",
        data_proximo_pagamento: "",
        status: "Ativo",
      })

      await carregarCustos()
    } catch (error) {
      console.error("Erro ao cadastrar custo:", error)
      alert("Erro ao cadastrar custo fixo.")
    } finally {
      setSalvando(false)
    }
  }

  async function marcarComoPago(item) {
    try {
      setProcessandoId(item.id)

      const hoje = new Date()
      const dataPagamento = hoje.toISOString().slice(0, 10)

      const referenciaBase = item.data_proximo_pagamento
        ? new Date(item.data_proximo_pagamento + "T00:00:00")
        : hoje

      const referencia = referenciaBase.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })

      const { error: erroHistorico } = await supabase
        .from("historico_pagamentos_custos")
        .insert({
          custo_id: item.id,
          valor_pago: Number(item.valor || 0),
          data_pagamento: dataPagamento,
          referencia,
          pago_por: user?.nome || "Usuário",
        })

      if (erroHistorico) throw erroHistorico

      const proximaData = calcularProximaData(
        item.data_proximo_pagamento || dataPagamento,
        item.frequencia
      )

      const payload = {
        status: item.frequencia === "unico" ? "Pago" : "Ativo",
      }

      if (proximaData) {
        payload.data_proximo_pagamento = proximaData
      }

      if (item.frequencia === "unico") {
        payload.data_proximo_pagamento = null
      }

      const { error: erroUpdate } = await supabase
        .from("custos_fixos")
        .update(payload)
        .eq("id", item.id)

      if (erroUpdate) throw erroUpdate

      await carregarCustos()
    } catch (error) {
      console.error("Erro ao marcar como pago:", error)
      alert("Erro ao marcar como pago.")
    } finally {
      setProcessandoId(null)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Custos Fixos</h1>
          <p style={{ margin: "6px 0 0", color: "#666" }}>
            Controle de assinaturas, pagamentos e vencimentos.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 18,
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ color: "#666", fontSize: 14 }}>Total mensal</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
            {formatarMoeda(totalMensal)}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 18,
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ color: "#666", fontSize: 14 }}>Próximos vencimentos</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
            {proximosVencimentos}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 18,
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ color: "#666", fontSize: 14 }}>Atrasados</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
            {custosTratados.filter((item) => item.statusVisual === "Atrasado").length}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 18,
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ color: "#666", fontSize: 14 }}>Valor atrasado</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
            {formatarMoeda(totalAtrasado)}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 18,
          marginBottom: 22,
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 20 }}>
          Cadastrar custo fixo
        </h2>

        <form
          onSubmit={cadastrarCusto}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <input
            name="nome"
            placeholder="Nome do serviço"
            value={form.nome}
            onChange={atualizarCampo}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              outline: "none",
            }}
          />

          <input
            name="valor"
            type="number"
            step="0.01"
            placeholder="Valor"
            value={form.valor}
            onChange={atualizarCampo}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              outline: "none",
            }}
          />

          <select
            name="frequencia"
            value={form.frequencia}
            onChange={atualizarCampo}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              outline: "none",
            }}
          >
            <option value="mensal">Mensal</option>
            <option value="anual">Anual</option>
            <option value="unico">Único</option>
          </select>

          <input
            name="data_proximo_pagamento"
            type="date"
            value={form.data_proximo_pagamento}
            onChange={atualizarCampo}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              outline: "none",
            }}
          />

          <button
            type="submit"
            disabled={salvando}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "12px 16px",
              background: "#111827",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {salvando ? "Salvando..." : "Cadastrar"}
          </button>
        </form>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 18,
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 20 }}>
          Assinaturas e pagamentos
        </h2>

        {loading ? (
          <p style={{ margin: 0 }}>Carregando...</p>
        ) : custosTratados.length === 0 ? (
          <p style={{ margin: 0 }}>Nenhum custo fixo cadastrado.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {custosTratados.map((item) => {
              const estiloStatus = corStatus(item.statusVisual)

              return (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      {item.nome}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        color: "#555",
                        fontSize: 14,
                      }}
                    >
                      <span><strong>Valor:</strong> {formatarMoeda(item.valor)}</span>
                      <span><strong>Frequência:</strong> {item.frequencia}</span>
                      <span><strong>Vence:</strong> {formatarData(item.data_proximo_pagamento)}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        background: estiloStatus.fundo,
                        color: estiloStatus.texto,
                        border: `1px solid ${estiloStatus.borda}`,
                        padding: "8px 12px",
                        borderRadius: 999,
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {item.statusVisual}
                    </span>

                    <button
                      onClick={() => marcarComoPago(item)}
                      disabled={processandoId === item.id}
                      style={{
                        border: "none",
                        borderRadius: 10,
                        padding: "10px 14px",
                        background: "#111827",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {processandoId === item.id ? "Salvando..." : "Marcar como pago"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
