import './dashboard.css'

export default function Dashboard() {
  return (
    <div className="dashboard">

      <header className="topbar">
        <button className="menu-btn">☰ Menu</button>

        <div className="user">
          EV. PAULO - PAULOSP
        </div>
      </header>

      <main className="content">

        <h1>
          Bem-vindo ao Sistema de Membros
        </h1>

        <h2>
          da Assembleia de Deus em Jundiaí.
        </h2>

        <hr />

        <p>
          Para iniciar abra o <span className="menu-highlight">☰ Menu</span> localizado
          no canto superior esquerdo e escolha a opção desejada
        </p>

        <hr />

      </main>

    </div>
  )
}