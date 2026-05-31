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
  const [dataConfirmacao, setDataConfirmacao] = useState("")
const [novaSenha, setNovaSenha] = useState("")
const [confirmarSenha, setConfirmarSenha] = useState("")

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
      .eq("email_portal", email.toLowerCase().trim())
      .eq("senha_portal", senha.trim())
      .limit(1)
      .maybeSingle()

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

  async function trocarSenha(e) {
  e.preventDefault()
  setErro("")
  setCarregando(true)

  if (novaSenha.trim() !== confirmarSenha.trim()) {
    setCarregando(false)
    setErro("As senhas não conferem.")
    return
  }

  const { data, error } = await supabase
    .from("ebd_alunos")
    .select("*")
    .eq("email_portal", email.toLowerCase().trim())
    .eq("data_nascimento", dataConfirmacao)
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    setCarregando(false)
    setErro("Login ou data de nascimento inválidos.")
    return
  }

  const { error: erroUpdate } = await supabase
    .from("ebd_alunos")
    .update({ senha_portal: novaSenha.trim() })
    .eq("id", data.id)

  setCarregando(false)

  if (erroUpdate) {
    setErro("Erro ao atualizar senha.")
    return
  }

  alert("Senha criada com sucesso! Agora faça login.")

  setPagina("inicio")
  setSenha("")
  setNovaSenha("")
  setConfirmarSenha("")
  setDataConfirmacao("")
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
        <div className="portal-card portal-login-card">
          <img
            src="/logo-adjacare.jpg"
            alt="Sistema ADJACARÉ"
            className="portal-logo"
          />

          <h1>Portal do Aluno</h1>
          <p className="sub">
            Acesse suas informações da Escola Bíblica Dominical.
          </p>

          {pagina === "inicio" && (
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

<div
  className="info-login"
  style={{
    marginTop: "16px",
    marginBottom: "16px",
    lineHeight: "1.5",
  }}
>
  <strong>Primeiro acesso?</strong>
      <span>
        Clique em “Primeiro acesso” e confirme sua data de nascimento para criar uma nova senha.
      </span>
    </div>

    {erro && <p className="erro">{erro}</p>}

    <button disabled={carregando}>
      {carregando ? "Entrando..." : "Fazer login"}
    </button>

    <button
  type="button"
  className="btn-secundario"
  onClick={() => setPagina("primeiro-acesso")}
  style={{
    marginTop: "12px",
  }}
>
      Primeiro acesso / trocar senha
    </button>
  </form>
)}

{pagina === "primeiro-acesso" && (
  <form onSubmit={trocarSenha}>
    <input
      placeholder="Login"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
    />

    <input
      type="date"
      value={dataConfirmacao}
      onChange={(e) => setDataConfirmacao(e.target.value)}
    />

    <input
      type="password"
      placeholder="Nova senha"
      value={novaSenha}
      onChange={(e) => setNovaSenha(e.target.value)}
    />

    <input
      type="password"
      placeholder="Confirmar nova senha"
      value={confirmarSenha}
      onChange={(e) => setConfirmarSenha(e.target.value)}
    />

    {erro && <p className="erro">{erro}</p>}

    <button disabled={carregando}>
      {carregando ? "Salvando..." : "Criar nova senha"}
    </button>

<button
  type="button"
  onClick={() => setPagina("inicio")}
  style={{
    marginTop: "12px",
  }}
>
  Voltar para login
    </button>
  </form>
)}
        </div>
      </div>
    )
  }

  const presencas = aluno.ebd_presencas || []
  const presentes = presencas.filter((p) => p.status === "presente").length
  const faltas = presencas.filter(
    (p) => p.status === "falta" || p.status === "atrasado"
  ).length
  const atrasados = presencas.filter((p) => p.status === "atrasado").length
  const justificadas = presencas.filter((p) => p.status === "justificado").length
  const frequencia = calcularFrequencia(presencas)

  return (
    <div className="portal-page">
      <div className="portal-dashboard">
        <div className="portal-topo">
          <div className="portal-identidade">
            <img
              src="/logo-adjacare.jpg"
              alt="Sistema ADJACARÉ"
              className="portal-logo-mini"
            />

            <div>
              <span>Portal do Aluno</span>
              <h1>{aluno.nome}</h1>
              <p>{aluno.ebd_turmas?.nome || "Sem turma"}</p>
            </div>
          </div>

          <button className="btn-sair-topo" onClick={sair}>
            Sair
          </button>
        </div>

        <div className="portal-menu">
          <button
            className={pagina === "inicio" ? "ativo" : ""}
            onClick={() => irPara("inicio")}
          >
            Início
          </button>

          <button
            className={pagina === "frequencia" ? "ativo" : ""}
            onClick={() => irPara("frequencia")}
          >
            Frequência
          </button>

          <button
            className={pagina === "financeiro" ? "ativo" : ""}
            onClick={() => irPara("financeiro")}
          >
            Financeiro
          </button>

          <button
            className={pagina === "ajuda" ? "ativo" : ""}
            onClick={() => irPara("ajuda")}
          >
            Ajuda
          </button>
        </div>

        {pagina === "inicio" && (
          <div className="portal-section">
            <h2>Resumo do aluno</h2>
            <p className="portal-texto">
              Bem-vindo ao portal. Aqui você acompanha informações importantes
              do cadastro e da EBD.
            </p>

            <div className="stats">
              <div className="stat destaque">
                <span>Frequência</span>
                <strong>{frequencia}%</strong>
              </div>

              <div className="stat">
                <span>Turma</span>
                <strong>{aluno.ebd_turmas?.nome || "Sem turma"}</strong>
              </div>

              <div className="stat">
                <span>Presenças</span>
                <strong>{presentes}</strong>
              </div>

              <div className="stat">
                <span>Faltas</span>
                <strong>{faltas}</strong>
              </div>
            </div>
          </div>
        )}

        {pagina === "frequencia" && (
          <div className="portal-section">
            <h2>Frequência</h2>

            <div className="stats">
              <div className="stat destaque">
                <span>Frequência geral</span>
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
                <span>Atrasos</span>
                <strong>{atrasados}</strong>
              </div>

              <div className="stat">
                <span>Justificadas</span>
                <strong>{justificadas}</strong>
              </div>
            </div>
          </div>
        )}

        {pagina === "financeiro" && (
          <div className="portal-section">
            <h2>Financeiro</h2>

            {financeiro.length === 0 && (
              <div className="portal-empty">
                Nenhuma revista ou pagamento registrado até o momento.
              </div>
            )}

            {financeiro.map((item) => (
              <div className="financeiro-item" key={item.id}>
                <strong>{item.descricao}</strong>
                <p>Valor: R$ {Number(item.valor || 0).toFixed(2)}</p>
                <p>Status: {item.status}</p>
                {item.data_vencimento && (
                  <p>Vencimento: {item.data_vencimento}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {pagina === "ajuda" && (
          <div className="portal-section">
            <h2>Ajuda e informações</h2>

            <div className="ajuda-grid">
              <div className="ajuda-card">
                <strong>Login</strong>
                <p>Use o login enviado pelo Sistema ADJACARÉ.</p>
              </div>

              <div className="ajuda-card">
                <strong>Senha inicial</strong>
                <p>
                  A senha é a data de nascimento completa, sem barras ou traços.
                </p>
              </div>

              <div className="ajuda-card">
                <strong>Exemplo</strong>
                <p>01/01/2000 → 01012000</p>
              </div>

              <div className="ajuda-card">
                <strong>Suporte</strong>
                <p>Em caso de erro, procure a equipe responsável pelo sistema.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
