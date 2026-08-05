import { useEffect, useState } from "react"

function tipoDaMensagem(mensagem) {
  const texto = mensagem.toLocaleLowerCase("pt-BR")
  if (texto.includes("erro") || texto.includes("não foi possível") || texto.includes("inválid")) return "erro"
  if (texto.includes("atenção") || texto.includes("obrigat") || texto.includes("preencha")) return "aviso"
  return "sucesso"
}

export default function AppFeedback() {
  const [fila, setFila] = useState([])
  const atual = fila[0]

  useEffect(() => {
    const alertOriginal = window.alert

    function adicionar(valor) {
      const mensagem = String(valor ?? "")
      setFila((anterior) => [
        ...anterior,
        {
          id: `${Date.now()}-${Math.random()}`,
          mensagem,
          tipo: tipoDaMensagem(mensagem),
        },
      ])
    }

    window.alert = adicionar
    const receberFeedback = (event) => adicionar(event.detail)
    window.addEventListener("app:feedback", receberFeedback)

    return () => {
      window.alert = alertOriginal
      window.removeEventListener("app:feedback", receberFeedback)
    }
  }, [])

  function fechar() {
    setFila((anterior) => anterior.slice(1))
  }

  if (!atual) return null

  const configuracao = {
    sucesso: { icone: "✓", titulo: "Tudo certo" },
    aviso: { icone: "!", titulo: "Atenção" },
    erro: { icone: "×", titulo: "Não foi possível concluir" },
  }[atual.tipo]

  return (
    <div className="app-feedback" role="dialog" aria-modal="true" aria-live="assertive">
      <article className={`app-feedback__card ${atual.tipo}`}>
        <span className="app-feedback__icone">{configuracao.icone}</span>
        <div>
          <small>SISTEMA ADJACARÉ</small>
          <h2>{configuracao.titulo}</h2>
          <p>{atual.mensagem}</p>
        </div>
        <button type="button" onClick={fechar}>Entendi</button>
      </article>
    </div>
  )
}
