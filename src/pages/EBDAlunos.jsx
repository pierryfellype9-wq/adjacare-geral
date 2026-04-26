import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"

export default function EBDAlunos({ user }) {
  const navigate = useNavigate()
  const usuario = user || JSON.parse(localStorage.getItem("user") || "{}")

  const temAcessoEBD =
    usuario?.turma_ebd &&
    usuario?.turma_ebd !== "Não permitido"

  const [turmas, setTurmas] = useState([])
  const [alunos, setAlunos] = useState([])

  const [nome, setNome] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [nomePai, setNomePai] = useState("")
  const [nomeMae, setNomeMae] = useState("")
  const [contato, setContato] = useState("")
  const [observacao, setObservacao] = useState("")

  const [editando, setEditando] = useState(false)
  const [alunoId, setAlunoId] = useState(null)
  const [carregando, setCarregando] = useState(false)

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
      carregarDados()
    }
  }, [])

  async function carregarDados() {
    const { data: turmasData } = await supabase
      .from("ebd_turmas")
      .select("*")
      .order("idade_min", { ascending: true })

    setTurmas(turmasData || [])

    let query = supabase
      .from("ebd_alunos")
      .select("*, ebd_turmas(nome)")
      .order("nome", { ascending: true })

    if (professorEBD) {
      const turmaProfessor = turmasData?.find(
        (t) => t.nome === usuario.turma_ebd
      )

      if (turmaProfessor) {
        query = query.eq("turma_id", turmaProfessor.id)
      }
    }

    const { data: alunosData, error } = await query

    if (error) {
      console.error(error)
      alert("Erro ao carregar alunos.")
      return
    }

    setAlunos(alunosData || [])
  }

  function calcularIdade(data) {
    if (!data) return null

    const hoje = new Date()
    const nascimento = new Date(data)

    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const mes = hoje.getMonth() - nascimento.getMonth()

    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--
    }

    return idade
  }

  function encontrarTurmaPorIdade(idade) {
    return turmas.find((turma) => {
      if (turma.idade_max === null) {
        return idade >= turma.idade_min
      }

      return idade >= turma.idade_min && idade <= turma.idade_max
    })
  }

  const idade = dataNascimento ? calcularIdade(dataNascimento) : null
  const turmaAutomatica = idade !== null ? encontrarTurmaPorIdade(idade) : null
  const menorDeIdade = idade !== null && idade < 18

  function limparFormulario() {
    setNome("")
    setDataNascimento("")
    setNomePai("")
    setNomeMae("")
    setContato("")
    setObservacao("")
    setEditando(false)
    setAlunoId(null)
  }

  function iniciarEdicao(aluno) {
    setEditando(true)
    setAlunoId(aluno.id)
    setNome(aluno.nome || "")
    setDataNascimento(aluno.data_nascimento || "")
    setNomePai(aluno.nome_pai || "")
    setNomeMae(aluno.nome_mae || "")
    setContato(aluno.contato || "")
    setObservacao(aluno.observacao || "")

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  async function cadastrarAluno(e) {
    e.preventDefault()

    if (!temAcessoEBD) {
      alert("Você não possui permissão para alterar esta área.")
      return
    }

    if (!nome || !dataNascimento) {
      alert("Preencha o nome e a data de nascimento.")
      return
    }

    if (!turmaAutomatica) {
      alert("Nenhuma turma encontrada para essa idade.")
      return
    }

    if (professorEBD && turmaAutomatica.nome !== usuario.turma_ebd) {
      alert("Você só pode cadastrar alunos da sua turma.")
      return
    }

    setCarregando(true)

    const dadosAluno = {
      nome,
      data_nascimento: dataNascimento,
      turma_id: turmaAutomatica.id,
      nome_pai: menorDeIdade ? nomePai : null,
      nome_mae: menorDeIdade ? nomeMae : null,
      contato,
      observacao,
    }

    let error

    if (editando) {
      const resposta = await supabase
        .from("ebd_alunos")
        .update(dadosAluno)
        .eq("id", alunoId)

      error = resposta.error
    } else {
      const resposta = await supabase.from("ebd_alunos").insert({
        ...dadosAluno,
        criado_por: usuario?.nome || "Não identificado",
      })

      error = resposta.error
    }

    setCarregando(false)

    if (error) {
      console.error(error)
      alert(editando ? "Erro ao editar aluno." : "Erro ao cadastrar aluno.")
      return
    }

    limparFormulario()
    carregarDados()
    alert(editando ? "Aluno atualizado com sucesso!" : "Aluno cadastrado com sucesso!")
  }

  async function excluirAluno(id) {
    if (!podeVerTudoEBD) {
      alert("Apenas administradores, dirigentes ou superintendente podem excluir alunos.")
      return
    }

    const confirmar = confirm("Deseja excluir este aluno?")
    if (!confirmar) return

    const { error } = await supabase
      .from("ebd_alunos")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(error)
      alert("Erro ao excluir aluno.")
      return
    }

    carregarDados()
  }

  if (!temAcessoEBD) {
    return (
      <div className="page">
        <button className="btn-voltar" onClick={() => navigate("/ebd")}>
          ← Voltar
        </button>

        <div className="form-card">
          <h2>Acesso não permitido</h2>
          <p>Você não possui permissão para acessar esta área da EBD.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <button className="btn-voltar" onClick={() => navigate("/ebd")}>
        ← Voltar
      </button>

      <div className="ebd-header">
        <div>
          <h1>Alunos da EBD</h1>
          <p>Cadastro e organização dos alunos por classe.</p>
        </div>
      </div>

      <form className="form-card ebd-form" onSubmit={cadastrarAluno}>
        <div className="form-title-row">
          <div>
            <h2>{editando ? "Editar aluno" : "Cadastrar aluno"}</h2>
            <p>Os dados serão classificados automaticamente pela idade.</p>
          </div>
        </div>

        <div className="form-grid-ebd">
          <div>
            <label>Nome do aluno</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Digite o nome" />
          </div>

          <div>
            <label>Data de nascimento</label>
            <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
          </div>
        </div>

        {idade !== null && (
          <div className="info-box ebd-info-box">
            <div>
              <span>Idade</span>
              <strong>{idade} anos</strong>
            </div>

            <div>
              <span>Classe</span>
              <strong>{turmaAutomatica?.nome || "Não encontrada"}</strong>
            </div>
          </div>
        )}

        {menorDeIdade && (
          <div className="form-grid-ebd">
            <div>
              <label>Nome do pai</label>
              <input value={nomePai} onChange={(e) => setNomePai(e.target.value)} placeholder="Nome do pai" />
            </div>

            <div>
              <label>Nome da mãe</label>
              <input value={nomeMae} onChange={(e) => setNomeMae(e.target.value)} placeholder="Nome da mãe" />
            </div>

            <div>
              <label>Contato do responsável</label>
              <input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="Telefone do responsável" />
            </div>
          </div>
        )}

        {idade !== null && idade >= 18 && (
          <div>
            <label>Contato do aluno</label>
            <input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="Telefone do aluno" />
          </div>
        )}

        <div>
          <label>Observação</label>
          <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observações, se houver" />
        </div>

        <div className="form-actions">
          <button disabled={carregando}>
            {carregando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar aluno"}
          </button>

          {editando && (
            <button type="button" className="btn-cancelar" onClick={limparFormulario}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="list-card">
        <div className="list-header">
          <div>
            <h2>
              Alunos cadastrados
              {professorEBD && ` — ${usuario.turma_ebd}`}
            </h2>
            <p>{alunos.length} aluno{alunos.length !== 1 ? "s" : ""} cadastrado{alunos.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {alunos.length === 0 && <p>Nenhum aluno cadastrado.</p>}

        <div className="alunos-grid">
          {alunos.map((aluno) => (
            <div className="aluno-card" key={aluno.id}>
              <div className="aluno-card-top">
                <div>
                  <h3>{aluno.nome}</h3>
                  <span className="badge-turma">{aluno.ebd_turmas?.nome || "Sem turma"}</span>
                </div>

                <div className="idade-circle">
                  {calcularIdade(aluno.data_nascimento)}
                  <small>anos</small>
                </div>
              </div>

              <div className="aluno-info">
                <p><strong>Contato:</strong> {aluno.contato || "Não informado"}</p>
                <p><strong>Cadastrado por:</strong> {aluno.criado_por || "Não informado"}</p>

                {aluno.observacao && <p><strong>Obs.:</strong> {aluno.observacao}</p>}
              </div>

              <div className="aluno-acoes">
                <button onClick={() => iniciarEdicao(aluno)}>Editar</button>

                {podeVerTudoEBD && (
                  <button className="btn-danger" onClick={() => excluirAluno(aluno.id)}>
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
