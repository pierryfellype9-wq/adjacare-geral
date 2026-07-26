import { useNavigate } from "react-router-dom"

export default function Sidebar({ open, setOpen, user }) {
  const navigate = useNavigate()

  function navegar(pagina) {
    navigate(pagina)
    setOpen(false)
  }

  const podeVerEscala =
    user?.role === "Administrador" ||
    user?.role === "Dirigente" ||
    user?.role === "Mídia"

  const podeVerSenhas =
    user?.role === "Administrador" ||
    user?.role === "Mídia"

  const podeVerCustosFixos =
    user?.role === "Administrador" ||
    user?.role === "Mídia" ||
    user?.role === "Dirigente"

  const podeVerWhatsApp =
    user?.role === "Administrador" ||
    user?.role === "Dirigente" ||
    user?.role === "Mídia" ||
    user?.role === "Secretaria" ||
    user?.role === "Suporte" ||
    user?.role === "TI" ||
    user?.role === "Sonoplastia" ||
    user?.role === "Projeção"

  const podeVerEBD = true
  return (
    <div className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-header">
        <div>
          Sistema Geral
          <br />
          ADJACARÉ
        </div>

        <span
          style={{ cursor: "pointer" }}
          onClick={() => setOpen(false)}
        >
          ←
        </span>
      </div>

      <div className="sidebar-scroll">
        <div className="menu-item" onClick={() => navegar("/dashboard")}>
          Início
        </div>

        <div className="menu-item" onClick={() => navegar("/pedidos")}>
          Pedidos
        </div>

        {podeVerWhatsApp && (
          <div className="menu-item" onClick={() => navegar("/whatsapp")}>
            WhatsApp
          </div>
        )}

        {podeVerEscala && (
          <div className="menu-item" onClick={() => navegar("/escala-midia")}>
            Escala da Mídia
          </div>
        )}

        {podeVerEBD && (
          <div className="menu-item" onClick={() => navegar("/ebd")}>
            EBD
          </div>
        )}

        <div className="menu-item" onClick={() => navegar("/agenda")}>
          Agenda
        </div>

        <div className="menu-item" onClick={() => navegar("/avisos")}>
          Avisos
        </div>

        <div className="menu-item" onClick={() => navegar("/usuarios")}>
          Usuários
        </div>

        <div className="menu-item" onClick={() => navegar("/trocar-senha")}>
          Alterar Senha
        </div>

        {podeVerSenhas && (
          <div className="menu-item" onClick={() => navegar("/senhas-aplicativos")}>
            Senhas de Aplicativos
          </div>
        )}

        {podeVerCustosFixos && (
          <div className="menu-item" onClick={() => navegar("/custos-fixos")}>
            Custos Fixos
          </div>
        )}
      </div>
    </div>
  )
}
