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

  if (status === "Cancelado") {
    return {
      fundo: "#f3f4f6",
      texto: "#6b7280",
      borda: "#d1d5db",
    }
  }

  return {
    fundo: "#eef2ff",
    texto: "#4338ca",
    borda: "#c7d2fe",
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

  const quantidadeAtrasados = useMemo(() => {
    return custosTratados.filter((item) => item.statusVisual === "Atrasado").length
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
    <div className="senhas-page">
      <div className="senhas-card">
        <div className="senhas-topo">
          <div>
            <h1>Custos Fixos</h1>
            <p>Controle de assinaturas, pagamentos e vencimentos.</p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 18,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ color: "#64748b", fontSize: 14 }}>Total mensal</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8, color: "#0f172a" }}>
              {formatarMoeda(totalMensal)}
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ color: "#64748b", fontSize: 14 }}>Próximos vencimentos</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8, color: "#0f172a" }}>
              {proximosVencimentos}
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ color: "#64748b", fontSize: 14 }}>Atrasados</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8, color: "#0f172a" }}>
              {quantidadeAtrasados}
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ color: "#64748b", fontSize: 14 }}>Valor atrasado</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8, color: "#0f172a" }}>
              {formatarMoeda(totalAtrasado)}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 16, color: "#1e293b" }}>
            Cadastrar custo fixo
          </h2>

          <form
            onSubmit={cadastrarCusto}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              alignItems: "end",
            }}
          >
            <input
              className="input"
              name="nome"
              placeholder="Nome do serviço"
              value={form.nome}
              onChange={atualizarCampo}
              style={{ marginTop: 0, height: 44 }}
            />

            <input
              className="input"
              name="valor"
              type="number"
              step="0.01"
              placeholder="Valor"
              value={form.valor}
              onChange={atualizarCampo}
              style={{ marginTop: 0, height: 44 }}
            />

            <select
              className="input"
              name="frequencia"
              value={form.frequencia}
              onChange={atualizarCampo}
              style={{ marginTop: 0, height: 44 }}
            >
              <option value="mensal">Mensal</option>
              <option value="anual">Anual</option>
              <option value="unico">Único</option>
            </select>

            <input
              className="input"
              name="data_proximo_pagamento"
              type="date"
              value={form.data_proximo_pagamento}
              onChange={atualizarCampo}
              style={{ marginTop: 0, height: 44 }}
            />

            <button
              type="submit"
              className="btn"
              disabled={salvando}
              style={{
                height: 44,
                borderRadius: 12,
              }}
            >
              {salvando ? "Salvando..." : "Cadastrar"}
            </button>
          </form>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 20,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 16, color: "#1e293b" }}>
            Assinaturas e pagamentos
          </h2>

          {loading ? (
            <p style={{ margin: 0, color: "#64748b" }}>Carregando...</p>
          ) : custosTratados.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b" }}>Nenhum custo fixo cadastrado.</p>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {custosTratados.map((item) => {
                const estiloStatus = corStatus(item.statusVisual)

                return (
                  <div
                    key={item.id}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 16,
                      padding: 18,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div
                        style={{
                          fontSize: 19,
                          fontWeight: 700,
                          color: "#0f172a",
                          marginBottom: 8,
                        }}
                      >
                        {item.nome}
                      </div>

                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: "#111827",
                          marginBottom: 8,
                        }}
                      >
                        {formatarMoeda(item.valor)}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          color: "#475569",
                          fontSize: 14,
                        }}
                      >
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
                          padding: "6px 14px",
                          borderRadius: 999,
                          fontWeight: 700,
                          fontSize: 12,
                          letterSpacing: "0.3px",
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
                          padding: "8px 12px",
                          background: "#0f172a",
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: processandoId === item.id ? "not-allowed" : "pointer",
                          opacity: processandoId === item.id ? 0.7 : 1,
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
    </div>
  )
}
