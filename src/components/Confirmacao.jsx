export default function Confirmacao({ aberto, titulo, mensagem, confirmar, cancelar }) {
  if (!aberto) return null

  return (
    <div className="app-feedback" role="dialog" aria-modal="true" aria-labelledby="confirmacao-titulo">
      <article className="app-feedback__card aviso app-confirmacao__card">
        <span className="app-feedback__icone">!</span>
        <div>
          <small>SISTEMA ADJACARÉ</small>
          <h2 id="confirmacao-titulo">{titulo}</h2>
          <p>{mensagem}</p>
        </div>
        <div className="app-confirmacao__acoes">
          <button type="button" className="secundario" onClick={cancelar}>Cancelar</button>
          <button type="button" onClick={confirmar}>Confirmar</button>
        </div>
      </article>
    </div>
  )
}
