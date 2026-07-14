import { useEffect, useState } from "react"
import "./Tetelestai.css"
import ComingSoon from "./ComingSoon"
import { supabaseRest } from "./site/loja/supabase-rest"
import SiteInicial from "./site/page"
import Tema from "./site/tema/page"
import Programacao from "./site/programacao/page"
import Playlist from "./site/playlist/page"
import Fotos from "./site/fotos/page"
import Localizacao from "./site/localizacao/page"
import Camisetas from "./site/camisetas/page"
import Loja from "./site/loja/page"

export default function TetelestaiApp() {
  const [publicacao, setPublicacao] = useState(null)

  useEffect(() => {
    supabaseRest("loja_configuracoes?chave=eq.tetelestai-2026&select=site_publicado,lancamento_em&limit=1")
      .then((dados) => setPublicacao(dados[0] || { site_publicado:false, lancamento_em:null }))
      .catch(() => setPublicacao({ site_publicado:false, lancamento_em:null }))
  }, [])

  if (!publicacao) return <div className="tetelestai-root tetelestai-loading" />

  const lancamentoAtingido = publicacao.lancamento_em && new Date(publicacao.lancamento_em).getTime() <= Date.now()
  if (!publicacao.site_publicado && !lancamentoAtingido) return <div className="tetelestai-root"><ComingSoon lancamento={publicacao.lancamento_em} /></div>

  let path = window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/"
  if (path.startsWith("/site")) path = path.slice(5) || "/"

  const paginas = {
    "/": SiteInicial,
    "/site": SiteInicial,
    "/tema": Tema,
    "/programacao": Programacao,
    "/convidados": Programacao,
    "/playlist": Playlist,
    "/fotos": Fotos,
    "/localizacao": Localizacao,
    "/camisetas": Camisetas,
    "/loja": Loja,
  }
  const Pagina = paginas[path] || SiteInicial
  return <div className="tetelestai-root"><Pagina /></div>
}
