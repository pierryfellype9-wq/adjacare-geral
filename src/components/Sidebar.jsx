import { NavLink } from "react-router-dom"
import { temPermissao } from "../lib/permissions"

const ICONES = {
  inicio: "M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3v-9.5Z",
  pedidos: "M4 5h16v14H4V5Zm4 4h8M8 13h5",
  whatsapp: "M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z",
  escala: "M6 3v3m12-3v3M4 8h16v12H4V8Zm4 4h3m2 0h3m-8 4h3",
  ebd: "M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Zm16 0A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z",
  agenda: "M6 3v3m12-3v3M4 8h16v12H4V8Zm4 4h8m-8 4h5",
  avisos: "M12 3a6 6 0 0 0-6 6v3l-2 3v1h16v-1l-2-3V9a6 6 0 0 0-6-6Zm-2 15h4",
  usuarios: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a4 4 0 0 1 0 8",
  membros: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9v-2a7 7 0 0 1 14 0v2M3 21h18",
  senha: "M7 10V7a5 5 0 0 1 10 0v3m-11 0h12v11H6V10Zm6 4v3",
  cofre: "M5 4h14v16H5V4Zm4 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0Zm3 3v3",
  custos: "M3 6h18v13H3V6Zm2 3v8h14V9H5Zm7 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM6 3h12v2H6V3Z",
}

function Icone({ nome }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONES[nome]} />
    </svg>
  )
}

function Item({ to, icon, children, setOpen }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `app-menu__item ${isActive ? "ativo" : ""}`}
      onClick={() => setOpen(false)}
    >
      <span className="app-menu__icone"><Icone nome={icon} /></span>
      <span>{children}</span>
      <b>›</b>
    </NavLink>
  )
}

export default function Sidebar({ open, setOpen, user, onLogout }) {
  return (
    <>
      <button
        type="button"
        className={`app-sidebar__overlay ${open ? "aberto" : ""}`}
        aria-label="Fechar menu"
        onClick={() => setOpen(false)}
      />

      <aside className={`app-sidebar ${open ? "open" : ""}`}>
        <header className="app-sidebar__header">
          <div className="app-sidebar__logo">
            <img src="/logo.png" alt="" />
            <div><strong>Sistema Geral</strong><span>ADJACARÉ</span></div>
          </div>
          <button type="button" aria-label="Fechar menu" onClick={() => setOpen(false)}>×</button>
        </header>

        <div className="app-sidebar__perfil">
          <span>{(user?.nome || "U").charAt(0).toUpperCase()}</span>
          <div><strong>{user?.nome || "Usuário"}</strong><small>{user?.role || "Departamento"}</small></div>
        </div>

        <nav className="app-sidebar__navegacao">
          <section>
            <h2>GERAL</h2>
            <Item to="/dashboard" icon="inicio" setOpen={setOpen}>Início</Item>
            <Item to="/pedidos" icon="pedidos" setOpen={setOpen}>Pedidos</Item>
            <Item to="/agenda" icon="agenda" setOpen={setOpen}>Agenda</Item>
            <Item to="/avisos" icon="avisos" setOpen={setOpen}>Avisos</Item>
          </section>

          {(temPermissao(user, "whatsapp") || temPermissao(user, "escala")) && (
            <section>
              <h2>COMUNICAÇÃO</h2>
              {temPermissao(user, "whatsapp") && <Item to="/whatsapp" icon="whatsapp" setOpen={setOpen}>WhatsApp</Item>}
              {temPermissao(user, "escala") && <Item to="/escala-midia" icon="escala" setOpen={setOpen}>Escala da Mídia</Item>}
            </section>
          )}

          <section>
            <h2>ENSINO</h2>
            <Item to="/ebd" icon="ebd" setOpen={setOpen}>Escola Bíblica</Item>
          </section>

          <section>
            <h2>ADMINISTRAÇÃO</h2>
            {temPermissao(user, "membros") && <Item to="/membros" icon="membros" setOpen={setOpen}>Membros</Item>}
            <Item to="/usuarios" icon="usuarios" setOpen={setOpen}>Usuários</Item>
            <Item to="/trocar-senha" icon="senha" setOpen={setOpen}>Alterar senha</Item>
            {temPermissao(user, "senhasAplicativos") && <Item to="/senhas-aplicativos" icon="cofre" setOpen={setOpen}>Senhas de aplicativos</Item>}
            {temPermissao(user, "custosFixos") && <Item to="/custos-fixos" icon="custos" setOpen={setOpen}>Custos fixos</Item>}
          </section>
        </nav>

        <footer className="app-sidebar__footer">
          <button type="button" onClick={onLogout}><span>↪</span> Sair do sistema</button>
          <small>Sistema ADJACARÉ • v1.1.0</small>
        </footer>
      </aside>
    </>
  )
}
