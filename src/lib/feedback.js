export function notificar(mensagem) {
  window.dispatchEvent(new CustomEvent("app:feedback", { detail: String(mensagem) }))
}
