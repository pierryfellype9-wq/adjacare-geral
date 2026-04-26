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
      <div className="page">
        <div className="form-card">
          <h1>Portal do Aluno</h1>

          <h2>{aluno.nome}</h2>
          <p><strong>Turma:</strong> {aluno.ebd_turmas?.nome}</p>

          <div className="info-box">
            <div>
              <span>Frequência</span>
              <strong>{frequencia}%</strong>
            </div>

            <div>
              <span>Presenças</span>
              <strong>{presentes}</strong>
            </div>

            <div>
              <span>Faltas</span>
              <strong>{faltas}</strong>
            </div>

            <div>
              <span>Justificadas</span>
              <strong>{justificadas}</strong>
            </div>
          </div>

          <button onClick={() => setAluno(null)}>
            Sair
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="form-card">
        <h1>Portal do Aluno</h1>
        <p>Acompanhe sua frequência na EBD</p>

        <form onSubmit={fazerLogin}>
          <div>
            <label>Login</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: joao.silva@adjacare.org"
            />
          </div>

          <div>
            <label>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Data de nascimento"
            />
          </div>

          {erro && <p style={{ color: "red" }}>{erro}</p>}

          <button disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}
