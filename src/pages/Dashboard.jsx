import "./dashboard.css"
import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export default function Dashboard({user}){

  const navigate = useNavigate()

  const [avisos,setAvisos] = useState([])

  useEffect(()=>{
    carregarAvisos()
  },[])

  async function carregarAvisos(){

    const { data } = await supabase
      .from("avisos")
      .select("*")
      .order("fixado",{ascending:false})
      .order("data",{ascending:false})
      .limit(3)

    setAvisos(data || [])

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

      {/* AVISOS NO TOPO */}

      {avisos.length > 0 && (

        <div style={{
          marginBottom:"25px",
          display:"grid",
          gap:"10px"
        }}>

          {avisos.map(a => (

            <div key={a.id} style={{
              padding:"14px",
              borderRadius:"10px",
              background: a.urgente ? "#fee2e2" : "#f1f5f9",
              border: a.urgente ? "1px solid #ef4444" : "1px solid #e5e7eb"
            }}>

              <strong>

                {a.urgente && "🔴 AVISO URGENTE "}
                {a.fixado && "📌 AVISO "}

                {a.titulo}

              </strong>

              <p style={{marginTop:"5px"}}>
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
