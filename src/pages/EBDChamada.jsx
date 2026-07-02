import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"

export default function EBDChamada({ user }) {
  const navigate = useNavigate()
  const usuario = user || JSON.parse(localStorage.getItem("user") || "{}")

  const podeVerTudoEBD =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    (usuario?.role === "EBD" && usuario?.turma_ebd === "Superintendente")

  const professorEBD =
    usuario?.turma_ebd &&
    usuario?.turma_ebd !== "Superintendente" &&
    usuario?.turma_ebd !== "Não permitido"

  const temAcessoEBD = podeVerTudoEBD || professorEBD
  const podeEscolherTurma = podeVerTudoEBD

  const [turmas, setTurmas] = useState([])
  const [turmaSelecionada, setTurmaSelecionada] = useState("")
  const [trimestres, setTrimestres] = useState([])
  const [trimestreSelecionado, setTrimestreSelecionado] = useState("")
  const [licoes, setLicoes] = useState([])
  const [licaoSelecionada, setLicaoSelecionada] = useState("")

  const [alunos, setAlunos] = useState([])
  const [presencas, setPresencas] = useState({})
  const [observacoes, setObservacoes] = useState({})
  const [carregando, setCarregando] = useState(false)
  const [chamadaExistente, setChamadaExistente] = useState(false)

  useEffect(() => {
    if (temAcessoEBD) carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaSelecionada) {
      carregarTrimestres()
      setTrimestreSelecionado("")
      setLicaoSelecionada("")
      setLicoes([])
      setAlunos([])
      setPresencas({})
      setObservacoes({})
      setChamadaExistente(false)
    }
  }, [turmaSelecionada])

  useEffect(() => {
    if (trimestreSelecionado) {
      carregarLicoes()
      setLicaoSelecionada("")
      setAlunos([])
      setPresencas({})
      setObservacoes({})
      setChamadaExistente(false)
    }
  }, [trimestreSelecionado])

  useEffect(() => {
    if (turmaSelecionada && licaoSelecionada) {
      carregarAlunosEChamada()
    }
  }, [turmaSelecionada, licaoSelecionada])

  async function carregarTurmas() {
    const { data, error } = await supabase
      .from("ebd_turmas")
      .select("*")
      .order("idade_min", { ascending: true })

    if (error) {
      alert("Erro ao carregar turmas.")
      console.log(error)
      return
    }

    setTurmas(data || [])

    if (professorEBD && usuario?.turma_ebd) {
      const turmaDoUsuario = data?.find((t) => t.nome === usuario.turma_ebd)
      if (turmaDoUsuario) setTurmaSelecionada(turmaDoUsuario.id)
    }
  }

  async function carregarTrimestres() {
    const { data, error } = await supabase
      .from("ebd_trimestres")
      .select("*")
      .eq("turma_id", turmaSelecionada)
      .order("ano", { ascending: false })
      .order("numero", { ascending: false })

    if (error) {
      alert("Erro ao carregar trimestres.")
      console.log(error)
      return
    }

    setTrimestres(data || [])

    const trimestreAtivo = data?.find((t) => t.status === "ativo")
    if (trimestreAtivo) {
      setTrimestreSelecionado(trimestreAtivo.id)
    }
  }

  async function carregarLicoes() {
    const { data, error } = await supabase
      .from("ebd_aulas")
      .select("*")
      .eq("trimestre_id", trimestreSelecionado)
      .order("numero_licao", { ascending: true })

    if (error) {
      alert("Erro ao carregar lições.")
      console.log(error)
      return
    }

    setLicoes(data || [])

    const hoje = new Date().toISOString().split("T")[0]
    const licaoHoje = data?.find((l) => l.data === hoje)

    if (licaoHoje) {
      setLicaoSelecionada(licaoHoje.id)
    }
  }

  async function carregarAlunosEChamada() {
    const { data: alunosData, error: erroAlunos } = await supabase
      .from("ebd_alunos")
      .select("*")
      .eq("turma_id", turmaSelecionada)
      .eq("ativo", true)
      .order("nome", { ascending: true })

    if (erroAlunos) {
      alert("Erro ao carregar alunos.")
      console.log(erroAlunos)
      return
    }

    setAlunos(alunosData || [])

    const presencasIniciais = {}
    const observacoesIniciais = {}

    alunosData?.forEach((aluno) => {
      presencasIniciais[aluno.id] = "falta"
      observacoesIniciais[aluno.id] = ""
    })

    const { data: presencasExistentes, error: erroPresencas } = await supabase
      .from("ebd_presencas")
      .select("*")
      .eq("aula_id", licaoSelecionada)

    if (erroPresencas) {
      alert("Erro ao carregar presenças.")
      console.log(erroPresencas)
      return
    }

    if (presencasExistentes && presencasExistentes.length > 0) {
      setChamadaExistente(true)

      presencasExistentes.forEach((p) => {
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

    if (!trimestreSelecionado) {
      alert("Selecione um trimestre.")
      return
    }

    if (!licaoSelecionada) {
      alert("Selecione uma lição.")
      return
    }

    if (alunos.length === 0) {
      alert("Nenhum aluno encontrado nessa turma.")
      return
    }

    setCarregando(true)

    const registros = alunos.map((aluno) => ({
      aula_id: licaoSelecionada,
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
      alert("Erro ao salvar chamada.")
      return
    }

    setChamadaExistente(true)
    alert("Chamada salva com sucesso!")
  }

  function formatarData(data) {
    if (!data) return ""
    const [ano, mes, dia] = data.split("-")
    return `${dia}/${mes}/${ano}`
  }

  const licaoAtual = licoes.find((l) => l.id === licaoSelecionada)

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

        <label>Trimestre</label>
        <select
          value={trimestreSelecionado}
          onChange={(e) => setTrimestreSelecionado(e.target.value)}
          disabled={!turmaSelecionada}
        >
          <option value="">Selecione</option>
          {trimestres.map((tri) => (
            <option key={tri.id} value={tri.id}>
              {tri.nome} {tri.status === "ativo" ? "(Ativo)" : ""}
            </option>
          ))}
        </select>

        <label>Lição</label>
        <select
          value={licaoSelecionada}
          onChange={(e) => setLicaoSelecionada(e.target.value)}
          disabled={!trimestreSelecionado}
        >
          <option value="">Selecione</option>
          {licoes.map((licao) => (
            <option key={licao.id} value={licao.id}>
              Lição {String(licao.numero_licao).padStart(2, "0")} -{" "}
              {formatarData(licao.data)} {licao.tema ? `- ${licao.tema}` : ""}
            </option>
          ))}
        </select>

        {turmaSelecionada && trimestres.length === 0 && (
          <div className="info-box">
            Nenhum trimestre cadastrado para esta turma. Cadastre primeiro na aba
            Trimestres.
          </div>
        )}

        {trimestreSelecionado && licoes.length === 0 && (
          <div className="info-box">
            Este trimestre ainda não possui lições cadastradas.
          </div>
        )}

        {licaoAtual && (
          <div className="info-box">
            <strong>
              Lição {String(licaoAtual.numero_licao).padStart(2, "0")}
            </strong>
            <br />
            Data: {formatarData(licaoAtual.data)}
            <br />
            Tema: {licaoAtual.tema || "Sem tema cadastrado"}
            <br />
            {chamadaExistente
              ? "Esta chamada já existe. As alterações serão atualizadas sem duplicar."
              : "Nova chamada para esta lição."}
          </div>
        )}
      </div>

      <div className="list-card chamada-card">
        <div className="chamada-topo">
          <button
            type="button"
            className="marcar-todos presente"
            disabled={!licaoSelecionada || alunos.length === 0}
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
            disabled={!licaoSelecionada || alunos.length === 0}
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

        {!licaoSelecionada && (
          <p>Selecione turma, trimestre e lição para iniciar a chamada.</p>
        )}

        {licaoSelecionada && alunos.length === 0 && (
          <p>Nenhum aluno para chamada.</p>
        )}

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
