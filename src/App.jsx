import { useState, useEffect } from "react"
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
import EBDChamada from "./pages/EBDChamada"
import EBDRelatorios from "./pages/EBDRelatorios"
import EBDTrimestres from "./pages/EBDTrimestres"
import CadastroProfessorPublico from "./pages/CadastroProfessorPublico"
import EBDSolicitacoesProfessores from "./pages/EBDSolicitacoesProfessores"
import EBDSolicitacaoProfessor from "./pages/EBDSolicitacaoProfessor"

import Sidebar from "./components/Sidebar"
import { supabase } from "./lib/supabase"

export default function App() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  async function login(e) {
    e.preventDefault()

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single()

    if (error || !data) {
      alert("Usuário não encontrado")
      return
    }

    if (data.senha !== senha) {
      alert("Senha incorreta")
      return
    }

    setUser(data)
    localStorage.setItem("loginTime", Date.now())
    localStorage.setItem("user", JSON.stringify(data))
  }

  useEffect(() => {
    const userSalvo = localStorage.getItem("user")

    if (userSalvo) {
      setUser(JSON.parse(userSalvo))
    }

    const interval = setInterval(() => {
      const loginTime = localStorage.getItem("loginTime")
      if (!loginTime) return

      const agora = Date.now()
      const tempo = agora - loginTime
      const oitoHoras = 8 * 60 * 60 * 1000

      if (tempo > oitoHoras) {
        setUser(null)
        localStorage.removeItem("loginTime")
        localStorage.removeItem("user")
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [])

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
                    Sistema Geral
                    <br />
                    ADJACARÉ
                  </h2>
                </div>

                <form onSubmit={login}>
                  <input
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <input
                    type="password"
                    placeholder="Senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />

                  <button className="login-btn">Entrar</button>
                </form>
              </div>
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
                    onClick={() => {
                      setUser(null)
                      localStorage.removeItem("loginTime")
                      localStorage.removeItem("user")
                    }}
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
                <Route path="/agenda" element={<Agenda />} />
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
                <Route path="/ebd/chamada" element={<EBDChamada user={user} />} />
                <Route path="/ebd/trimestres" element={<EBDTrimestres user={user} />} />
                <Route path="/ebd/relatorios" element={<EBDRelatorios user={user} />} />
                <Route path="/ebd/dashboard" element={<EBDDashboard user={user} />} />
                <Route path="/membros" element={<Membros user={user} />} />
              </Routes>
            </div>
          }
        />
      )}
    </Routes>
  )
}
