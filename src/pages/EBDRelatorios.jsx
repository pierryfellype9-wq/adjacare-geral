import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export default function EBDRelatorios({ user }) {
  const navigate = useNavigate()
  const usuario = user || JSON.parse(localStorage.getItem("user") || "{}")

  const temAcessoEBD =
    usuario?.turma_ebd &&
    usuario?.turma_ebd !== "Não permitido"

  const [dados, setDados] = useState([])
  const [turmas, setTurmas] = useState([])
  const [turmaFiltro, setTurmaFiltro] = useState("")

  const podeVerTudoEBD =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    (usuario?.role === "EBD" && usuario?.turma_ebd === "Superintendente")

  const professorEBD =
    usuario?.turma_ebd &&
    usuario?.turma_ebd !== "Superintendente" &&
    usuario?.turma_ebd !== "Não permitido"

  useEffect(() => {
    if (temAcessoEBD) {
      carregarTurmas()
    }
  }, [])

  useEffect(() => {
    if (temAcessoEBD) {
      carregarRelatorio()
    }
  }, [turmaFiltro, turmas])

  async function carregarTurmas() {
    const { data } = await supabase
      .from("ebd_turmas")
      .select("*")
      .order("idade_min", { ascending: true })

    setTurmas(data || [])

    if (professorEBD && usuario?.turma_ebd) {
      const turmaDoUsuario = data?.find((t) => t.nome === usuario.turma_ebd)
      if (turmaDoUsuario) setTurmaFiltro(turmaDoUsuario.id)
    }
  }

  async function carregarRelatorio() {
    let query = supabase
      .from("ebd_alunos")
      .select(`
        id,
        nome,
        turma_id,
        ebd_turmas(nome),
        ebd_presencas(status)
      `)
      .order("nome", { ascending: true })

    if (professorEBD) {
      const turmaDoProfessor = turmas.find((t) => t.nome === usuario.turma_ebd)
      if (turmaDoProfessor) {
        query = query.eq("turma_id", turmaDoProfessor.id)
      }
    } else if (turmaFiltro) {
      query = query.eq("turma_id", turmaFiltro)
    }

    const { data, error } = await query

    if (error) {
      console.error(error)
      return
    }

    const formatado = data.map((aluno) => {
      const presencas = aluno.ebd_presencas || []

      const presentes = presencas.filter((p) => p.status === "presente").length
      const faltas = presencas.filter((p) => p.status === "falta").length
      const justificadas = presencas.filter((p) => p.status === "justificado").length
      const total = presencas.length
      const frequencia = total > 0 ? Math.round((presentes / total) * 100) : 0

      return {
        id: aluno.id,
        nome: aluno.nome,
        turma: aluno.ebd_turmas?.nome || "Sem turma",
        presentes,
        faltas,
        justificadas,
        total,
        frequencia,
      }
    })

    setDados(formatado)
  }

  function exportarPDF(tipo) {
    const doc = new jsPDF()
    const hoje = new Date()

    let titulo = ""
    let periodo = ""
    let nomeArquivo = ""

    if (tipo === "mensal") {
      titulo = "Relatório Mensal - EBD"
      periodo = hoje.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
      nomeArquivo = "relatorio-mensal-ebd.pdf"
    }

    if (tipo === "trimestral") {
      const trimestre = Math.floor(hoje.getMonth() / 3) + 1
      titulo = "Relatório Trimestral - EBD"
      periodo = `${trimestre}º trimestre de ${hoje.getFullYear()}`
      nomeArquivo = "relatorio-trimestral-ebd.pdf"
    }

    const turmaSelecionada = turmaFiltro
      ? turmas.find((t) => String(t.id) === String(turmaFiltro))?.nome
      : professorEBD
      ? usuario.turma_ebd
      : "Todas as turmas"

    doc.setFontSize(16)
    doc.text(titulo, 14, 18)

    doc.setFontSize(10)
    doc.text(`Período: ${periodo}`, 14, 27)
    doc.text(`Turma: ${turmaSelecionada || "Todas as turmas"}`, 14, 34)
    doc.text(`Gerado por: ${usuario?.nome || "Não identificado"}`, 14, 41)
    doc.text(`Data de emissão: ${hoje.toLocaleDateString("pt-BR")}`, 14, 48)

    autoTable(doc, {
      startY: 56,
      head: [[
        "Aluno",
        "Turma",
        "Presentes",
        "Faltas",
        "Justificadas",
        "Total",
        "Frequência"
      ]],
      body: dados.map((item) => [
        item.nome,
        item.turma,
        item.presentes,
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
      <div className="page">
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
    <div className="page">
      <button className="btn-voltar" onClick={() => navigate("/ebd")}>
        ← Voltar
      </button>

      <h1>Relatórios da EBD</h1>

      <div className="form-card">
        <label>Filtrar por turma</label>

        <select
          value={turmaFiltro}
          onChange={(e) => setTurmaFiltro(e.target.value)}
          disabled={!podeVerTudoEBD}
        >
          <option value="">
            {podeVerTudoEBD ? "Todas as turmas" : usuario?.turma_ebd}
          </option>

          {turmas.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome}
            </option>
          ))}
        </select>

        <div className="form-actions">
          <button
            type="button"
            className="btn"
            onClick={() => exportarPDF("mensal")}
            disabled={dados.length === 0}
          >
            Relatório mensal
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => exportarPDF("trimestral")}
            disabled={dados.length === 0}
          >
            Relatório trimestral
          </button>
        </div>
      </div>

      <div className="list-card">
        <h2>
          Frequência dos alunos
          {professorEBD && ` — ${usuario.turma_ebd}`}
        </h2>

        {dados.length === 0 && <p>Nenhum dado encontrado.</p>}

        <div className="relatorio-grid">
          {dados.map((item) => (
            <div className="relatorio-card" key={item.id}>
              <div className="relatorio-card-top">
                <div>
                  <h3>{item.nome}</h3>
                  <span className="badge-turma">{item.turma}</span>
                </div>

                <div className="frequencia">
                  {item.frequencia}%
                </div>
              </div>

              <p>Presentes: {item.presentes}</p>
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
