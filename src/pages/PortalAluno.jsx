import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function PortalAluno() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [aluno, setAluno] = useState(null)
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)

  async function fazerLogin(e) {
    e.preventDefault()
    setErro("")
    setCarregando(true)

    const { data, error } = await supabase
      .from("ebd_alunos")
      .select(`
        *,
        ebd_turmas(nome),
        ebd_presencas(status)
      `)
      .eq("email_portal", email.toLowerCase())
      .eq("senha_portal", senha)
      .single()

    setCarregando(false)

    if (error || !data) {
      setErro("Login ou senha inválidos.")
      return
    }

    setAluno(data)
  }

  function calcularFrequencia(presencas) {
    const total = presencas.length
    const presentes = presencas.filter(p => p.status === "presente").length
    return total > 0 ? Math.round((presentes / total) * 100) : 0
  }

  if (aluno) {
    const presencas = aluno.ebd_presencas || []
    const presentes = presencas.filter(p => p.status === "presente").length
    const faltas = presencas.filter(p => p.status === "falta").length
    const justificadas = presencas.filter(p => p.status === "justificado").length
    const frequencia = calcularFrequencia(presencas)

    return (
      <div className="portal-page">
        <div className="portal-card">

          <h1>Portal do Aluno</h1>
          <h2>{aluno.nome}</h2>
          <p className="turma">{aluno.ebd_turmas?.nome}</p>

          <div className="stats">
            <div className="stat">
              <span>Frequência</span>
              <strong>{frequencia}%</strong>
            </div>

            <div className="stat">
              <span>Presenças</span>
              <strong>{presentes}</strong>
            </div>

            <div className="stat">
              <span>Faltas</span>
              <strong>{faltas}</strong>
            </div>

            <div className="stat">
              <span>Justificadas</span>
              <strong>{justificadas}</strong>
            </div>
          </div>

          <button className="btn-sair" onClick={() => setAluno(null)}>
            Sair
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="portal-page">
      <div className="portal-card">

        <h1>Portal do Aluno</h1>
        <p className="sub">Acompanhe sua frequência</p>

        <form onSubmit={fazerLogin}>
          <input
            placeholder="Login"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          <p className="info-login">
  A senha é a data de nascimento do aluno.<br />
  Exemplo: 01/01/2000 → 01012000 (sem traços)
</p>
          
          {erro && <p className="erro">{erro}</p>}

          <button disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}
