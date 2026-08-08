import { useEffect, useState } from "react"

export default function AppDialogos() {
  const [dialogo, setDialogo] = useState(null)
  const [texto, setTexto] = useState("")

  useEffect(() => {
    function abrir(event) {
      setDialogo(event.detail)
      setTexto(event.detail.valorInicial || "")
    }
    window.addEventListener("app:dialogo", abrir)
    return () => window.removeEventListener("app:dialogo", abrir)
  }, [])

  if (!dialogo) return null

  function concluir(valor) {
    dialogo.resolver(valor)
    setDialogo(null)
  }

  return (
    <div className="app-feedback" role="dialog" aria-modal="true" aria-labelledby="app-dialogo-titulo">
      <article className="app-feedback__card aviso app-dialogo__card">
        <span className="app-feedback__icone">!</span>
        <div>
          <small>SISTEMA ADJACARÉ</small>
          <h2 id="app-dialogo-titulo">{dialogo.titulo}</h2>
          <p>{dialogo.mensagem}</p>
        </div>
        {dialogo.tipo === "texto" && (
          <input autoFocus value={texto} onChange={(event) => setTexto(event.target.value)} />
        )}
        <div className="app-confirmacao__acoes">
          <button type="button" className="secundario" onClick={() => concluir(dialogo.tipo === "texto" ? null : false)}>Cancelar</button>
          <button type="button" onClick={() => concluir(dialogo.tipo === "texto" ? texto : true)}>Confirmar</button>
        </div>
      </article>
    </div>
  )
}
