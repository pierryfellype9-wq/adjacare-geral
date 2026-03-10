export default function Sidebar({ setPage, open, setOpen }) {

  function navegar(pagina){
    setPage(pagina)
    setOpen(false)
  }

  return (
    <div className={`sidebar ${open ? "open" : ""}`}>

      <div className="sidebar-header">
        Sistema Geral ADJACARÉ

        <span
          style={{cursor:"pointer"}}
          onClick={()=>setOpen(false)}
        >
          ←
        </span>
      </div>

      <div
        className="menu-item"
        onClick={()=>navegar("dashboard")}
      >
        Início
      </div>

      <div
        className="menu-item"
        onClick={()=>navegar("pedidos")}
      >
        Pedidos
      </div>

      <div
        className="menu-item"
        onClick={()=>navegar("agenda")}
      >
        Agenda
      </div>

      <div
        className="menu-item"
        onClick={()=>navegar("avisos")}
      >
        Avisos
      </div>

      <div
        className="menu-item"
        onClick={()=>navegar("usuarios")}
      >
        Usuários
      </div>

    </div>
  )
}