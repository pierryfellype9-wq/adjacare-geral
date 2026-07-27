import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import "./EBDInternas.css"

export default function EBDChamada({ user }) {
  const navigate = useNavigate()
  const usuario = user || JSON.parse(localStorage.getItem("user") || "{}")

  const podeVerTudoEBD =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    (usuario?.role === "EBD" && usuario?.turma_ebd === "Superintendente")

  const turmasPermitidas = Array.isArray(usuario?.turmas_ebd)
    ? usuario.turmas_ebd
    : []

  const professorEBD = !podeVerTudoEBD && turmasPermitidas.length > 0

  const temAcessoEBD = podeVerTudoEBD || professorEBD

  const podeEscolherTurma = podeVerTudoEBD || turmasPermitidas.length > 1

  const [turmas, setTurmas] = useState([])
  const [turmaSelecionada, setTurmaSelecionada] = useState("")
  const [trimestres, setTrimestres] = useState([])
  const [trimestreSelecionado, setTrimestreSelecionado] = useState("")
  const [licoes, setLicoes] = useState([])
  const [licaoSelecionada, setLicaoSelecionada] = useState("")

  const [alunos, setAlunos] = useState([])
  const [presencas, setPresencas] = useState({})
  const [observacoes, setObservacoes] = useState({})
  const [visitantes, setVisitantes] = useState([])
  const [visitantesRemovidos, setVisitantesRemovidos] = useState([])

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
      limparChamada()
    }
  }, [turmaSelecionada])

  useEffect(() => {
    if (trimestreSelecionado) {
      carregarLicoes()
      setLicaoSelecionada("")
      limparChamada()
    }
  }, [trimestreSelecionado])

  useEffect(() => {
    if (turmaSelecionada && licaoSelecionada) {
      carregarAlunosEChamada()
      carregarVisitantes()
    }
  }, [turmaSelecionada, licaoSelecionada])

  function limparChamada() {
    setAlunos([])
    setPresencas({})
    setObservacoes({})
    setVisitantes([])
    setVisitantesRemovidos([])
    setChamadaExistente(false)
  }

  function usuarioPodeAcessarTurma(turmaId) {
    if (podeVerTudoEBD) return true
    return turmasPermitidas.includes(turmaId)
  }

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

    if (podeVerTudoEBD) {
      setTurmas(data || [])
      return
    }

    const minhasTurmas = (data || []).filter((turma) =>
      turmasPermitidas.includes(turma.id)
    )

    setTurmas(minhasTurmas)

    if (minhasTurmas.length === 1) {
      setTurmaSelecionada(minhasTurmas[0].id)
    }
  }

  async function carregarTrimestres() {
    if (!usuarioPodeAcessarTurma(turmaSelecionada)) {
      alert("Você não possui acesso a essa turma.")
      setTurmaSelecionada("")
      return
    }

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
    } else if (data && data.length > 0) {
      setLicaoSelecionada(data[0].id)
    }
  }

  async function carregarAlunosEChamada() {
    if (!usuarioPodeAcessarTurma(turmaSelecionada)) {
      alert("Você não possui acesso a essa turma.")
      return
    }

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

  async function carregarVisitantes() {
    const { data, error } = await supabase
      .from("ebd_visitantes")
      .select("*")
      .eq("aula_id", licaoSelecionada)
      .order("criado_em", { ascending: true })

    if (error) {
      alert("Erro ao carregar visitantes.")
      console.log(error)
      return
    }

    setVisitantes(data || [])
    setVisitantesRemovidos([])
  }

  function alterarPresenca(alunoId, status) {
    if (!temAcessoEBD) return

    if (!usuarioPodeAcessarTurma(turmaSelecionada)) {
      alert("Você não possui acesso a essa turma.")
      return
    }

    setPresencas((prev) => ({
      ...prev,
      [alunoId]: status,
    }))
  }

  function adicionarVisitante() {
    if (!licaoSelecionada) {
      alert("Selecione uma lição antes de adicionar visitantes.")
      return
    }

    if (!usuarioPodeAcessarTurma(turmaSelecionada)) {
      alert("Você não possui acesso a essa turma.")
      return
    }

    setVisitantes((prev) => [
      ...prev,
      {
        id: `novo-${Date.now()}`,
        aula_id: licaoSelecionada,
        turma_id: turmaSelecionada,
        nome: "",
        idade: "",
        contato: "",
        convidado_por: "",
        primeira_visita: true,
        observacao: "",
        novo: true,
      },
    ])
  }

  function atualizarVisitante(id, campo, valor) {
    setVisitantes((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [campo]: valor } : v))
    )
  }

  function removerVisitante(visitante) {
    if (!confirm("Remover este visitante?")) return

    if (!visitante.novo) {
      setVisitantesRemovidos((prev) => [...prev, visitante.id])
    }

    setVisitantes((prev) => prev.filter((v) => v.id !== visitante.id))
  }

  async function salvarVisitantes() {
    for (const id of visitantesRemovidos) {
      const { error } = await supabase
        .from("ebd_visitantes")
        .delete()
        .eq("id", id)

      if (error) {
        console.log(error)
        alert("Erro ao remover visitante.")
        return false
      }
    }

    const visitantesComNome = visitantes.filter(
      (v) => v.nome && v.nome.trim() !== ""
    )

    const novos = visitantesComNome.filter((v) => v.novo)
    const antigos = visitantesComNome.filter((v) => !v.novo)

    if (novos.length > 0) {
      const dadosNovos = novos.map((v) => ({
        aula_id: licaoSelecionada,
        turma_id: turmaSelecionada,
        nome: v.nome.trim(),
        idade: v.idade ? Number(v.idade) : null,
        contato: v.contato || null,
        convidado_por: v.convidado_por || null,
        primeira_visita: !!v.primeira_visita,
        observacao: v.observacao || null,
      }))

      const { error } = await supabase
        .from("ebd_visitantes")
        .insert(dadosNovos)

      if (error) {
        console.log(error)
        alert(error.message || "Erro ao salvar visitantes.")
        return false
      }
    }

    for (const visitante of antigos) {
      const { error } = await supabase
        .from("ebd_visitantes")
        .update({
          aula_id: licaoSelecionada,
          turma_id: turmaSelecionada,
          nome: visitante.nome.trim(),
          idade: visitante.idade ? Number(visitante.idade) : null,
          contato: visitante.contato || null,
          convidado_por: visitante.convidado_por || null,
          primeira_visita: !!visitante.primeira_visita,
          observacao: visitante.observacao || null,
        })
        .eq("id", visitante.id)

      if (error) {
        console.log(error)
        alert(error.message || "Erro ao atualizar visitante.")
        return false
      }
    }

    return true
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

    if (!usuarioPodeAcessarTurma(turmaSelecionada)) {
      alert("Você não possui acesso a essa turma.")
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

    if (alunos.length === 0 && visitantes.length === 0) {
      alert("Nenhum aluno ou visitante encontrado para esta chamada.")
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

    if (registros.length > 0) {
      const { error } = await supabase
        .from("ebd_presencas")
        .upsert(registros, {
          onConflict: "aula_id,aluno_id",
        })

      if (error) {
        setCarregando(false)
        console.error(error)
        alert("Erro ao salvar chamada.")
        return
      }
    }

    const visitantesOk = await salvarVisitantes()

    if (!visitantesOk) {
      setCarregando(false)
      return
    }

    const { error: erroAula } = await supabase
      .from("ebd_aulas")
      .update({
        chamada_realizada_por: usuario?.nome || usuario?.email || "Usuário",
        chamada_realizada_em: new Date().toISOString(),
      })
      .eq("id", licaoSelecionada)

    if (erroAula) {
      setCarregando(false)
      console.log(erroAula)
      alert("Chamada salva, mas houve erro ao registrar quem realizou.")
      return
    }

    setCarregando(false)
    setChamadaExistente(true)
    await carregarLicoes()
    await carregarVisitantes()
    alert("Chamada salva com sucesso!")
  }

  function formatarData(data) {
    if (!data) return ""
    const [ano, mes, dia] = data.split("-")
    return `${dia}/${mes}/${ano}`
  }

  function formatarDataHora(data) {
    if (!data) return ""
    return new Date(data).toLocaleString("pt-BR")
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

  const totalVisitantes = visitantes.filter(
    (v) => v.nome && v.nome.trim() !== ""
  ).length

  const totalNoDia = totalPresentes + totalAtrasados + totalVisitantes

  if (!temAcessoEBD) {
    return (
      <div className="page ebd-subpage">
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
    <div className="page ebd-subpage ebd-subpage--chamada">
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

        {!podeVerTudoEBD && (
          <small
            style={{
              color: "#6b7280",
              display: "block",
              marginTop: 6,
              marginBottom: 10,
            }}
          >
            Você possui acesso a {turmasPermitidas.length} turma
            {turmasPermitidas.length > 1 ? "s" : ""}.
          </small>
        )}

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
            {licaoAtual.chamada_realizada_por && (
              <>
                Realizado por: {licaoAtual.chamada_realizada_por}
                <br />
                Em: {formatarDataHora(licaoAtual.chamada_realizada_em)}
                <br />
              </>
            )}
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

        {licaoSelecionada && (
          <div className="form-card" style={{ marginTop: "20px" }}>
            <h2>Visitantes</h2>

            {visitantes.map((visitante, index) => (
              <div
                key={visitante.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "16px",
                  marginBottom: "14px",
                  background: "#f8fafc",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Visitante {index + 1}</h3>

                <label>Nome</label>
                <input
                  value={visitante.nome || ""}
                  onChange={(e) =>
                    atualizarVisitante(visitante.id, "nome", e.target.value)
                  }
                />

                <label>Idade</label>
                <input
                  type="number"
                  value={visitante.idade || ""}
                  onChange={(e) =>
                    atualizarVisitante(visitante.id, "idade", e.target.value)
                  }
                />

                <label>Contato</label>
                <input
                  value={visitante.contato || ""}
                  onChange={(e) =>
                    atualizarVisitante(visitante.id, "contato", e.target.value)
                  }
                />

                <label>Convidado por</label>
                <input
                  value={visitante.convidado_por || ""}
                  onChange={(e) =>
                    atualizarVisitante(
                      visitante.id,
                      "convidado_por",
                      e.target.value
                    )
                  }
                />

                <label>Observação</label>
                <textarea
                  value={visitante.observacao || ""}
                  onChange={(e) =>
                    atualizarVisitante(
                      visitante.id,
                      "observacao",
                      e.target.value
                    )
                  }
                />

                <label style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={!!visitante.primeira_visita}
                    onChange={(e) =>
                      atualizarVisitante(
                        visitante.id,
                        "primeira_visita",
                        e.target.checked
                      )
                    }
                    style={{ width: "auto" }}
                  />
                  Primeira visita
                </label>

                <button
                  type="button"
                  onClick={() => removerVisitante(visitante)}
                  style={{ background: "#ef4444", marginTop: "12px" }}
                >
                  Remover visitante
                </button>
              </div>
            ))}

            <button type="button" onClick={adicionarVisitante}>
              + Adicionar visitante
            </button>
          </div>
        )}

        {(alunos.length > 0 || visitantes.length > 0) && (
          <>
            <div className="resumo-chamada">
              <h3>Resumo rápido</h3>
              <p>Presentes: {totalPresentes}</p>
              <p>Atrasados: {totalAtrasados}</p>
              <p>Faltas: {totalFaltas}</p>
              <p>Visitantes: {totalVisitantes}</p>
              <p>Total no dia: {totalNoDia}</p>
              <p>Realizado por: {usuario?.nome || usuario?.email}</p>
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
