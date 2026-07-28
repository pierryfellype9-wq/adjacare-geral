import { lazy, Suspense, useState, useEffect } from "react"
import { Routes, Route, Navigate } from "react-router-dom"

import Sidebar from "./components/Sidebar"
import AppFeedback from "./components/AppFeedback"
import { temPermissao } from "./lib/permissions"
import "./AppShell.css"
import {
  isLocalSessionExpired,
  restoreRollingSession,
  signInRolling,
  signOutRolling,
} from "./lib/auth"
import {
  ativarPushNotifications,
  desativarPushDesteUsuario,
} from "./lib/pushNotifications"
import {
  baixarAtualizacaoDoApp,
  verificarAtualizacaoDoApp,
} from "./lib/appUpdater"

const Dashboard = lazy(() => import("./pages/Dashboard"))
const Pedidos = lazy(() => import("./pages/Pedidos"))
const Solicitacoes = lazy(() => import("./pages/Solicitacoes"))
const Agenda = lazy(() => import("./pages/Agenda"))
const Avisos = lazy(() => import("./pages/Avisos"))
const TrocarSenha = lazy(() => import("./pages/trocarSenha"))
const Usuarios = lazy(() => import("./pages/Usuarios"))
const KanbanPedidos = lazy(() => import("./pages/KanbanPedidos"))
const EscalaMidia = lazy(() => import("./pages/EscalaMidia"))
const SenhasAplicativos = lazy(() => import("./pages/SenhasAplicativos"))
const CustosFixos = lazy(() => import("./pages/CustosFixos"))
const EBDDashboard = lazy(() => import("./pages/EBDDashboard"))
const PortalAluno = lazy(() => import("./pages/PortalAluno"))
const EBDFinanceiro = lazy(() => import("./pages/EBDFinanceiro"))
const Membros = lazy(() => import("./pages/Membros"))
const WhatsApp = lazy(() => import("./pages/WhatsApp"))
const EBD = lazy(() => import("./pages/EBD"))
const EBDAlunos = lazy(() => import("./pages/EBDAlunos"))
const EBDChamadaComOferta = lazy(() => import("./pages/EBDChamadaComOferta"))
const EBDRelatorios = lazy(() => import("./pages/EBDRelatorios"))
const EBDRelatorioOfertas = lazy(() => import("./pages/EBDRelatorioOfertas"))
const EBDTrimestres = lazy(() => import("./pages/EBDTrimestres"))
const CadastroProfessorPublico = lazy(() => import("./pages/CadastroProfessorPublico"))
const EBDSolicitacoesProfessores = lazy(() => import("./pages/EBDSolicitacoesProfessores"))
const EBDSolicitacaoProfessor = lazy(() => import("./pages/EBDSolicitacaoProfessor"))
const TetelestaiApp = lazy(() => import("./tetelestai/TetelestaiApp"))
const IgrejaSite = lazy(() => import("./igreja/IgrejaSite"))

function CarregandoPagina() {
  return (
    <div className="app-carregando" role="status" aria-live="polite">
      <span><i /><i /><i /></span>
      <strong>Carregando página</strong>
      <small>Preparando as informações para você...</small>
    </div>
  )
}

function isTetelestaiRequest() {
  const host = window.location.hostname.toLowerCase()
  const path = window.location.pathname.toLowerCase()
  return host === "tetelestai.adjacare.org" || host.startsWith("tetelestai.") || path === "/site" || path.startsWith("/site/") || path === "/site-preview" || path.startsWith("/site-preview/")
}

function isPortalAlunoRequest() {
  const host = window.location.hostname.toLowerCase()
  return host === "aluno.adjacare.org" || host.startsWith("aluno.")
}

function isIgrejaRequest() {
  const host = window.location.hostname.toLowerCase()
  const path = window.location.pathname.toLowerCase()
  return host === "adjacare.org" || host === "www.adjacare.org" ||
    path === "/igreja" || path.startsWith("/igreja/") ||
    path === "/igreja-preview" || path.startsWith("/igreja-preview/")
}

