import { notificar } from "../lib/feedback"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"
import "./EBDInternas.css"

export default function EBDRelatorios({ user }) {
  const navigate = useNavigate()
  const usuario = user || JSON.parse(localStorage.getItem("user") || "{}")

  const [dados, setDados] = useState([])
  const [turmas, setTurmas] = useState([])
  const [turmaFiltro, setTurmaFiltro] = useState("")
  const [trimestres, setTrimestres] = useState([])
  const [trimestreFiltro, setTrimestreFiltro] = useState("")

  const podeVerTudoEBD =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    usuario?.turma_ebd === "Superintendente"

  const turmasPermitidas = Array.isArray(usuario?.turmas_ebd)
    ? usuario.turmas_ebd
    : []

  const professorEBD = !podeVerTudoEBD && turmasPermitidas.length > 0

  const temAcessoEBD = podeVerTudoEBD || professorEBD

  useEffect(() => {
    if (temAcessoEBD) {
      carregarTurmas()
    }
  }, [])

  useEffect(() => {
    setTrimestres([])
    setTrimestreFiltro("")
    setDados([])

    if (temAcessoEBD && turmaFiltro) {
      carregarTrimestres()
    }
  }, [turmaFiltro])

  useEffect(() => {
    if (temAcessoEBD && turmaFiltro && trimestreFiltro) {
      carregarRelatorio()
    } else {
      setDados([])
    }
  }, [trimestreFiltro])

  async function carregarTurmas() {
    const { data, error } = await supabase
      .from("ebd_turmas")
      .select("*")
      .order("idade_min", { ascending: true })

    if (error) {
      console.error(error)
      notificar("Erro ao carregar turmas.")
      return
    }

    if (podeVerTudoEBD) {
      setTurmas(data || [])
      return
    }

    const minhasTurmas = (data || []).filter((turma) =>
      turmasPermitidas.includes(turma.id)
    )

    setTurmas(minhasTurmas)

    if (minhasTurmas.length === 1) {
      setTurmaFiltro(minhasTurmas[0].id)
    }
  }

  async function carregarTrimestres() {
    if (!podeVerTudoEBD && !turmasPermitidas.includes(turmaFiltro)) {
      notificar("Você não possui acesso a essa turma.")
      return
    }

    const { data, error } = await supabase
      .from("ebd_trimestres")
      .select("id,nome,ano,numero,status,data_inicio,data_fim,turma_id")
      .eq("turma_id", turmaFiltro)
      .order("ano", { ascending: false })
      .order("numero", { ascending: false })

    if (error) {
      console.error(error)
      notificar("Erro ao carregar os trimestres.")
      return
    }

    setTrimestres(data || [])
  }

  async function carregarRelatorio() {
    if (!turmaFiltro || !trimestreFiltro) {
      setDados([])
      return
    }

    if (!podeVerTudoEBD && !turmasPermitidas.includes(turmaFiltro)) {
      notificar("Você não possui acesso a essa turma.")
      setDados([])
      return
    }

    const trimestreSelecionado = trimestres.find(
      (item) => String(item.id) === String(trimestreFiltro)
    )

    if (
      !trimestreSelecionado ||
      String(trimestreSelecionado.turma_id) !== String(turmaFiltro)
    ) {
      notificar("Selecione um trimestre válido para esta turma.")
      setDados([])
      return
    }

    const [
      { data: alunos, error: erroAlunos },
      { data: aulas, error: erroAulas },
    ] = await Promise.all([
      supabase
        .from("ebd_alunos")
        .select("id,nome,turma_id,ebd_turmas(nome)")
        .eq("turma_id", turmaFiltro)
        .order("nome", { ascending: true }),
      supabase
        .from("ebd_aulas")
        .select("id")
        .eq("trimestre_id", trimestreFiltro),
    ])

    if (erroAlunos || erroAulas) {
      console.error(erroAlunos || erroAulas)
      notificar("Erro ao carregar relatório.")
      setDados([])
      return
    }

    const idsAulas = (aulas || []).map((aula) => aula.id)
    let presencas = []

    if (idsAulas.length > 0) {
      const { data, error } = await supabase
        .from("ebd_presencas")
        .select("aluno_id,status,aula_id")
        .in("aula_id", idsAulas)

      if (error) {
        console.error(error)
        notificar("Erro ao carregar as presenças do trimestre.")
        setDados([])
        return
      }

      presencas = data || []
    }

    const presencasPorAluno = presencas.reduce((mapa, presenca) => {
      if (!mapa[presenca.aluno_id]) mapa[presenca.aluno_id] = []
      mapa[presenca.aluno_id].push(presenca)
      return mapa
    }, {})

    const formatado = (alunos || []).map((aluno) => {
      const presencasAluno = presencasPorAluno[aluno.id] || []
      const presentes = presencasAluno.filter(
        (presenca) => presenca.status === "presente"
      ).length
      const atrasados = presencasAluno.filter(
        (presenca) => presenca.status === "atrasado"
      ).length
      const faltas = presencasAluno.filter(
        (presenca) => presenca.status === "falta"
      ).length
      const justificadas = presencasAluno.filter(
        (presenca) => presenca.status === "justificado"
      ).length
      const total = presencasAluno.length
      const frequencia =
        total > 0 ? Math.round(((presentes + atrasados) / total) * 100) : 0

      return {
        id: aluno.id,
        nome: aluno.nome,
        turma: aluno.ebd_turmas?.nome || "Sem turma",
        presentes,
        atrasados,
        faltas,
        justificadas,
        total,
        frequencia,
      }
    })

    setDados(formatado)
  }

  function nomeTurmaSelecionada() {
    if (turmaFiltro) {
      return turmas.find((t) => String(t.id) === String(turmaFiltro))?.nome
    }

    if (podeVerTudoEBD) return "Todas as turmas"

    if (turmas.length === 1) return turmas[0].nome

    return `${turmasPermitidas.length} turmas autorizadas`
  }

  const trimestreSelecionado = useMemo(
    () =>
      trimestres.find(
        (trimestre) => String(trimestre.id) === String(trimestreFiltro)
      ),
    [trimestres, trimestreFiltro]
  )

  function exportarPDF() {
    if (!trimestreSelecionado || !turmaFiltro) return

    const doc = new jsPDF()
    const hoje = new Date()
    const titulo = "Relatório Trimestral - EBD"
    const periodo = trimestreSelecionado.nome
    const nomeArquivo = `relatorio-ebd-${trimestreSelecionado.ano}-${trimestreSelecionado.numero}-trimestre.pdf`

    doc.setFontSize(16)
    doc.text(titulo, 14, 18)

    doc.setFontSize(10)
    doc.text(`Período: ${periodo}`, 14, 27)
    doc.text(`Turma: ${nomeTurmaSelecionada() || "Não informada"}`, 14, 34)
    doc.text(`Gerado por: ${usuario?.nome || "Não identificado"}`, 14, 41)
    doc.text(`Data de emissão: ${hoje.toLocaleDateString("pt-BR")}`, 14, 48)

    autoTable(doc, {
      startY: 56,
      head: [
        [
          "Aluno",
          "Turma",
          "Presentes",
          "Atrasos",
          "Faltas",
          "Justificadas",
          "Total",
          "Frequência",
        ],
      ],
      body: dados.map((item) => [
        item.nome,
        item.turma,
        item.presentes,
        item.atrasados,
        item.faltas,
        item.justificadas,
        item.total,
        `${item.frequencia}%`,
      ]),
      styles: {
        fontSize: 9,
      },
      headStyles: {
        fillColor: [31, 60, 116],
      },
    })

    doc.save(nomeArquivo)
  }

  if (!temAcessoEBD) {
    return (
      <div className="page ebd-subpage">
        <button className="btn-voltar" onClick={() => navigate("/ebd")}>
          ← Voltar
        </button>

        <div className="form-card">
          <h2>Acesso não permitido</h2>
          <p>Você não possui permissão para acessar os relatórios da EBD.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page ebd-subpage ebd-subpage--relatorios">
      <button className="btn-voltar" onClick={() => navigate("/ebd")}>
        ← Voltar
      </button>

      <h1>Relatórios da EBD</h1>

      <div className="form-card">
        <label>Filtrar por turma</label>

        <select
          value={turmaFiltro}
          onChange={(e) => setTurmaFiltro(e.target.value)}
          disabled={!podeVerTudoEBD && turmas.length <= 1}
        >
          <option value="">Selecione a turma</option>

          {turmas.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome}
            </option>
          ))}
        </select>

        <label>Trimestre</label>
        <select
          value={trimestreFiltro}
          onChange={(e) => setTrimestreFiltro(e.target.value)}
          disabled={!turmaFiltro}
        >
          <option value="">Selecione o trimestre</option>
          {trimestres.map((trimestre) => (
            <option key={trimestre.id} value={trimestre.id}>
              {trimestre.nome}
              {trimestre.status === "ativo" ? " (Ativo)" : " (Encerrado)"}
            </option>
          ))}
        </select>

        {!podeVerTudoEBD && (
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 8 }}>
            Você possui acesso a {turmasPermitidas.length} turma
            {turmasPermitidas.length > 1 ? "s" : ""}.
          </p>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn"
            onClick={exportarPDF}
            disabled={!trimestreFiltro || dados.length === 0}
          >
            Exportar relatório do trimestre
          </button>
        </div>
      </div>

      <div className="list-card">
        <h2>
          Frequência dos alunos
          {trimestreSelecionado &&
            ` — ${nomeTurmaSelecionada()} — ${trimestreSelecionado.nome}`}
        </h2>

        {!trimestreFiltro && <p>Selecione a turma e o trimestre para gerar o relatório.</p>}
        {trimestreFiltro && dados.length === 0 && <p>Nenhum dado encontrado neste trimestre.</p>}

        <div className="relatorio-grid">
          {dados.map((item) => (
            <div className="relatorio-card" key={item.id}>
              <div className="relatorio-card-top">
                <div>
                  <h3>{item.nome}</h3>
                  <span className="badge-turma">{item.turma}</span>
                </div>

                <div className="frequencia">{item.frequencia}%</div>
              </div>

              <p>Presentes: {item.presentes}</p>
              <p>Atrasos: {item.atrasados}</p>
              <p>Faltas: {item.faltas}</p>
              <p>Justificadas: {item.justificadas}</p>
              <p>Total de chamadas: {item.total}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
