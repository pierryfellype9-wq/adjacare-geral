import "./dashboard.css"
import { useNavigate } from "react-router-dom"

export default function Dashboard({user}){

  const navigate = useNavigate()

  return(

    <main className="main">

      <h1 className="title">
        Bem-vindo ao Sistema Geral
      </h1>

      <h2 className="subtitle">
        da Assembleia de Deus – Bairro Jacaré
      </h2>

      <hr className="divider"/>

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
