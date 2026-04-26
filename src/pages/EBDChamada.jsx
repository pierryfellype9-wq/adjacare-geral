import { useEffect, useState } from "react"
import { supabase } from "../supabase"

export default function EBDChamada({ user }) {
  const usuario = user || JSON.parse(localStorage.getItem("user") || "{}")

  const [turmas, setTurmas] = useState([])
  const [turmaSelecionada, setTurmaSelecionada] = useState("")
  const [alunos, setAlunos] = useState([])
  const [presencas, setPresencas] = useState({})
  const [observacoes, setObservacoes] = useState({})
  const [dataChamada, setDataChamada] = useState(new Date().toISOString().split("T")[0])
  const [carregando, setCarregando] = useState(false)

  const podeEscolherTurma =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente"

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaSelecionada) {
      carregarAlunos()
    }
  }, [turmaSelecionada])

  async function carregarTurmas() {
    const { data } = await supabase
      .from("ebd_turmas")
      .select("*")
      .order("idade_min", { ascending: true })

    setTurmas(data || [])

    if (!podeEscolherTurma && usuario?.turma_ebd) {
      const turmaDoUsuario = data?.find((t) => t.nome === usuario.turma_ebd)
      if (turmaDoUsuario) setTurmaSelecionada(turmaDoUsuario.id)
    }
  }

  async function carregarAlunos() {
    const { data } = await supabase
      .from("ebd_alunos")
      .select("*")
      .eq("turma_id", turmaSelecionada)
      .order("nome", { ascending: true })

    setAlunos(data || [])

    const presencasIniciais = {}
    data?.forEach((aluno) => {
      presencasIniciais[aluno.id] = "presente"
    })

    setPresencas(presencasIniciais)
  }

  function alterarPresenca(alunoId, status) {
    setPresencas((prev) => ({
      ...prev,
      [alunoId]: status
    }))
  }

  function alterarObservacao(alunoId, texto) {
    setObservacoes((prev) => ({
      ...prev,
      [alunoId]: texto
    }))
  }

  async function salvarChamada() {
    if (!turmaSelecionada) {
      alert("Selecione uma turma.")
      return
    }

    if (alunos.length === 0) {
      alert("Nenhum aluno encontrado nessa turma.")
      return
    }

    setCarregando(true)

    let aulaId = null

    const { data: aulaExistente } = await supabase
      .from("ebd_aulas")
      .select("*")
      .eq("turma_id", turmaSelecionada)
      .eq("data", dataChamada)
      .maybeSingle()

    if (aulaExistente) {
      aulaId = aulaExistente.id
    } else {
      const { data: novaAula, error: erroAula } = await supabase
        .from("ebd_aulas")
        .insert({
          turma_id: turmaSelecionada,
          data: dataChamada
        })
        .select()
        .single()

      if (erroAula) {
        console.error(erroAula)
        alert("Erro ao criar aula.")
        setCarregando(false)
        return
      }

      aulaId = novaAula.id
    }

    await supabase
      .from("ebd_presencas")
      .delete()
      .eq("aula_id", aulaId)

    const registros = alunos.map((aluno) => ({
      aula_id: aulaId,
      aluno_id: aluno.id,
      status: presencas[aluno.id] || "presente",
      observacao: observacoes[aluno.id] || null
    }))

    const { error } = await supabase
      .from("ebd_presencas")
      .insert(registros)

    setCarregando(false)

    if (error) {
      console.error(error)
      alert("Erro ao salvar chamada.")
      return
    }

    alert("Chamada salva com sucesso!")
  }

  return (
    <div className="page">
      <h1>Chamada da EBD</h1>

      <div className="form-card">
        <label>Data da chamada</label>
        <input
          type="date"
          value={dataChamada}
          onChange={(e) => setDataChamada(e.target.value)}
        />

        <label>Turma</label>
        <select
          value={turmaSelecionada}
          onChange={(e) => setTurmaSelecionada(e.target.value)}
          disabled={!podeEscolherTurma}
        >
          <option value="">Selecione</option>
          {turmas.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="list-card">
        <h2>Lista de alunos</h2>

        {alunos.length === 0 && <p>Nenhum aluno para chamada.</p>}

        {alunos.map((aluno) => (
          <div className="chamada-item" key={aluno.id}>
            <strong>{aluno.nome}</strong>

            <div className="status-buttons">
              <button
                className={presencas[aluno.id] === "presente" ? "ativo" : ""}
                onClick={() => alterarPresenca(aluno.id, "presente")}
              >
                Presente
              </button>

              <button
                className={presencas[aluno.id] === "falta" ? "ativo falta" : ""}
                onClick={() => alterarPresenca(aluno.id, "falta")}
              >
                Falta
              </button>

              <button
                className={presencas[aluno.id] === "justificado" ? "ativo justificado" : ""}
                onClick={() => alterarPresenca(aluno.id, "justificado")}
              >
                Justificado
              </button>
            </div>

            <input
              placeholder="Observação"
              value={observacoes[aluno.id] || ""}
              onChange={(e) => alterarObservacao(aluno.id, e.target.value)}
            />
          </div>
        ))}

        {alunos.length > 0 && (
          <button onClick={salvarChamada} disabled={carregando}>
            {carregando ? "Salvando..." : "Salvar chamada"}
          </button>
        )}
      </div>
    </div>
  )
}
