import "./dashboard.css"
import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export default function Dashboard({ user }){

  const navigate = useNavigate()

  const [avisos,setAvisos] = useState([])

  useEffect(()=>{
    if(user){
      carregarAvisos()
    }
  },[user])

  async function carregarAvisos(){

    const { data, error } = await supabase
      .from("avisos")
      .select("*")
      .order("fixado",{ascending:false})
      .order("data",{ascending:false})
      .limit(5)

    if(error){
      console.log(error)
      return
    }

    const agora = new Date()

    const filtrados = (data || [])
      .filter(a => {

        const destino = (a.destino || "").toLowerCase()
        const ministerioUsuario = (user?.role || "").toLowerCase()

        const permitido =
          destino === "todos" ||
          destino === ministerioUsuario

        const naoExpirado =
          !a.expira_em ||
          new Date(a.expira_em) > agora

        return permitido && naoExpirado

      })

    setAvisos(filtrados)

  }

  return(

    <main className="main">

      <h1 className="title">
        Bem-vindo ao Sistema Geral
      </h1>

      <h2 className="subtitle">
        da Assembleia de Deus – Bairro Jacaré
      </h2>

      <hr className="divider"/>

      {/* AVISOS */}

      {avisos.length > 0 && (

        <div style={{
          background:"#fef3c7",
          border:"1px solid #f59e0b",
          borderRadius:"10px",
          padding:"18px",
          marginBottom:"25px"
        }}>

          <h3 style={{marginBottom:"10px"}}>
            📢 Avisos da Igreja
          </h3>

          {avisos.map(a => (

            <div key={a.id} style={{
              padding:"10px 0",
              borderTop:"1px solid #fde68a"
            }}>

              <strong>

                {a.urgente && "🔴 URGENTE • "}
                {a.fixado && "📌 IMPORTANTE • "}

                {a.titulo}

              </strong>

              <p style={{whiteSpace:"pre-line"}}>
                {a.mensagem}
              </p>

            </div>

          ))}

        </div>

      )}

      <p className="description">
        Para iniciar, abra o <span className="menu-highlight">Menu</span> localizado no canto superior esquerdo e escolha a opção desejada.
      </p>

      <hr className="divider"/>

      <h2 className="section-title">
        Solicitações
      </h2>

      <div className="dashboard-cards">

        <div 
          className="dashboard-card"
          onClick={() => navigate("/pedidos")}
          style={{cursor:"pointer"}}
        >
          <h3>Pedidos de Arte</h3>
          <p>Visualizar e gerenciar pedidos enviados.</p>
        </div>

        <div 
          className="dashboard-card"
          onClick={() => navigate("/agenda")}
          style={{cursor:"pointer"}}
        >
          <h3>Agenda da Igreja</h3>
          <p>Eventos e atividades programadas.</p>
        </div>

        <div 
          className="dashboard-card"
          onClick={() => navigate("/avisos")}
          style={{cursor:"pointer"}}
        >
          <h3>Avisos Internos</h3>
          <p>Comunicados importantes para os ministérios.</p>
        </div>

      </div>

    </main>

  )

}