export default function App() {
  if (isTetelestaiRequest()) return <Suspense fallback={<div style={{minHeight:"100vh",background:"#020306"}} />}><TetelestaiApp /></Suspense>
  if (isPortalAlunoRequest()) return <Suspense fallback={<CarregandoPagina />}><PortalAluno /></Suspense>
  if (isIgrejaRequest()) return <Suspense fallback={<div style={{minHeight:"100vh",background:"#061a34"}} />}><IgrejaSite /></Suspense>

  useEffect(() => { document.title = "Sistema AD Jacaré" }, [])

  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [atualizacao, setAtualizacao] = useState(null)
  const [baixandoAtualizacao, setBaixandoAtualizacao] = useState(false)

  async function login(e) {
    e.preventDefault()
    if (loginLoading) return

    setLoginLoading(true)

    try {
      const profile = await signInRolling(email, senha)
      setUser(profile)
      setSenha("")
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível entrar.")
    } finally {
      setLoginLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    restoreRollingSession().then((profile) => {
      if (active && profile) setUser(profile)
    })

    const interval = setInterval(async () => {
      if (!isLocalSessionExpired()) return

      await signOutRolling()
      if (active) setUser(null)
    }, 10000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    verificarAtualizacaoDoApp()
      .then(setAtualizacao)
      .catch((error) =>
        console.error("Não foi possível verificar atualizações:", error)
      )
  }, [])

  useEffect(() => {
    if (!user || user?.primeiro_acesso === true) return undefined

    let limpar = () => {}
    let ativo = true

    ativarPushNotifications()
      .then((cleanup) => {
        if (ativo) limpar = cleanup
        else cleanup()
      })
      .catch((error) => console.error("Notificações indisponíveis:", error))

    return () => {
      ativo = false
      limpar()
    }
  }, [user?.id, user?.primeiro_acesso])

  async function logout() {
    await desativarPushDesteUsuario()
    setUser(null)
    await signOutRolling()
  }

  async function atualizarAplicativo() {
    if (!atualizacao?.url || baixandoAtualizacao) return

    setBaixandoAtualizacao(true)
    try {
      await baixarAtualizacaoDoApp(atualizacao.url)
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir a atualização."
      )
    } finally {
      setBaixandoAtualizacao(false)
    }
  }

  const primeiroAcesso = user?.primeiro_acesso === true

  const podeVerEscala = temPermissao(user, "escala")
  const podeVerSenhas = temPermissao(user, "senhasAplicativos")
  const podeVerCustosFixos = temPermissao(user, "custosFixos")
  const podeVerMembros = temPermissao(user, "membros")

  return (
    <>
      <AppFeedback />
      {atualizacao && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Atualização disponível"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            background: "rgba(0, 0, 0, 0.72)",
          }}
        >
          <div
            style={{
              width: "min(440px, 100%)",
              borderRadius: "18px",
              padding: "24px",
              color: "#0d2445",
              background: "#fff",
              boxShadow: "0 24px 70px rgba(0, 0, 0, 0.35)",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>⬆️</div>
            <h2 style={{ margin: "0 0 8px" }}>Nova atualização disponível</h2>
            <p style={{ margin: "0 0 8px", lineHeight: 1.5 }}>
              Versão {atualizacao.versaoNova} disponível. Você está usando a
              versão {atualizacao.versaoAtual}.
            </p>
            {atualizacao.descricao && (
              <p
                style={{
                  maxHeight: "120px",
                  margin: "12px 0",
                  overflow: "auto",
                  whiteSpace: "pre-line",
                  color: "#52647d",
                  lineHeight: 1.45,
                }}
              >
                {atualizacao.descricao}
              </p>
            )}
            <button
              type="button"
              onClick={atualizarAplicativo}
              disabled={baixandoAtualizacao}
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "13px 18px",
                border: 0,
                borderRadius: "12px",
                color: "#fff",
                background: "#0d2445",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {baixandoAtualizacao ? "Abrindo atualização..." : "Atualizar agora"}
            </button>
            <button
              type="button"
              onClick={() => setAtualizacao(null)}
              style={{
                width: "100%",
                marginTop: "8px",
                padding: "10px",
                border: 0,
                color: "#52647d",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Lembrar depois
            </button>
          </div>
        </div>
      )}

      <Suspense fallback={<CarregandoPagina />}>
      <Routes>
      <Route path="/portal-aluno/*" element={<PortalAluno />} />
      <Route path="/cadastro-professor" element={<CadastroProfessorPublico />} />

      {!user ? (
        <Route
          path="*"
          element={
            <div className="login-page">
              <div className="login-card">
                <div
                  className="logo-title"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "20px",
                    marginBottom: "30px",
                  }}
                >
                  <img
                    src="/logo.png"
                    alt="Logo"
                    style={{
                      width: "90px",
                      height: "90px",
                      objectFit: "contain",
                    }}
                  />

                  <h2 style={{ margin: 0, lineHeight: "1.2" }}>
                    Sistema
                    <br />
                    ADJACARÉ
                  </h2>
                </div>

                <form onSubmit={login}>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />

                  <input
                    type="password"
                    placeholder="Senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="current-password"
                    required
                  />

                  <button className="login-btn" disabled={loginLoading}>
                    {loginLoading ? "Entrando..." : "Entrar"}
                  </button>
                </form>
              </div>
            </div>
          }
        />
      ) : primeiroAcesso ? (
        <Route
          path="*"
          element={
            <div className="dashboard">
              <Routes>
                <Route
                  path="/trocar-senha"
                  element={<TrocarSenha user={user} setUser={setUser} />}
                />

                <Route path="*" element={<Navigate to="/trocar-senha" replace />} />
              </Routes>
            </div>
          }
        />
      ) : (
        <Route
          path="*"
          element={
            <div className="dashboard">
              <header className="app-topbar">
                <button
                  className="app-topbar__menu"
                  onClick={() => setMenuOpen(true)}
                  aria-label="Abrir menu"
                >
                  <span>☰</span>
                  <b>Menu</b>
                </button>

                <div className="app-topbar__marca">
                  <img src="/logo.png" alt="" />
                  <div><strong>Sistema ADJACARÉ</strong><span>Portal interno da igreja</span></div>
                </div>

                <div className="app-topbar__acoes">
                  <div className="app-topbar__usuario">
                    <span>{(user.nome || "U").charAt(0).toUpperCase()}</span>
                    <div><strong>{user.nome}</strong><small>{user.role}</small></div>
                  </div>

                  <button
                    onClick={logout}
                    className="app-topbar__sair"
                  >
                    <span>↪</span><b>Sair</b>
                  </button>
                </div>
              </header>

              <Sidebar user={user} open={menuOpen} setOpen={setMenuOpen} onLogout={logout} />

              <Routes>
                <Route path="/" element={<Dashboard user={user} />} />
                <Route path="/dashboard" element={<Dashboard user={user} />} />
                <Route path="/pedidos" element={<Pedidos user={user} />} />
                <Route path="/kanban" element={<KanbanPedidos user={user} />} />
                <Route path="/solicitacoes" element={<Solicitacoes />} />
                <Route path="/agenda" element={<Agenda user={user} />} />
                <Route path="/avisos" element={<Avisos user={user} />} />
                <Route path="/usuarios" element={<Usuarios user={user} />} />
                <Route path="/ebd/financeiro" element={<EBDFinanceiro user={user} />} />
                <Route path="/whatsapp" element={<WhatsApp user={user} />} />

                <Route
                  path="/trocar-senha"
                  element={<TrocarSenha user={user} setUser={setUser} />}
                />

                <Route
                  path="/escala-midia"
                  element={
                    podeVerEscala ? (
                      <EscalaMidia user={user} />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />

                <Route
                  path="/senhas-aplicativos"
                  element={
                    podeVerSenhas ? (
                      <SenhasAplicativos user={user} />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />

                <Route
                  path="/custos-fixos"
                  element={
                    podeVerCustosFixos ? (
                      <CustosFixos user={user} />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />

                <Route
                  path="/ebd/solicitacoes-professores"
                  element={<EBDSolicitacoesProfessores user={user} />}
                />

                <Route
                  path="/ebd/solicitacoes-professores/:id"
                  element={<EBDSolicitacaoProfessor user={user} />}
                />

                <Route path="/ebd" element={<EBD user={user} />} />
                <Route path="/ebd/alunos" element={<EBDAlunos user={user} />} />
                <Route path="/ebd/chamada" element={<EBDChamadaComOferta user={user} />} />
                <Route path="/ebd/trimestres" element={<EBDTrimestres user={user} />} />
                <Route path="/ebd/relatorios" element={<EBDRelatorios user={user} />} />
                <Route path="/ebd/relatorio-ofertas" element={<EBDRelatorioOfertas user={user} />} />
                <Route path="/ebd/dashboard" element={<EBDDashboard user={user} />} />
                <Route
                  path="/membros"
                  element={
                    podeVerMembros ? (
                      <Membros user={user} />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />
              </Routes>
            </div>
          }
        />
      )}
      </Routes>
      </Suspense>
    </>
  )
}
