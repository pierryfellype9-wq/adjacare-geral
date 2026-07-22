import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"
import { supabase } from "../lib/supabase"

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function dataPtBr(data) {
  if (!data) return "-"
  return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR")
}

export default function EBDRelatorioOfertas({ user }) {
  const navigate = useNavigate()
  const usuario = user || JSON.parse(localStorage.getItem("user") || "{}")

  const podeVerTudoEBD =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    usuario?.turma_ebd === "Superintendente" ||
    (usuario?.role === "EBD" && usuario?.turma_ebd === "Superintendente")

  const turmasPermitidas = Array.isArray(usuario?.turmas_ebd)
    ? usuario.turmas_ebd
    : []

  const temAcesso = podeVerTudoEBD || turmasPermitidas.length > 0

  const [turmas, setTurmas] = useState([])
  const [turmaId, setTurmaId] = useState("")
  const [trimestres, setTrimestres] = useState([])
  const [trimestreId, setTrimestreId] = useState("")
  const [aulas, setAulas] = useState([])
  const [carregando, setCarregando] = useState(false)

  const trimestreAtual = useMemo(
    () => trimestres.find((item) => String(item.id) === String(trimestreId)),
    [trimestres, trimestreId]
  )

  const turmaAtual = useMemo(
    () => turmas.find((item) => String(item.id) === String(turmaId)),
    [turmas, turmaId]
  )

  const total = useMemo(
    () => aulas.reduce((soma, aula) => soma + Number(aula.oferta_valor || 0), 0),
    [aulas]
  )

  const aulasComOferta = useMemo(
    () => aulas.filter((aula) => aula.oferta_valor !== null && aula.oferta_valor !== undefined).length,
    [aulas]
  )

  const media = aulasComOferta > 0 ? total / aulasComOferta : 0

  useEffect(() => {
    if (temAcesso) carregarTurmas()
  }, [])

  useEffect(() => {
    setTrimestres([])
    setTrimestreId("")
    setAulas([])
    if (turmaId) carregarTrimestres()
  }, [turmaId])

  useEffect(() => {
    if (trimestreId) carregarOfertas()
    else setAulas([])
  }, [trimestreId])

  async function carregarTurmas() {
    const { data, error } = await supabase
      .from("ebd_turmas")
      .select("id,nome,idade_min")
      .order("idade_min", { ascending: true })

    if (error) {
      console.error(error)
      alert("Erro ao carregar as turmas.")
      return
    }

    const permitidas = podeVerTudoEBD
      ? data || []
      : (data || []).filter((turma) => turmasPermitidas.includes(turma.id))

    setTurmas(permitidas)
    if (permitidas.length === 1) setTurmaId(permitidas[0].id)
  }

  async function carregarTrimestres() {
    const { data, error } = await supabase
      .from("ebd_trimestres")
      .select("id,nome,ano,numero,status,data_inicio,data_fim")
      .eq("turma_id", turmaId)
      .order("ano", { ascending: false })
      .order("numero", { ascending: false })

    if (error) {
      console.error(error)
      alert("Erro ao carregar os trimestres.")
      return
    }

    setTrimestres(data || [])
    const ativo = (data || []).find((item) => item.status === "ativo")
    if (ativo) setTrimestreId(ativo.id)
  }

  async function carregarOfertas() {
    setCarregando(true)

    const { data, error } = await supabase
      .from("ebd_aulas")
      .select(
        "id,data,numero_licao,tema,oferta_valor,oferta_registrada_por,oferta_registrada_em"
      )
      .eq("trimestre_id", trimestreId)
      .order("numero_licao", { ascending: true })

    setCarregando(false)

    if (error) {
      console.error(error)
      alert("Erro ao carregar o relatório de ofertas.")
      return
    }

    setAulas(data || [])
  }

  function exportarPdf() {
    if (!trimestreAtual || !turmaAtual) return

    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text("Relatório Trimestral de Ofertas - EBD", 14, 18)

    doc.setFontSize(10)
    doc.text(`Turma: ${turmaAtual.nome}`, 14, 28)
    doc.text(`Trimestre: ${trimestreAtual.nome}`, 14, 35)
    doc.text(`Total arrecadado: ${moeda(total)}`, 14, 42)
    doc.text(`Média por aula com oferta: ${moeda(media)}`, 14, 49)
    doc.text(`Gerado por: ${usuario?.nome || usuario?.email || "Não identificado"}`, 14, 56)

    autoTable(doc, {
      startY: 64,
      head: [["Lição", "Data", "Tema", "Oferta", "Registrado por"]],
      body: aulas.map((aula) => [
        String(aula.numero_licao).padStart(2, "0"),
        dataPtBr(aula.data),
        aula.tema || "Sem tema",
        aula.oferta_valor === null || aula.oferta_valor === undefined
          ? "Não informado"
          : moeda(aula.oferta_valor),
        aula.oferta_registrada_por || "-",
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [31, 60, 116] },
    })

    doc.save(`ofertas-ebd-${trimestreAtual.ano}-${trimestreAtual.numero}.pdf`)
  }

  if (!temAcesso) {
    return (
      <div className="page">
        <button className="btn-voltar" onClick={() => navigate("/ebd")}>
          ← Voltar
        </button>
        <div className="form-card">
          <h2>Acesso não permitido</h2>
          <p>Você não possui permissão para consultar as ofertas da EBD.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <button className="btn-voltar" onClick={() => navigate("/ebd")}>
        ← Voltar
      </button>

      <h1>Relatório de Ofertas da EBD</h1>

      <div className="form-card">
        <label>Turma</label>
        <select
          value={turmaId}
          onChange={(event) => setTurmaId(event.target.value)}
          disabled={!podeVerTudoEBD && turmas.length <= 1}
        >
          <option value="">Selecione</option>
          {turmas.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome}
            </option>
          ))}
        </select>

        <label>Trimestre</label>
        <select
          value={trimestreId}
          onChange={(event) => setTrimestreId(event.target.value)}
          disabled={!turmaId}
        >
          <option value="">Selecione</option>
          {trimestres.map((trimestre) => (
            <option key={trimestre.id} value={trimestre.id}>
              {trimestre.nome} {trimestre.status === "ativo" ? "(Ativo)" : ""}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={exportarPdf}
          disabled={!trimestreId || aulas.length === 0}
          style={{ marginTop: 14 }}
        >
          Exportar relatório em PDF
        </button>
      </div>

      {trimestreId && (
        <>
          <div className="relatorio-grid" style={{ marginBottom: 20 }}>
            <div className="relatorio-card">
              <h3>Total do trimestre</h3>
              <div className="frequencia" style={{ fontSize: 24 }}>
                {moeda(total)}
              </div>
            </div>
            <div className="relatorio-card">
              <h3>Aulas com oferta</h3>
              <div className="frequencia" style={{ fontSize: 24 }}>
                {aulasComOferta} de {aulas.length}
              </div>
            </div>
            <div className="relatorio-card">
              <h3>Média por aula</h3>
              <div className="frequencia" style={{ fontSize: 24 }}>
                {moeda(media)}
              </div>
            </div>
          </div>

          <div className="list-card">
            <h2>
              {turmaAtual?.nome || "Turma"} — {trimestreAtual?.nome || "Trimestre"}
            </h2>

            {carregando && <p>Carregando ofertas...</p>}
            {!carregando && aulas.length === 0 && <p>Nenhuma aula encontrada.</p>}

            <div className="relatorio-grid">
              {aulas.map((aula) => (
                <div className="relatorio-card" key={aula.id}>
                  <div className="relatorio-card-top">
                    <div>
                      <h3>Lição {String(aula.numero_licao).padStart(2, "0")}</h3>
                      <span className="badge-turma">{dataPtBr(aula.data)}</span>
                    </div>
                    <div className="frequencia" style={{ fontSize: 18 }}>
                      {aula.oferta_valor === null || aula.oferta_valor === undefined
                        ? "—"
                        : moeda(aula.oferta_valor)}
                    </div>
                  </div>
                  <p>{aula.tema || "Sem tema cadastrado"}</p>
                  <p>Registrado por: {aula.oferta_registrada_por || "Não informado"}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
