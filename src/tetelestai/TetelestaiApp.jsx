import { useEffect, useRef, useState } from "react"
import "./Tetelestai.css"
import ComingSoon from "./ComingSoon"
import { supabaseRest } from "./site/loja/supabase-rest"
import SiteInicial from "./site/page"
import Tema from "./site/tema/page"
import Programacao from "./site/programacao/page"
import Playlist from "./site/playlist/page"
import Fotos from "./site/fotos/page"
import Localizacao from "./site/localizacao/page"

function ScrollCrown() {
  const crownRef = useRef(null)

  useEffect(() => {
    const crown = crownRef.current
    if (!crown) return

    let frame = 0
    const updateCrown = () => {
      frame = 0
      const rotation = window.scrollY * 0.035
      const drift = Math.sin(window.scrollY / 520) * 14
      const revealStart = window.innerHeight * 0.58
      const opacity = Math.max(0.022, Math.min(0.045, 0.022 + Math.max(0, window.scrollY - revealStart) / 420 * 0.023))
      crown.style.setProperty("--crown-rotation", `${rotation}deg`)
      crown.style.setProperty("--crown-drift", `${drift}px`)
      crown.style.setProperty("--crown-opacity", String(opacity))
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateCrown)
    }

    updateCrown()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div ref={crownRef} className="scroll-crown" aria-hidden="true">
      <div className="scroll-crown-mask">
        <img src="/tetelestai-oficial/logo-oficial-clara.png" alt="" />
      </div>
    </div>
  )
}

export default function TetelestaiApp() {
  const [publicacao, setPublicacao] = useState(null)
  const preview = window.location.pathname.toLowerCase().startsWith("/site-preview")
  let usuarioPreview = null
  try { usuarioPreview = JSON.parse(localStorage.getItem("user") || "null") } catch { usuarioPreview = null }
  const previewAutorizado = preview && ["Administrador", "Dirigente"].includes(usuarioPreview?.role)

  useEffect(() => {
    document.title = "Tetelestai 2026 | AD Jacaré"
    let favicon = document.querySelector("link[rel='icon']")
    if (!favicon) { favicon = document.createElement("link"); favicon.rel = "icon"; document.head.appendChild(favicon) }
    favicon.href = "/logo-tetelestai-provisoria.svg"
    supabaseRest("loja_configuracoes?chave=eq.tetelestai-2026&select=site_publicado,lancamento_em&limit=1")
      .then((dados) => setPublicacao(dados[0] || { site_publicado:false, lancamento_em:null }))
      .catch(() => setPublicacao({ site_publicado:false, lancamento_em:null }))
  }, [])

  if (!publicacao) return <div className="tetelestai-root tetelestai-loading" />

  const lancamentoAtingido = publicacao.lancamento_em && new Date(publicacao.lancamento_em).getTime() <= Date.now()
  if (preview && !previewAutorizado) return <div className="tetelestai-root preview-negado"><div><h1>Pré-visualização restrita</h1><p>Entre no Sistema AD Jacaré como Administrador ou Dirigente antes de acessar este endereço.</p><a href="/">Voltar ao sistema</a></div></div>
  if (!previewAutorizado && !publicacao.site_publicado && !lancamentoAtingido) return <div className="tetelestai-root"><ComingSoon lancamento={publicacao.lancamento_em} /></div>

  const favicon = document.querySelector("link[rel='icon']")
  if (favicon) favicon.href = "/tetelestai-oficial/logo-oficial-clara.png"

  let path = window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/"
  if (path.startsWith("/site-preview")) path = path.slice(13) || "/"
  else if (path.startsWith("/site")) path = path.slice(5) || "/"

  const paginas = {
    "/": SiteInicial,
    "/site": SiteInicial,
    "/tema": Tema,
    "/programacao": Programacao,
    "/convidados": Programacao,
    "/playlist": Playlist,
    "/fotos": Fotos,
    "/localizacao": Localizacao,
  }
  const Pagina = paginas[path] || SiteInicial
  return <div className="tetelestai-root"><ScrollCrown /><Pagina /></div>
}
