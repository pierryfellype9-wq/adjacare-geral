export function notificar(mensagem) {
  window.dispatchEvent(new CustomEvent("app:feedback", { detail: String(mensagem) }))
}

function abrirDialogo(configuracao) {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent("app:dialogo", {
      detail: { ...configuracao, resolver: resolve },
    }))
  })
}

export function confirmarAcao(mensagem, titulo = "Confirmar ação?") {
  return abrirDialogo({ tipo: "confirmacao", titulo, mensagem })
}

export function solicitarTexto(mensagem, valorInicial = "", titulo = "Informe os dados") {
  return abrirDialogo({ tipo: "texto", titulo, mensagem, valorInicial })
}
