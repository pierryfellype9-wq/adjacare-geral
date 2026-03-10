import "./dashboard.css"

export default function Dashboard({user}){

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

        <div className="dashboard-card">
          <h3>Pedidos de Arte</h3>
          <p>Visualizar e gerenciar pedidos enviados.</p>
        </div>

        <div className="dashboard-card">
          <h3>Agenda da Igreja</h3>
          <p>Eventos e atividades programadas.</p>
        </div>

        <div className="dashboard-card">
          <h3>Avisos Internos</h3>
          <p>Comunicados importantes para os ministérios.</p>
        </div>

      </div>

    </main>

  )

}