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
  const [dataChamada, setDataChamada] = useState(new Date().toISOString().split("T")[0])
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
    if (temAcessoEBD) {
      carregarTurmas()
    }
  }, [])

  useEffect(() => {
    if (turmaSelecionada && temAcessoEBD) {
      carregarAlunos()
    }
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
      presencasIniciais[aluno.id] = "presente"
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

  function alterarObservacao(alunoId, texto) {
    if (!temAcessoEBD) return

    setObservacoes((prev) => ({
      ...prev,
      [alunoId]: texto,
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
      const { data: novaAula } = await supabase
        .from("ebd_aulas")
        .insert({
          turma_id: turmaSelecionada,
          data: dataChamada,
        })
        .select()
        .single()

      aulaId = novaAula.id
    }

    const registros = alunos.map((aluno) => ({
      aula_id: aulaId,
      aluno_id: aluno.id,
      status: presencas[aluno.id] || "presente",
      observacao: observacoes[aluno.id] || null,
    }))

    const { error } = await supabase
      .from("ebd_presencas")
      .upsert(registros, {
        onConflict: "aula_id,aluno_id",
      })

    setCarregando(false)

    if (error) {
      console.error(error)
      alert("Erro ao salvar chamada.")
      return
    }

    setChamadaExistente(true)
    alert("Chamada salva com sucesso!")
  }

  // 🔒 BLOQUEIO TOTAL
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

      <div className="list-card">
        <h2>
          Lista de alunos
          {professorEBD && ` — ${usuario.turma_ebd}`}
        </h2>

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
