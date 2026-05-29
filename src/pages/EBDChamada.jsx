import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"

export default function EBDChamada({ user }) {
  const navigate = useNavigate()
  const usuario = user || JSON.parse(localStorage.getItem("user") || "{}")

  const temAcessoEBD =
    usuario?.turma_ebd &&
    usuario?.turma_ebd !== "Não permitido"

  const [turmas, setTurmas] = useState([])
  const [turmaSelecionada, setTurmaSelecionada] = useState("")
  const [alunos, setAlunos] = useState([])
  const [presencas, setPresencas] = useState({})
  const [observacoes, setObservacoes] = useState({})
  const [dataChamada, setDataChamada] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [carregando, setCarregando] = useState(false)
  const [chamadaExistente, setChamadaExistente] = useState(false)

  const podeVerTudoEBD =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    (usuario?.role === "EBD" && usuario?.turma_ebd === "Superintendente")

  const professorEBD =
    usuario?.turma_ebd &&
    usuario?.turma_ebd !== "Superintendente" &&
    usuario?.turma_ebd !== "Não permitido"

  const podeEscolherTurma = podeVerTudoEBD

  useEffect(() => {
    if (temAcessoEBD) carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaSelecionada && temAcessoEBD) carregarAlunos()
  }, [turmaSelecionada, dataChamada])

  async function carregarTurmas() {
    const { data } = await supabase
      .from("ebd_turmas")
      .select("*")
      .order("idade_min", { ascending: true })

    setTurmas(data || [])

    if (professorEBD && usuario?.turma_ebd) {
      const turmaDoUsuario = data?.find((t) => t.nome === usuario.turma_ebd)
      if (turmaDoUsuario) setTurmaSelecionada(turmaDoUsuario.id)
    }
  }

  async function carregarAlunos() {
    const { data: alunosData } = await supabase
      .from("ebd_alunos")
      .select("*")
      .eq("turma_id", turmaSelecionada)
      .eq("ativo", true)
      .order("nome", { ascending: true })

    setAlunos(alunosData || [])

    const { data: aulaExistente } = await supabase
      .from("ebd_aulas")
      .select("*")
      .eq("turma_id", turmaSelecionada)
      .eq("data", dataChamada)
      .maybeSingle()

    const presencasIniciais = {}
    const observacoesIniciais = {}

    alunosData?.forEach((aluno) => {
      presencasIniciais[aluno.id] = "falta"
      observacoesIniciais[aluno.id] = ""
    })

    if (aulaExistente) {
      setChamadaExistente(true)

      const { data: presencasExistentes } = await supabase
        .from("ebd_presencas")
        .select("*")
        .eq("aula_id", aulaExistente.id)

      presencasExistentes?.forEach((p) => {
        presencasIniciais[p.aluno_id] = p.status
        observacoesIniciais[p.aluno_id] = p.observacao || ""
      })
    } else {
      setChamadaExistente(false)
    }

    setPresencas(presencasIniciais)
    setObservacoes(observacoesIniciais)
  }

  function alterarPresenca(alunoId, status) {
    if (!temAcessoEBD) return

    setPresencas((prev) => ({
      ...prev,
      [alunoId]: status,
    }))
  }

  async function salvarChamada() {
    if (!temAcessoEBD) {
      alert("Você não possui permissão para alterar esta área.")
      return
    }

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
          data: dataChamada,
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

    const registros = alunos.map((aluno) => ({
      aula_id: aulaId,
      aluno_id: aluno.id,
      status: presencas[aluno.id] || "falta",
      observacao:
        presencas[aluno.id] === "atrasado"
          ? "Aluno chegou atrasado"
          : observacoes[aluno.id] || null,
    }))

    const { error } = await supabase
      .from("ebd_presencas")
      .upsert(registros, {
        onConflict: "aula_id,aluno_id",
      })

    setCarregando(false)

    if (error) {
      console.error(error)
      alert("Erro ao salvar chamada. Verifique se o status 'atrasado' está permitido no Supabase.")
      return
    }

    setChamadaExistente(true)
    alert("Chamada salva com sucesso!")
  }

  const totalPresentes = Object.values(presencas).filter(
    (status) => status === "presente"
  ).length

  const totalAtrasados = Object.values(presencas).filter(
    (status) => status === "atrasado"
  ).length

  const totalFaltas = Object.values(presencas).filter(
    (status) => status === "falta" || status === "atrasado"
  ).length

  if (!temAcessoEBD) {
    return (
      <div className="page">
        <button className="btn-voltar" onClick={() => navigate("/ebd")}>
          ← Voltar
        </button>

        <div className="form-card">
          <h2>Acesso não permitido</h2>
          <p>Você não possui permissão para acessar a chamada da EBD.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <button className="btn-voltar" onClick={() => navigate("/ebd")}>
        ← Voltar
      </button>

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

        {turmaSelecionada && (
          <div className="info-box">
            {chamadaExistente
              ? "Esta chamada já existe. As alterações serão atualizadas sem duplicar."
              : "Nova chamada para esta data."}
          </div>
        )}
      </div>

      <div className="list-card chamada-card">
        <div className="chamada-topo">
          <button
            type="button"
            className="marcar-todos presente"
            onClick={() => {
              const novo = {}
              alunos.forEach((aluno) => {
                novo[aluno.id] = "presente"
              })
              setPresencas(novo)
            }}
          >
            Marcar todos presentes
          </button>

          <button
            type="button"
            className="marcar-todos falta"
            onClick={() => {
              const novo = {}
              alunos.forEach((aluno) => {
                novo[aluno.id] = "falta"
              })
              setPresencas(novo)
            }}
          >
            Marcar todos faltas
          </button>
        </div>

        {alunos.length === 0 && <p>Nenhum aluno para chamada.</p>}

        {alunos.map((aluno) => (
          <div className="chamada-item chamada-nova" key={aluno.id}>
            <strong>{aluno.nome}</strong>

            <div className="status-buttons">
              <button
                className={
                  presencas[aluno.id] === "presente"
                    ? "btn-status presente ativo"
                    : "btn-status presente"
                }
                onClick={() => alterarPresenca(aluno.id, "presente")}
              >
                Presente
              </button>

              <button
                className={
                  presencas[aluno.id] === "atrasado"
                    ? "btn-status atrasado ativo"
                    : "btn-status atrasado"
                }
                onClick={() => alterarPresenca(aluno.id, "atrasado")}
              >
                Atrasado
              </button>

              <button
                className={
                  presencas[aluno.id] === "falta"
                    ? "btn-status falta ativo"
                    : "btn-status falta"
                }
                onClick={() => alterarPresenca(aluno.id, "falta")}
              >
                Faltou
              </button>
            </div>
          </div>
        ))}

        {alunos.length > 0 && (
          <>
            <div className="resumo-chamada">
              <h3>Resumo rápido</h3>
              <p>Presentes: {totalPresentes}</p>
              <p>Atrasados: {totalAtrasados}</p>
              <p>Faltas: {totalFaltas}</p>
            </div>

            <button onClick={salvarChamada} disabled={carregando}>
              {carregando ? "Salvando..." : "Salvar chamada"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
