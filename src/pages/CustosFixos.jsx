import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"
import "./CustosFixos.css"

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function formatarData(data) {
  if (!data) return "-"
  const [ano, mes, dia] = data.split("-").map(Number)
  const dt = new Date(ano, mes - 1, dia)
  return dt.toLocaleDateString("pt-BR")
}

function calcularStatus(item) {
  if (!item?.data_proximo_pagamento) return "Sem data"
  if (item?.status === "Cancelado") return "Cancelado"

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const [ano, mes, dia] = item.data_proximo_pagamento.split("-").map(Number)
  const vencimento = new Date(ano, mes - 1, dia)
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

  const [ano, mes, dia] = dataAtual.split("-").map(Number)
  const base = new Date(ano, mes - 1, dia)

  if (frequencia === "mensal") {
    base.setMonth(base.getMonth() + 1)
  } else if (frequencia === "anual") {
    base.setFullYear(base.getFullYear() + 1)
  } else {
    return null
  }

  const novoAno = base.getFullYear()
  const novoMes = String(base.getMonth() + 1).padStart(2, "0")
  const novoDia = String(base.getDate()).padStart(2, "0")

  return `${novoAno}-${novoMes}-${novoDia}`
}

export default function CustosFixos({ user }) {
  const [custos, setCustos] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [processandoId, setProcessandoId] = useState(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState("Todos")

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

  const custosFiltrados = useMemo(() => {
    if (filtroStatus === "Todos") return custosTratados
    return custosTratados.filter((item) => item.statusVisual === filtroStatus)
  }, [custosTratados, filtroStatus])

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

      setFormularioAberto(false)
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

      setCustos((prev) =>
        prev.map((custo) =>
          custo.id === item.id
            ? {
                ...custo,
                ...payload,
              }
            : custo
        )
      )
    } catch (error) {
      console.error("Erro ao marcar como pago:", error)
      alert("Erro ao marcar como pago.")
    } finally {
      setProcessandoId(null)
    }
  }

  return (
    <main className="custos-page">
      <section className="custos-hero">
        <div>
          <span className="custos-kicker">CONTROLE FINANCEIRO • MÍDIA</span>
          <h1>Custos e assinaturas</h1>
          <p>Acompanhe vencimentos, serviços recorrentes e pagamentos da equipe em um só lugar.</p>
          <button type="button" onClick={() => setFormularioAberto(true)}><b>＋</b> Cadastrar novo custo</button>
        </div>
        <div className="custos-hero__valor"><small>CUSTO MÉDIO MENSAL</small><strong>{formatarMoeda(totalMensal)}</strong><span>estimativa atual</span></div>
        <i className="custos-circulo um" /><i className="custos-circulo dois" />
      </section>

      <section className="custos-resumo">
        <article><span className="azul">R$</span><div><small>Total mensal</small><strong>{formatarMoeda(totalMensal)}</strong></div></article>
        <article><span className="amarelo">◷</span><div><small>Vencem em breve</small><strong>{proximosVencimentos}</strong></div></article>
        <article className={quantidadeAtrasados ? "alerta" : ""}><span className="vermelho">!</span><div><small>Pagamentos atrasados</small><strong>{quantidadeAtrasados}</strong></div></article>
        <article><span className="escuro">↘</span><div><small>Valor atrasado</small><strong>{formatarMoeda(totalAtrasado)}</strong></div></article>
      </section>

      {formularioAberto && (
        <section className="custos-formulario">
          <header><div><span className="custos-kicker">NOVA DESPESA</span><h2>Cadastrar custo fixo</h2><p>Informe os dados para acompanhar os próximos pagamentos.</p></div><button type="button" onClick={() => setFormularioAberto(false)}>×</button></header>
          <form onSubmit={cadastrarCusto}>
            <label className="largo"><span>Nome do serviço</span><input name="nome" placeholder="Ex.: Licença do software" value={form.nome} onChange={atualizarCampo} required /></label>
            <label><span>Valor</span><div className="custos-valor-input"><b>R$</b><input name="valor" type="number" step="0.01" placeholder="0,00" value={form.valor} onChange={atualizarCampo} required /></div></label>
            <label><span>Frequência</span><select name="frequencia" value={form.frequencia} onChange={atualizarCampo}><option value="mensal">Mensal</option><option value="anual">Anual</option><option value="unico">Pagamento único</option></select></label>
            <label><span>Próximo vencimento</span><input name="data_proximo_pagamento" type="date" value={form.data_proximo_pagamento} onChange={atualizarCampo} required /></label>
            <footer className="largo"><button type="button" className="secundario" onClick={() => setFormularioAberto(false)}>Cancelar</button><button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Cadastrar custo"} <span>→</span></button></footer>
          </form>
        </section>
      )}

      <section className="custos-listagem">
        <header>
          <div><span className="custos-kicker">AGENDA DE PAGAMENTOS</span><h2>Assinaturas e pagamentos</h2><p>Os custos mais próximos do vencimento aparecem primeiro.</p></div>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}><option>Todos</option><option>Em dia</option><option>Próximo</option><option>Atrasado</option><option>Sem data</option><option>Cancelado</option></select>
        </header>

        {loading ? (
          <div className="custos-estado"><span>◷</span><p>Carregando pagamentos...</p></div>
        ) : custosFiltrados.length === 0 ? (
          <div className="custos-estado"><span>✓</span><h3>Nenhum custo encontrado</h3><p>Não há pagamentos nesta categoria.</p></div>
        ) : (
          <div className="custos-grid">
            {custosFiltrados.map((item) => {
              const estiloStatus = corStatus(item.statusVisual)
              const inicial = (item.nome || "C").charAt(0).toUpperCase()
              return (
                <article className={`custo-card status-${item.statusVisual.toLowerCase().replace(" ", "-")}`} key={item.id}>
                  <header><div className="custo-card__icone">{inicial}</div><div><h3>{item.nome}</h3><span>{item.frequencia === "unico" ? "Pagamento único" : `Cobrança ${item.frequencia}`}</span></div><b style={{color:estiloStatus.texto,background:estiloStatus.fundo,borderColor:estiloStatus.borda}}>{item.statusVisual}</b></header>
                  <div className="custo-card__valor"><small>VALOR DA COBRANÇA</small><strong>{formatarMoeda(item.valor)}</strong></div>
                  <div className="custo-card__vencimento"><span>◷</span><div><small>PRÓXIMO VENCIMENTO</small><strong>{formatarData(item.data_proximo_pagamento)}</strong></div></div>
                  <footer><span>{item.statusVisual === "Atrasado" ? "Pagamento precisa de atenção" : "Pagamento acompanhado"}</span><button type="button" onClick={() => marcarComoPago(item)} disabled={processandoId === item.id || item.status === "Cancelado"}>{processandoId === item.id ? "Salvando..." : "✓ Marcar como pago"}</button></footer>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
