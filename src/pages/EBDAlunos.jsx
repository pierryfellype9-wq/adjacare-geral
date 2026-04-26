import { useEffect, useState } from "react"
import { supabase } from "../supabase"

export default function EBDAlunos() {
  const [turmas, setTurmas] = useState([])
  const [alunos, setAlunos] = useState([])

  const [nome, setNome] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [nomePai, setNomePai] = useState("")
  const [nomeMae, setNomeMae] = useState("")
  const [contato, setContato] = useState("")
  const [observacao, setObservacao] = useState("")
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    const { data: turmasData } = await supabase
      .from("ebd_turmas")
      .select("*")
      .order("idade_min", { ascending: true })

    const { data: alunosData } = await supabase
      .from("ebd_alunos")
      .select("*, ebd_turmas(nome)")
      .order("nome", { ascending: true })

    setTurmas(turmasData || [])
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

  async function cadastrarAluno(e) {
    e.preventDefault()

    if (!nome || !dataNascimento) {
      alert("Preencha o nome e a data de nascimento.")
      return
    }

    if (!turmaAutomatica) {
      alert("Nenhuma turma encontrada para essa idade.")
      return
    }

    setCarregando(true)

    const { error } = await supabase.from("ebd_alunos").insert({
      nome,
      data_nascimento: dataNascimento,
      turma_id: turmaAutomatica.id,
      nome_pai: menorDeIdade ? nomePai : null,
      nome_mae: menorDeIdade ? nomeMae : null,
      contato,
      observacao
    })

    setCarregando(false)

    if (error) {
      console.error(error)
      alert("Erro ao cadastrar aluno.")
      return
    }

    setNome("")
    setDataNascimento("")
    setNomePai("")
    setNomeMae("")
    setContato("")
    setObservacao("")

    carregarDados()
    alert("Aluno cadastrado com sucesso!")
  }

  async function excluirAluno(id) {
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

  return (
    <div className="page">
      <h1>Alunos da EBD</h1>

      <form className="form-card" onSubmit={cadastrarAluno}>
        <h2>Cadastrar aluno</h2>

        <label>Nome do aluno</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Digite o nome"
        />

        <label>Data de nascimento</label>
        <input
          type="date"
          value={dataNascimento}
          onChange={(e) => setDataNascimento(e.target.value)}
        />

        {idade !== null && (
          <div className="info-box">
            <p><strong>Idade:</strong> {idade} anos</p>
            <p><strong>Classe:</strong> {turmaAutomatica?.nome || "Não encontrada"}</p>
          </div>
        )}

        {menorDeIdade && (
          <>
            <label>Nome do pai</label>
            <input
              value={nomePai}
              onChange={(e) => setNomePai(e.target.value)}
              placeholder="Nome do pai"
            />

            <label>Nome da mãe</label>
            <input
              value={nomeMae}
              onChange={(e) => setNomeMae(e.target.value)}
              placeholder="Nome da mãe"
            />

            <label>Contato do responsável</label>
            <input
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              placeholder="Telefone do responsável"
            />
          </>
        )}

        {idade !== null && idade >= 18 && (
          <>
            <label>Contato do aluno</label>
            <input
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              placeholder="Telefone do aluno"
            />
          </>
        )}

        <label>Observação</label>
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Observações, se houver"
        />

        <button disabled={carregando}>
          {carregando ? "Salvando..." : "Cadastrar aluno"}
        </button>
      </form>

      <div className="list-card">
        <h2>Alunos cadastrados</h2>

        {alunos.length === 0 && <p>Nenhum aluno cadastrado.</p>}

        {alunos.map((aluno) => (
          <div className="list-item" key={aluno.id}>
            <div>
              <strong>{aluno.nome}</strong>
              <p>
                {calcularIdade(aluno.data_nascimento)} anos —{" "}
                {aluno.ebd_turmas?.nome || "Sem turma"}
              </p>
              <p>Contato: {aluno.contato || "Não informado"}</p>
            </div>

            <button className="btn-danger" onClick={() => excluirAluno(aluno.id)}>
              Excluir
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
