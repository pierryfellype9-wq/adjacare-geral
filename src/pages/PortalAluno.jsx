import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function PortalAluno() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [aluno, setAluno] = useState(null)
  const [financeiro, setFinanceiro] = useState([])
  const [trimestreAtual, setTrimestreAtual] = useState(null)
  const [licoes, setLicoes] = useState([])
  const [presencas, setPresencas] = useState([])
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
        ebd_turmas(nome)
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

    const { data: trimestreData } = await supabase
      .from("ebd_trimestres")
      .select("*")
      .eq("turma_id", data.turma_id)
      .eq("status", "ativo")
      .order("ano", { ascending: false })
      .order("numero", { ascending: false })
      .limit(1)
      .maybeSingle()

    let licoesData = []

    if (trimestreData) {
      const { data: aulasData } = await supabase
        .from("ebd_aulas")
        .select("*")
        .eq("trimestre_id", trimestreData.id)
        .order("numero_licao", { ascending: true })

      licoesData = aulasData || []
    }

    const { data: presencasData } = await supabase
      .from("ebd_presencas")
      .select("*")
      .eq("aluno_id", data.id)

    setAluno(data)
    setFinanceiro(financeiroData || [])
    setTrimestreAtual(trimestreData || null)
    setLicoes(licoesData || [])
    setPresencas(presencasData || [])
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
    setTrimestreAtual(null)
    setLicoes([])
    setPresencas([])
    setPagina("inicio")
    window.history.pushState({}, "", "/portal-aluno")
  }

  function formatarData(data) {
    if (!data) return "-"
    const [ano, mes, dia] = data.split("-")
    return `${dia}/${mes}/${ano}`
  }

  function statusDaLicao(licaoId) {
    const presenca = presencas.find((p) => p.aula_id === licaoId)

    if (!presenca) return "Ainda não realizada"
    if (presenca.status === "presente") return "Presente"
    if (presenca.status === "atrasado") return "Atrasado"
    if (presenca.status === "justificado") return "Justificada"

    return "Falta"
  }

  function corStatus(status) {
    if (status === "Presente") return "#16a34a"
    if (status === "Atrasado") return "#d97706"
    if (status === "Justificada") return "#2563eb"
    if (status === "Falta") return "#dc2626"
    return "#64748b"
  }

  function calcularFrequencia() {
    const presencasDoTrimestre = presencas.filter((p) =>
      licoes.some((l) => l.id === p.aula_id)
    )

    const total = presencasDoTrimestre.length
    const presentes = presencasDoTrimestre.filter(
      (p) => p.status === "presente" || p.status === "atrasado"
    ).length

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
                  Clique em “Primeiro acesso” e confirme sua data de nascimento
                  para criar uma nova senha.
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
                style={{ marginTop: "12px" }}
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
                style={{ marginTop: "12px" }}
              >
                Voltar para login
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  const presencasDoTrimestre = presencas.filter((p) =>
    licoes.some((l) => l.id === p.aula_id)
  )

  const presentes = presencasDoTrimestre.filter(
    (p) => p.status === "presente"
  ).length

  const atrasados = presencasDoTrimestre.filter(
    (p) => p.status === "atrasado"
  ).length

  const faltas = presencasDoTrimestre.filter(
    (p) => p.status === "falta"
  ).length

  const justificadas = presencasDoTrimestre.filter(
    (p) => p.status === "justificado"
  ).length

  const frequencia = calcularFrequencia()

  const proximaLicao =
    licoes.find((l) => !presencas.some((p) => p.aula_id === l.id)) ||
    licoes[licoes.length - 1]

  const pendenciasFinanceiras = financeiro.filter(
    (item) => item.status !== "pago"
  ).length

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
            className={pagina === "licoes" ? "ativo" : ""}
            onClick={() => irPara("licoes")}
          >
            Minhas lições
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
            className={pagina === "cadastro" ? "ativo" : ""}
            onClick={() => irPara("cadastro")}
          >
            Meu cadastro
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
              Bem-vindo ao portal. Aqui você acompanha sua frequência, lições,
              financeiro e dados da EBD.
            </p>

            <div
              style={{
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: "18px",
                padding: "22px",
                marginBottom: "22px",
                boxShadow: "0 14px 34px rgba(37,99,235,0.28)",
              }}
            >
              <strong
                style={{
                  display: "block",
                  color: "#ffffff",
                  fontSize: "18px",
                  marginBottom: "10px",
                }}
              >
                📖 {trimestreAtual?.nome || "Nenhum trimestre ativo"}
              </strong>

              <p
                style={{
                  margin: 0,
                  color: "#dbeafe",
                  fontSize: "15px",
                  lineHeight: "1.5",
                }}
              >
                {proximaLicao
                  ? `Próxima lição: Lição ${String(
                      proximaLicao.numero_licao
                    ).padStart(2, "0")} — ${
                      proximaLicao.tema || "Sem tema"
                    }`
                  : "Nenhuma lição cadastrada para este trimestre."}
              </p>
            </div>

            <div className="stats">
              <div className="stat destaque">
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
                <span>Financeiro</span>
                <strong>{pendenciasFinanceiras}</strong>
              </div>
            </div>
          </div>
        )}

        {pagina === "licoes" && (
          <div className="portal-section">
            <h2>Minhas lições</h2>

            {!trimestreAtual && (
              <div className="portal-empty">
                Nenhum trimestre ativo encontrado para sua turma.
              </div>
            )}

            {trimestreAtual && licoes.length === 0 && (
              <div className="portal-empty">
                Nenhuma lição cadastrada neste trimestre.
              </div>
            )}

            {licoes.map((licao) => {
              const status = statusDaLicao(licao.id)

              return (
                <div
                  key={licao.id}
                  className="financeiro-item"
                  style={{
                    borderLeft: `6px solid ${corStatus(status)}`,
                  }}
                >
                  <strong>
                    Lição {String(licao.numero_licao).padStart(2, "0")} —{" "}
                    {formatarData(licao.data)}
                  </strong>

                  <p>
                    <strong>Tema:</strong>{" "}
                    {licao.tema || "Tema não cadastrado"}
                  </p>

                  <p>
                    <strong>Versículo-chave:</strong>{" "}
                    {licao.versiculo_chave || "Não informado"}
                  </p>

                  {licao.leitura_biblica && (
                    <p>
                      <strong>Leitura bíblica:</strong> {licao.leitura_biblica}
                    </p>
                  )}

                  <p>
                    <strong>Status:</strong>{" "}
                    <span style={{ color: corStatus(status), fontWeight: 700 }}>
                      {status}
                    </span>
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {pagina === "frequencia" && (
          <div className="portal-section">
            <h2>Frequência</h2>

            <div className="stats">
              <div className="stat destaque">
                <span>Frequência no trimestre</span>
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

            <div
              style={{
                width: "100%",
                height: "18px",
                background: "#e5e7eb",
                borderRadius: "999px",
                overflow: "hidden",
                marginTop: "20px",
              }}
            >
              <div
                style={{
                  width: `${frequencia}%`,
                  height: "100%",
                  background: "#2563eb",
                }}
              />
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
                  <p>Vencimento: {formatarData(item.data_vencimento)}</p>
                )}
                {item.data_pagamento && (
                  <p>Pagamento: {formatarData(item.data_pagamento)}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {pagina === "cadastro" && (
          <div className="portal-section">
            <h2>Meu cadastro</h2>

            <div className="financeiro-item">
              <p>
                <strong>Nome:</strong> {aluno.nome}
              </p>
              <p>
                <strong>Turma:</strong> {aluno.ebd_turmas?.nome || "Sem turma"}
              </p>
              <p>
                <strong>Data de nascimento:</strong>{" "}
                {formatarData(aluno.data_nascimento)}
              </p>
              <p>
                <strong>Nome do pai:</strong>{" "}
                {aluno.nome_pai || "Não informado"}
              </p>
              <p>
                <strong>Nome da mãe:</strong>{" "}
                {aluno.nome_mae || "Não informado"}
              </p>
              <p>
                <strong>Contato:</strong> {aluno.contato || "Não informado"}
              </p>
              <p>
                <strong>Login:</strong> {aluno.email_portal || "Não informado"}
              </p>
            </div>
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
                <strong>Primeiro acesso</strong>
                <p>
                  Confirme sua data de nascimento para criar ou trocar sua senha.
                </p>
              </div>

              <div className="ajuda-card">
                <strong>Suporte</strong>
                <p>
                  Em caso de erro, contate: ti@adjacare.org ou suporte@adjacare.org
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
