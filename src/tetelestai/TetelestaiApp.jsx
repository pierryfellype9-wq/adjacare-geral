import "./Tetelestai.css"
import SiteInicial from "./site/page"
import Tema from "./site/tema/page"
import Programacao from "./site/programacao/page"
import Playlist from "./site/playlist/page"
import Fotos from "./site/fotos/page"
import Localizacao from "./site/localizacao/page"
import Camisetas from "./site/camisetas/page"
import Loja from "./site/loja/page"

export default function TetelestaiApp() {
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
