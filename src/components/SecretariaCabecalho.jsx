import SecretariaAbas from "./SecretariaAbas"
import "../pages/Secretaria.css"

export default function SecretariaCabecalho({
  ativa,
  titulo,
  descricao,
  acao,
}) {
  return (
    <>
      <header className="secretaria-topo">
        <div>
          <span>SECRETARIA</span>
          <h1>{titulo}</h1>
          <p>{descricao}</p>
        </div>
        {acao}
      </header>
      <SecretariaAbas ativa={ativa} />
    </>
  )
}
