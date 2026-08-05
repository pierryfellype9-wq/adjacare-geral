import { NavLink } from "react-router-dom"

const ABAS = [
  ["geral", "/secretaria", "Geral"],
  ["membros", "/membros", "Membros"],
  ["movimentacoes", "/secretaria/movimentacoes", "Movimentações"],
  ["documentos", "/secretaria/documentos", "Documentos"],
  ["datas", "/secretaria/datas", "Datas"],
]

export default function SecretariaAbas({ ativa }) {
  return (
    <nav className="secretaria-abas" aria-label="Áreas da Secretaria">
      {ABAS.map(([id, destino, titulo]) => (
        <NavLink
          className={ativa === id ? "ativa" : ""}
          to={destino}
          aria-current={ativa === id ? "page" : undefined}
          key={id}
        >
          {titulo}
        </NavLink>
      ))}
    </nav>
  )
}
