import { useState } from "react"

import Dashboard from "./pages/Dashboard"
import Pedidos from "./pages/Pedidos"
import Solicitacoes from "./pages/Solicitacoes"
import Agenda from "./pages/Agenda"
import Avisos from "./pages/Avisos"
import TrocarSenha from "./pages/trocarSenha"
import Usuarios from "./pages/Usuarios"
import KanbanPedidos from "./pages/KanbanPedidos"

import Sidebar from "./components/Sidebar"

import { supabase } from "./lib/supabase"

export default function App(){

  const [email,setEmail] = useState("")
  const [senha,setSenha] = useState("")
  const [user,setUser] = useState(null)

  const [page,setPage] = useState("dashboard")
  const [menuOpen,setMenuOpen] = useState(false)

  async function login(e){
    e.preventDefault()

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single()

    if(error || !data){
      alert("Usuário não encontrado")
      return
    }

    if(data.senha !== senha){
      alert("Senha incorreta")
      return
    }

    setUser(data)
  }
  if(page === "trocarSenha"){
  return (
    <TrocarSenha
      setPage={setPage}
    />
  )
}

  if(!user){
    return (
      <div className="login-page">

        <div className="login-card">

          <div className="logo-title">
            <img src="/logo.png" alt="Logo"/>
            <h2>Sistema Geral ADJACARÉ</h2>
          </div>

          <form onSubmit={login}>

            <input
              placeholder="Email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={e=>setSenha(e.target.value)}
            />

            <button className="login-btn">
  Entrar
</button>

<button
  type="button"
  className="forgot-btn"
  onClick={() => setPage("trocarSenha")}
>
  Esqueci minha senha
</button>

          </form>

        </div>

      </div>
    )
  }

  if(page === "trocarSenha"){
    return (
      <TrocarSenha
  setPage={setPage}
/>
    )
  }

  return (
    <div className="dashboard">

      <header className="topbar">

        <button
          className="menu-btn"
          onClick={()=>setMenuOpen(true)}
        >
          ☰ Menu
        </button>

        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>

          <div className="user-box">
            {user.nome} • {user.role}
          </div>

          <button
            onClick={()=>setUser(null)}
            className="logout-btn"
          >
            Sair
          </button>

        </div>

      </header>

      <Sidebar
        setPage={setPage}
        open={menuOpen}
        setOpen={setMenuOpen}
      />

      {page === "dashboard" && <Dashboard user={user}/>}

      {page === "pedidos" && <Pedidos user={user}/>}

      {page === "kanban" && <KanbanPedidos user={user}/>}

      {page === "solicitacoes" && <Solicitacoes/>}

      {page === "agenda" && <Agenda/>}

      {page === "avisos" && <Avisos/>}

      {page === "usuarios" && <Usuarios user={user}/>}

    </div>
  )
}