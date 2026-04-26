import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"

export default function EBDRelatorios({ user }) {
  const usuario = user || JSON.parse(localStorage.getItem("user") || "{}")

  const [dados, setDados] = useState([])
  const [turmas, setTurmas] = useState([])
  const [turmaFiltro, setTurmaFiltro] = useState("")

  const podeVerTudoEBD =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    (usuario?.role === "EBD" && usuario?.turma_ebd === "Superintendente")

  const professorEBD =
    usuario?.role === "EBD" &&
    usuario?.turma_ebd !== "Superintendente"

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    carregarRelatorio()
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

  return (
    <div className="page">
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
      </div>

      <div className="list-card">
        <h2>
          Frequência dos alunos
          {professorEBD && ` — ${usuario.turma_ebd}`}
        </h2>

        {dados.length === 0 && <p>Nenhum dado encontrado.</p>}

        {dados.map((item) => (
          <div className="list-item" key={item.id}>
            <div>
              <strong>{item.nome}</strong>
              <p>{item.turma}</p>
              <p>
                Presentes: {item.presentes} | Faltas: {item.faltas} | Justificadas: {item.justificadas}
              </p>
            </div>

            <div className="frequencia">
              {item.frequencia}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
