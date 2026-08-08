import { notificar } from "../lib/feedback"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import "./EBDInternas.css"

export default function EBDDashboard({ user }) {
  const navigate = useNavigate()
  const usuario = user || JSON.parse(localStorage.getItem("user") || "{}")

  const hoje = new Date().toISOString().split("T")[0]

  const [totalAlunos, setTotalAlunos] = useState(0)
  const [presentesHoje, setPresentesHoje] = useState(0)
  const [faltasHoje, setFaltasHoje] = useState(0)
  const [mediaGeral, setMediaGeral] = useState(0)
  const [ranking, setRanking] = useState([])
  const [alertas, setAlertas] = useState([])
  const [carregando, setCarregando] = useState(true)

  const podeVerTudoEBD =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    usuario?.turma_ebd === "Superintendente"

  const turmasPermitidas = Array.isArray(usuario?.turmas_ebd)
    ? usuario.turmas_ebd
    : []

  const temAcessoEBD = podeVerTudoEBD || turmasPermitidas.length > 0

  useEffect(() => {
    if (temAcessoEBD) {
      carregarDashboard()
    } else {
      setCarregando(false)
    }
  }, [])

  async function carregarDashboard() {
    setCarregando(true)

    let query = supabase
      .from("ebd_alunos")
      .select(`
        id,
        nome,
        turma_id,
        ebd_turmas(nome),
        ebd_presencas(
          status,
          ebd_aulas(data)
        )
      `)

    if (!podeVerTudoEBD) {
      query = query.in("turma_id", turmasPermitidas)
    }

    const { data: alunosData, error } = await query

    if (error) {
      console.error(error)
      notificar("Erro ao carregar dashboard.")
      setCarregando(false)
      return
    }

    const alunos = alunosData || []
    setTotalAlunos(alunos.length)

    let presentes = 0
    let faltas = 0
    let totalPresencas = 0
    let totalChamadas = 0

    const rankingTemp = []
    const alertasTemp = []

    alunos.forEach((aluno) => {
      const presencas = aluno.ebd_presencas || []

      const presentesAluno = presencas.filter(
        (p) => p.status === "presente"
      ).length

      const faltasAluno = presencas.filter(
        (p) => p.status === "falta"
      ).length

      const totalAluno = presencas.length

      const frequencia =
        totalAluno > 0 ? Math.round((presentesAluno / totalAluno) * 100) : 0

      rankingTemp.push({
        id: aluno.id,
        nome: aluno.nome,
        turma: aluno.ebd_turmas?.nome || "Sem turma",
        frequencia,
        presentes: presentesAluno,
        faltas: faltasAluno,
        total: totalAluno,
      })

      if (faltasAluno >= 3) {
        alertasTemp.push({
          id: aluno.id,
          nome: aluno.nome,
          turma: aluno.ebd_turmas?.nome || "Sem turma",
          faltas: faltasAluno,
        })
      }

      presencas.forEach((p) => {
        if (p.ebd_aulas?.data === hoje) {
          if (p.status === "presente") presentes++
          if (p.status === "falta") faltas++
        }
      })

      totalPresencas += presentesAluno
      totalChamadas += totalAluno
    })

    setPresentesHoje(presentes)
    setFaltasHoje(faltas)

    setMediaGeral(
      totalChamadas > 0
        ? Math.round((totalPresencas / totalChamadas) * 100)
        : 0
    )

    setRanking(
      rankingTemp
        .filter((a) => a.total > 0)
        .sort((a, b) => b.frequencia - a.frequencia)
        .slice(0, 10)
    )

    setAlertas(alertasTemp.sort((a, b) => b.faltas - a.faltas).slice(0, 10))

    setCarregando(false)
  }

  if (!temAcessoEBD) {
    return (
      <div className="page ebd-subpage">
        <button className="btn-voltar" onClick={() => navigate("/ebd")}>
          ← Voltar
        </button>

        <div className="form-card">
          <h2>Acesso não permitido</h2>
          <p>Você não possui permissão para acessar o dashboard da EBD.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page ebd-subpage ebd-subpage--dashboard">
      <button className="btn-voltar" onClick={() => navigate("/ebd")}>
        ← Voltar
      </button>

      <div className="ebd-header">
        <div>
          <h1>Dashboard da EBD</h1>
          <p>Resumo geral de alunos, chamadas e frequência.</p>

          {!podeVerTudoEBD && (
            <p
              style={{
                marginTop: 4,
                color: "#6b7280",
                fontSize: 14,
              }}
            >
              Visualizando {turmasPermitidas.length} turma
              {turmasPermitidas.length > 1 ? "s" : ""}.
            </p>
          )}
        </div>
      </div>

      {carregando ? (
        <div className="form-card">
          <p>Carregando informações...</p>
        </div>
      ) : (
        <>
          <div className="ebd-dashboard-grid">
            <div className="ebd-metric-card">
              <span>👥</span>
              <p>Total de alunos</p>
              <strong>{totalAlunos}</strong>
            </div>

            <div className="ebd-metric-card">
              <span>📅</span>
              <p>Presentes hoje</p>
              <strong>{presentesHoje}</strong>
            </div>

            <div className="ebd-metric-card">
              <span>❌</span>
              <p>Faltas hoje</p>
              <strong>{faltasHoje}</strong>
            </div>

            <div className="ebd-metric-card">
              <span>📊</span>
              <p>Média geral</p>
              <strong>{mediaGeral}%</strong>
            </div>
          </div>

          <div className="ebd-dashboard-columns">
            <div className="list-card">
              <h2>Alunos com muitas faltas</h2>

              {alertas.length === 0 && <p>Nenhum alerta no momento.</p>}

              {alertas.map((aluno) => (
                <div className="ebd-alerta-item" key={aluno.id}>
                  <div>
                    <strong>{aluno.nome}</strong>
                    <p>{aluno.turma}</p>
                  </div>

                  <span>{aluno.faltas} faltas</span>
                </div>
              ))}
            </div>

            <div className="list-card">
              <h2>Ranking de frequência</h2>

              {ranking.length === 0 && <p>Nenhum dado de frequência ainda.</p>}

              {ranking.map((aluno, index) => (
                <div className="ebd-ranking-item" key={aluno.id}>
                  <div>
                    <strong>
                      {index + 1}. {aluno.nome}
                    </strong>
                    <p>{aluno.turma}</p>
                  </div>

                  <span>{aluno.frequencia}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
