import { lazy, Suspense, useState, useEffect } from "react"
import { Routes, Route, Navigate } from "react-router-dom"

import Dashboard from "./pages/Dashboard"
import Pedidos from "./pages/Pedidos"
import Solicitacoes from "./pages/Solicitacoes"
import Agenda from "./pages/Agenda"
import Avisos from "./pages/Avisos"
import TrocarSenha from "./pages/trocarSenha"
import Usuarios from "./pages/Usuarios"
import KanbanPedidos from "./pages/KanbanPedidos"
import EscalaMidia from "./pages/EscalaMidia"
import SenhasAplicativos from "./pages/SenhasAplicativos"
import CustosFixos from "./pages/CustosFixos"
import EBDDashboard from "./pages/EBDDashboard"
import PortalAluno from "./pages/PortalAluno"
import EBDFinanceiro from "./pages/EBDFinanceiro"
import Membros from "./pages/Membros"
import WhatsApp from "./pages/WhatsApp"

import EBD from "./pages/EBD"
import EBDAlunos from "./pages/EBDAlunos"
import EBDChamadaComOferta from "./pages/EBDChamadaComOferta"
import EBDRelatorios from "./pages/EBDRelatorios"
import EBDRelatorioOfertas from "./pages/EBDRelatorioOfertas"
import EBDTrimestres from "./pages/EBDTrimestres"
import CadastroProfessorPublico from "./pages/CadastroProfessorPublico"
import EBDSolicitacoesProfessores from "./pages/EBDSolicitacoesProfessores"
import EBDSolicitacaoProfessor from "./pages/EBDSolicitacaoProfessor"

import Sidebar from "./components/Sidebar"
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

const TetelestaiApp = lazy(() => import("./tetelestai/TetelestaiApp"))

function isTetelestaiRequest() {
  const host = window.location.hostname.toLowerCase()
  const path = window.location.pathname.toLowerCase()
  return host === "tetelestai.adjacare.org" || host.startsWith("tetelestai.") || path === "/site" || path.startsWith("/site/") || path === "/site-preview" || path.startsWith("/site-preview/")
}

export default function App() {
  if (isTetelestaiRequest()) return <Suspense fallback={<div style={{minHeight:"100vh",background:"#020306"}} />}><TetelestaiApp /></Suspense>

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

  const podeVerEscala =
    user?.role === "Administrador" ||
    user?.role === "Dirigente" ||
    user?.role === "Mídia"

  const podeVerSenhas =
    user?.role === "Administrador" ||
    user?.role === "Mídia"

  const podeVerCustosFixos =
    user?.role === "Administrador" ||
    user?.role === "Mídia" ||
    user?.role === "Dirigente"

  return (
    <>
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
              <header className="topbar">
                <button
                  className="menu-btn"
                  onClick={() => setMenuOpen(true)}
                >
                  ☰ Menu
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="user-box">
                    {user.nome} • {user.role}
                  </div>

                  <button
                    onClick={logout}
                    className="logout-btn"
                  >
                    Sair
                  </button>
                </div>
              </header>

              <Sidebar user={user} open={menuOpen} setOpen={setMenuOpen} />

              <Routes>
                <Route path="/" element={<Dashboard user={user} />} />
                <Route path="/dashboard" element={<Dashboard user={user} />} />
                <Route path="/pedidos" element={<Pedidos user={user} />} />
                <Route path="/kanban" element={<KanbanPedidos user={user} />} />
                <Route path="/solicitacoes" element={<Solicitacoes />} />
                <Route path="/agenda" element={<Agenda user={user} />} />
                <Route path="/avisos" element={<Avisos />} />
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
                <Route path="/membros" element={<Membros user={user} />} />
              </Routes>
            </div>
          }
        />
      )}
      </Routes>
    </>
  )
}
