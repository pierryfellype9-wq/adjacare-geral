import { Link } from "react-router-dom"

export default function SecretariaAbas({ ativa }) {
  return (
    <nav className="secretaria-abas" aria-label="Áreas da Secretaria">
      <Link
        className={ativa === "geral" ? "ativa" : ""}
        to="/secretaria"
        aria-current={ativa === "geral" ? "page" : undefined}
      >
        Geral
      </Link>
      <Link
        className={ativa === "membros" ? "ativa" : ""}
        to="/membros"
        aria-current={ativa === "membros" ? "page" : undefined}
      >
        Membros
      </Link>
      <span title="Será configurado nas próximas etapas">Movimentações</span>
      <span title="Será configurado nas próximas etapas">Documentos</span>
    </nav>
  )
}
