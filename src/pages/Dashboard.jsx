import "./dashboard.css"
import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export default function Dashboard({ user }) {

  const navigate = useNavigate()

  const [avisos, setAvisos] = useState([])

  useEffect(() => {
    carregarAvisos()
  }, [])

  async function carregarAvisos() {

    const { data, error } = await supabase
      .from("avisos")
      .select("*")
      .order("fixado", { ascending: false })
      .order("data", { ascending: false })
      .limit(3)

    if (error) {
      console.log("Erro ao carregar avisos:", error)
      return
    }

    setAvisos(data || [])

  }

  return (

    <main className="main">

      <h1 className="title">
        Bem-vindo ao Sistema Geral
      </h1>

      <h2 className="subtitle">
        da Assembleia de Deus – Bairro Jacaré
      </h2>

      <hr className="divider" />

      {/* AVISOS */}

      {avisos.length > 0 && (

        <div style={{
          background: "#fef3c7",
          border: "1px solid #f59e0b",
          borderRadius: "10px",
          padding: "18px",
          marginBottom: "25px"
        }}>

          <h3 style={{
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}>
            📢 Avisos da Igreja
          </h3>

          {avisos.map(a => (

            <div key={a.id} style={{
              padding: "10px 0",
              borderTop: "1px solid #fde68a"
            }}>

              <strong>

                {a.urgente && "🔴 URGENTE • "}
                {a.fixado && "📌 IMPORTANTE • "}

                {a.titulo}

              </strong>

              <p style={{ marginTop: "4px" }}>
                {a.mensagem}
              </p>

            </div>

          ))}

        </div>

      )}

      <p className="description">
        Para iniciar, abra o <span className="menu-highlight">Menu</span> localizado no canto superior esquerdo e escolha a opção desejada.
      </p>

      <hr className="divider" />

      <h2 className="section-title">
        Solicitações
      </h2>

      <div className="dashboard-cards">

        <div
          className="dashboard-card"
          onClick={() => navigate("/pedidos")}
          style={{ cursor: "pointer" }}
        >
          <h3>Pedidos de Arte</h3>
          <p>Visualizar e gerenciar pedidos enviados.</p>
        </div>

        <div
          className="dashboard-card"
          onClick={() => navigate("/agenda")}
          style={{ cursor: "pointer" }}
        >
          <h3>Agenda da Igreja</h3>
          <p>Eventos e atividades programadas.</p>
        </div>

        <div
          className="dashboard-card"
          onClick={() => navigate("/avisos")}
          style={{ cursor: "pointer" }}
        >
          <h3>Avisos Internos</h3>
          <p>Comunicados importantes para os ministérios.</p>
        </div>

      </div>

    </main>

  )

}
