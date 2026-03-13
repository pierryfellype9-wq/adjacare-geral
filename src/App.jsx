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

import Sidebar from "./components/Sidebar"

import { supabase } from "./lib/supabase"

export default function App(){

  const [email,setEmail] = useState("")
  const [senha,setSenha] = useState("")
  const [user,setUser] = useState(null)

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

    localStorage.setItem("loginTime", Date.now())
  }

  // logout automático após 5 minutos
  useEffect(()=>{

    const interval = setInterval(()=>{

      const loginTime = localStorage.getItem("loginTime")

      if(!loginTime) return

      const agora = Date.now()
      const tempo = agora - loginTime

      const cincoMinutos = 5 * 60 * 1000

      if(tempo > cincoMinutos){
        setUser(null)
        localStorage.removeItem("loginTime")
      }

    },10000)

    return ()=>clearInterval(interval)

  },[])


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

          </form>

        </div>

      </div>
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
            onClick={()=>{
              setUser(null)
              localStorage.removeItem("loginTime")
            }}
            className="logout-btn"
          >
            Sair
          </button>

        </div>

      </header>

      <Sidebar
        open={menuOpen}
        setOpen={setMenuOpen}
      />

      <Routes>

        <Route path="/" element={<Dashboard user={user}/>}/>

        <Route path="/dashboard" element={<Dashboard user={user}/>}/>

        <Route path="/pedidos" element={<Pedidos user={user}/>}/>

        <Route path="/kanban" element={<KanbanPedidos user={user}/>}/>

        <Route path="/solicitacoes" element={<Solicitacoes/>}/>

        <Route path="/agenda" element={<Agenda/>}/>

        <Route path="/avisos" element={<Avisos/>}/>

        <Route path="/usuarios" element={<Usuarios user={user}/>}/>

        <Route path="/trocar-senha" element={<TrocarSenha/>}/>

        <Route path="*" element={<Navigate to="/"/>}/>

      </Routes>

    </div>

  )
}
