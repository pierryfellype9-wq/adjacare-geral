import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function PortalAluno() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [aluno, setAluno] = useState(null)
  const [financeiro, setFinanceiro] = useState([])
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [pagina, setPagina] = useState("inicio")

  function irPara(p) {
    setPagina(p)
    window.history.pushState({}, "", `/portal-aluno/${p === "inicio" ? "" : p}`)
  }

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

    if (error || !data) {
      setCarregando(false)
      setErro("Login ou senha inválidos.")
      return
    }

    const { data: financeiroData } = await supabase
      .from("ebd_financeiro")
      .select("*")
      .eq("aluno_id", data.id)
      .order("criado_em", { ascending: false })

    setAluno(data)
    setFinanceiro(financeiroData || [])
    setCarregando(false)
  }

  function sair() {
    setAluno(null)
    setEmail("")
    setSenha("")
    setFinanceiro([])
    setPagina("inicio")
    window.history.pushState({}, "", "/portal-aluno")
  }

  function calcularFrequencia(presencas) {
    const total = presencas.length
    const presentes = presencas.filter((p) => p.status === "presente").length
    return total > 0 ? Math.round((presentes / total) * 100) : 0
  }

  if (!aluno) {
    return (
      <div className="portal-page">
        <div className="portal-card">
          <h1>Portal do Aluno</h1>
          <p className="sub">Acompanhe sua frequência e informações da EBD</p>

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
              Exemplo: 01/01/2000 → 01012000
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

  const presencas = aluno.ebd_presencas || []
  const presentes = presencas.filter((p) => p.status === "presente").length
  const faltas = presencas.filter((p) => p.status === "falta").length
  const justificadas = presencas.filter((p) => p.status === "justificado").length
  const frequencia = calcularFrequencia(presencas)

  return (
    <div className="portal-page">
      <div className="portal-card portal-card-maior">
        <h1>Portal do Aluno</h1>
        <h2>{aluno.nome}</h2>
        <p className="turma">{aluno.ebd_turmas?.nome}</p>

        <div className="portal-menu">
          <button onClick={() => irPara("inicio")}>Início</button>
          <button onClick={() => irPara("frequencia")}>Frequência</button>
          <button onClick={() => irPara("financeiro")}>Financeiro</button>
          <button onClick={() => irPara("ajuda")}>Ajuda</button>
        </div>

        {pagina === "inicio" && (
          <>
            <h3>Resumo</h3>
            <p>Bem-vindo ao portal da EBD.</p>

            <div className="stats">
              <div className="stat">
                <span>Frequência</span>
                <strong>{frequencia}%</strong>
              </div>

              <div className="stat">
                <span>Turma</span>
                <strong>{aluno.ebd_turmas?.nome}</strong>
              </div>
            </div>
          </>
        )}

        {pagina === "frequencia" && (
          <>
            <h3>Frequência</h3>

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
          </>
        )}

        {pagina === "financeiro" && (
          <>
            <h3>Financeiro</h3>

            {financeiro.length === 0 && (
              <p>Nenhuma revista ou pagamento registrado.</p>
            )}

            {financeiro.map((item) => (
              <div className="financeiro-item" key={item.id}>
                <strong>{item.descricao}</strong>
                <p>Valor: R$ {Number(item.valor || 0).toFixed(2)}</p>
                <p>Status: {item.status}</p>
                {item.data_vencimento && <p>Vencimento: {item.data_vencimento}</p>}
              </div>
            ))}
          </>
        )}

        {pagina === "ajuda" && (
          <>
            <h3>Ajuda e informações</h3>
            <p>
              Use seu login gerado no cadastro da EBD.
            </p>
            <p>
              A senha é sua data de nascimento completa, sem barras ou traços.
            </p>
            <p>
              Exemplo: 01/01/2000 → 01012000.
            </p>
          </>
        )}

        <button className="btn-sair" onClick={sair}>
          Sair
        </button>
      </div>
    </div>
  )
}
