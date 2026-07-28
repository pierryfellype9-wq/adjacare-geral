import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"
import "./IgrejaSite.css"

const CULTOS = [
  { dia: "SEG", horario: "19h30", titulo: "Oração", detalhe: "Às 20h10, ensaio do Círculo de Oração" },
  { dia: "TER", horario: "14h", titulo: "Oração", detalhe: "Uma tarde de comunhão e busca" },
  { dia: "QUA", horario: "19h30", titulo: "Culto de Ensino", detalhe: "Palavra e crescimento espiritual" },
  { dia: "SEX", horario: "19h30", titulo: "Culto de Adoração", detalhe: "Louvor, oração e mensagem" },
  { dia: "DOM", horario: "9h", titulo: "Escola Bíblica", detalhe: "Classes para todas as idades" },
  { dia: "DOM", horario: "18h30", titulo: "Culto da Família", detalhe: "Um encontro para toda a igreja" },
]

const DEPARTAMENTOS = [
  { numero: "01", nome: "Escola Bíblica Dominical", sigla: "EBD", descricao: "Ensino bíblico para todas as idades, formando discípulos firmados na Palavra.", destaque: "Aprender" },
  { numero: "02", nome: "Jovens e Adolescentes", sigla: "J&A", descricao: "Uma geração conectada com Deus, crescendo em fé, comunhão e propósito.", destaque: "Crescer" },
  { numero: "03", nome: "Círculo de Oração", sigla: "COFEMP", descricao: "Mulheres unidas em oração, cuidado e serviço à obra de Deus.", destaque: "Interceder" },
  { numero: "04", nome: "Departamento Infantil", sigla: "INFANTIL", descricao: "Um espaço seguro e acolhedor para apresentar Jesus aos nossos pequenos.", destaque: "Cuidar" },
  { numero: "05", nome: "Mídia", sigla: "MÍDIA", descricao: "Criatividade, comunicação e tecnologia a serviço do Evangelho.", destaque: "Comunicar" },
  { numero: "06", nome: "Orquestra e Coral", sigla: "MÚSICA", descricao: "Talentos reunidos em adoração para servir à igreja e glorificar a Deus.", destaque: "Adorar" },
]

const ROTAS = {
  "/": "inicio",
  "/quem-somos": "quem-somos",
  "/onde-estamos": "onde-estamos",
  "/departamentos": "departamentos",
  "/contribuicao": "contribuicao",
}

function caminhoLimpo() {
  const path = window.location.pathname.replace(/^\/igreja(?:-preview)?/, "") || "/"
  return path !== "/" ? path.replace(/\/$/, "") : path
}

function baseDoSite() {
  const path = window.location.pathname
  if (path.startsWith("/igreja-preview")) return "/igreja-preview"
  if (path.startsWith("/igreja")) return "/igreja"
  return ""
}

function dataAviso(valor) {
  if (!valor) return "Comunicado recente"
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(new Date(valor))
    .replace(".", "")
}

function Marca() {
  return (
    <span className="igreja-marca">
      <img src="/logo.png" alt="" />
      <span><b>ASSEMBLEIA DE DEUS</b><strong>AD JACARÉ</strong></span>
    </span>
  )
}

function IconeSeta() {
  return <span aria-hidden="true">↗</span>
}

export default function IgrejaSite() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [pagina, setPagina] = useState(() => ROTAS[caminhoLimpo()] || "inicio")
  const [avisos, setAvisos] = useState([])
  const base = useMemo(baseDoSite, [])

  useEffect(() => {
    const voltar = () => {
      setPagina(ROTAS[caminhoLimpo()] || "inicio")
      window.scrollTo(0, 0)
    }
    window.addEventListener("popstate", voltar)
    return () => window.removeEventListener("popstate", voltar)
  }, [])

  useEffect(() => {
    const titulos = {
      inicio: "AD Jacaré | Igreja Assembleia de Deus",
      "quem-somos": "Quem Somos | AD Jacaré",
      "onde-estamos": "Onde Estamos | AD Jacaré",
      departamentos: "Departamentos | AD Jacaré",
      contribuicao: "Contribuição | AD Jacaré",
    }
    document.title = titulos[pagina]
  }, [pagina])

  useEffect(() => {
    async function carregarAvisos() {
      const { data, error } = await supabase
        .from("avisos")
        .select("id,titulo,mensagem,data,urgente,fixado,expira_em,destino")
        .eq("destino", "Todos")
        .order("fixado", { ascending: false })
        .order("data", { ascending: false })
        .limit(3)

      if (error) return
      const agora = new Date()
      setAvisos((data || []).filter((aviso) => !aviso.expira_em || new Date(aviso.expira_em) > agora))
    }
    carregarAvisos()
  }, [])

  function ir(rota) {
    const destino = rota === "/" ? (base || "/") : `${base}${rota}`
    window.history.pushState({}, "", destino)
    setPagina(ROTAS[rota] || "inicio")
    setMenuAberto(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const LinkInterno = ({ rota, children, className = "" }) => (
    <a
      className={className}
      href={rota === "/" ? (base || "/") : `${base}${rota}`}
      onClick={(event) => { event.preventDefault(); ir(rota) }}
    >
      {children}
    </a>
  )

  return (
    <main className={`igreja-site pagina-${pagina}`}>
      <header className={`igreja-topo ${pagina !== "inicio" ? "interno" : ""}`}>
        <LinkInterno rota="/" className="igreja-marca-link"><Marca /></LinkInterno>
        <button className="igreja-menu-botao" onClick={() => setMenuAberto(!menuAberto)} aria-label="Abrir menu"><i /><i /><i /></button>
        <nav className={menuAberto ? "aberto" : ""}>
          <LinkInterno rota="/">Início</LinkInterno>
          <LinkInterno rota="/quem-somos">Quem somos</LinkInterno>
          <LinkInterno rota="/onde-estamos">Onde estamos</LinkInterno>
          <LinkInterno rota="/departamentos">Departamentos</LinkInterno>
          <LinkInterno rota="/contribuicao">Contribuição</LinkInterno>
        </nav>
        <a className="igreja-topo-acao" href="https://instagram.com/adjacare" target="_blank" rel="noreferrer">Acompanhe a igreja <IconeSeta /></a>
      </header>

      {pagina === "inicio" && (
        <>
          <section className="igreja-hero">
            <div className="igreja-hero-conteudo">
              <span className="igreja-kicker">UMA IGREJA PRESENTE EM CABREÚVA</span>
              <h1>Um lugar para<br /><em>viver a fé.</em></h1>
              <p>Palavra, comunhão e uma família para caminhar com você. As portas estão abertas — a casa também é sua.</p>
              <div className="igreja-hero-acoes">
                <LinkInterno rota="/onde-estamos" className="primario">Planeje sua visita <b>→</b></LinkInterno>
                <LinkInterno rota="/quem-somos" className="secundario">Conheça nossa igreja</LinkInterno>
              </div>
            </div>
            <aside className="igreja-hero-proximo">
              <span>PRÓXIMO ENCONTRO</span>
              <div><b>DOM</b><strong>18<small>30</small></strong></div>
              <h2>Culto da Família</h2>
              <p>Av. Ver. José Donato, 913</p>
              <LinkInterno rota="/onde-estamos">Como chegar <IconeSeta /></LinkInterno>
            </aside>
            <div className="igreja-hero-palavra" aria-hidden="true">JACARÉ</div>
            <div className="igreja-hero-luz um" /><div className="igreja-hero-luz dois" />
          </section>

          <section className="igreja-boas-vindas igreja-container">
            <div>
              <span className="igreja-kicker">SEJA BEM-VINDO</span>
              <h2>Mais que um templo.<br />Uma família.</h2>
            </div>
            <div>
              <p>Somos uma comunidade que ama a Deus, valoriza pessoas e acredita no poder transformador do Evangelho.</p>
              <LinkInterno rota="/quem-somos">Descubra quem somos <b>→</b></LinkInterno>
            </div>
          </section>

          <section className="igreja-caminhos">
            <div className="igreja-container">
              <header className="igreja-secao-titulo">
                <div><span className="igreja-kicker">ENCONTRE O QUE PROCURA</span><h2>A AD Jacaré, do seu jeito.</h2></div>
                <p>Cada assunto ganhou seu próprio espaço. Navegue com calma e conheça mais da nossa igreja.</p>
              </header>
              <div className="igreja-caminhos-grade">
                <LinkInterno rota="/quem-somos"><span>01</span><small>NOSSA HISTÓRIA</small><h3>Quem somos</h3><p>Conheça nossa fé, missão e valores.</p><b>↗</b></LinkInterno>
                <LinkInterno rota="/onde-estamos"><span>02</span><small>VENHA NOS VISITAR</small><h3>Onde estamos</h3><p>Endereço, rota e horários dos cultos.</p><b>↗</b></LinkInterno>
                <LinkInterno rota="/departamentos"><span>03</span><small>SIRVA E PERTENÇA</small><h3>Departamentos</h3><p>Encontre seu lugar na nossa comunidade.</p><b>↗</b></LinkInterno>
                <LinkInterno rota="/contribuicao"><span>04</span><small>GENEROSIDADE</small><h3>Contribuição</h3><p>Formas de contribuir com segurança.</p><b>↗</b></LinkInterno>
              </div>
            </div>
          </section>

          <section className="igreja-home-avisos">
            <div className="igreja-container">
              <header className="igreja-secao-titulo claro">
                <div><span className="igreja-kicker">FIQUE POR DENTRO</span><h2>Últimos avisos</h2></div>
                <p>Comunicados públicos atualizados pelo Sistema ADJACARÉ.</p>
              </header>
              <div className="igreja-avisos-grade">
                {avisos.length ? avisos.map((aviso) => (
                  <article key={aviso.id} className={aviso.urgente ? "urgente" : ""}>
                    <span>{aviso.urgente ? "ATENÇÃO" : dataAviso(aviso.data)}</span>
                    <h3>{aviso.titulo}</h3><p>{aviso.mensagem}</p>
                  </article>
                )) : <article className="vazio"><span>TUDO CERTO</span><h3>Nenhum comunicado público no momento.</h3><p>Quando houver uma novidade importante, ela aparecerá aqui.</p></article>}
              </div>
            </div>
          </section>
        </>
      )}

      {pagina === "quem-somos" && (
        <>
          <CabecalhoPagina numero="01" kicker="CONHEÇA A AD JACARÉ" titulo={<>Uma igreja.<br /><em>Muitas histórias.</em></>} texto="Nossa identidade nasce na Palavra, cresce na comunhão e se revela no cuidado com pessoas." />
          <section className="igreja-historia igreja-container">
            <div className="igreja-historia-visual"><div><span>AD</span><strong>JACARÉ</strong><small>Cabreúva • SP</small></div><p>UMA CASA<br />PARA TODOS</p><i /></div>
            <div className="igreja-historia-texto">
              <span className="igreja-kicker">NOSSA ESSÊNCIA</span>
              <h2>Fé que se vive em comunidade.</h2>
              <p>Somos uma igreja comprometida com a Palavra de Deus, com a oração e com o cuidado pelas pessoas. Aqui, cada geração encontra espaço para aprender, servir e crescer.</p>
              <p>Nossa missão acontece dentro e fora do templo: anunciando o Evangelho, fortalecendo famílias e servindo a cidade com amor.</p>
              <small>Este espaço está preparado para receber a história oficial da igreja e da congregação.</small>
            </div>
          </section>
          <section className="igreja-pilares">
            <div className="igreja-container">
              <span className="igreja-kicker">O QUE NOS MOVE</span>
              <div className="igreja-pilares-grade">
                <article><b>01</b><h3>Palavra</h3><p>A Bíblia é a base da nossa fé e de tudo o que vivemos.</p></article>
                <article><b>02</b><h3>Comunhão</h3><p>Crescemos juntos, compartilhando a caminhada e cuidando uns dos outros.</p></article>
                <article><b>03</b><h3>Serviço</h3><p>Colocamos nossos dons em movimento para servir a Deus e às pessoas.</p></article>
                <article><b>04</b><h3>Missão</h3><p>Existimos para anunciar Jesus e fazer diferença onde estamos.</p></article>
              </div>
            </div>
          </section>
        </>
      )}

      {pagina === "onde-estamos" && (
        <>
          <CabecalhoPagina numero="02" kicker="SUA VISITA COMEÇA AQUI" titulo={<>Tem sempre um lugar<br /><em>esperando por você.</em></>} texto="Venha viver um tempo de fé, comunhão e Palavra conosco. Será uma alegria receber você e sua família." />
          <section className="igreja-endereco igreja-container">
            <div className="igreja-mapa-visual"><span>23°18'29.7”S</span><strong>46°56'17.9”W</strong><i /><b>AD</b><small>JACARÉ</small></div>
            <div className="igreja-endereco-texto">
              <span className="igreja-kicker">NOSSO ENDEREÇO</span>
              <h2>Estamos no bairro Jacaré, em Cabreúva.</h2>
              <address>Av. Vereador José Donato, 913<br />Cabreúva – SP<br />CEP 13318-000</address>
              <a href="https://www.google.com/maps/search/?api=1&query=Av.%20Vereador%20Jos%C3%A9%20Donato%2C%20913%2C%20Cabre%C3%BAva%20SP" target="_blank" rel="noreferrer">Abrir rota no Google Maps <IconeSeta /></a>
            </div>
          </section>
          <section className="igreja-agenda">
            <div className="igreja-container">
              <header className="igreja-secao-titulo claro"><div><span className="igreja-kicker">NOSSA SEMANA</span><h2>Escolha o melhor dia para nos visitar.</h2></div><p>Em datas especiais, acompanhe os avisos e o Instagram da igreja.</p></header>
              <div className="igreja-cultos-grade">
                {CULTOS.map((culto) => <article key={`${culto.dia}-${culto.horario}`}><div><span>{culto.dia}</span><strong>{culto.horario}</strong></div><h3>{culto.titulo}</h3><p>{culto.detalhe}</p><i>→</i></article>)}
              </div>
            </div>
          </section>
        </>
      )}

      {pagina === "departamentos" && (
        <>
          <CabecalhoPagina numero="03" kicker="SIRVA E PERTENÇA" titulo={<>Há um lugar<br /><em>para você aqui.</em></>} texto="Cada geração, talento e chamado encontra espaço para crescer, servir e construir comunhão." />
          <section className="igreja-departamentos igreja-container">
            <header className="igreja-secao-titulo"><div><span className="igreja-kicker">NOSSA COMUNIDADE</span><h2>Pessoas servindo pessoas.</h2></div><p>Esta página está pronta para receber os líderes, horários, contatos e informações oficiais de cada departamento.</p></header>
            <div className="igreja-departamentos-grade">
              {DEPARTAMENTOS.map((item, index) => <article key={item.nome} className={index === 0 ? "principal" : ""}><span>{item.numero}</span><div className="sigla">{item.sigla}</div><small>{item.destaque}</small><h3>{item.nome}</h3><p>{item.descricao}</p><b>Conhecer departamento <IconeSeta /></b></article>)}
            </div>
          </section>
        </>
      )}

      {pagina === "contribuicao" && (
        <>
          <CabecalhoPagina numero="04" kicker="GENEROSIDADE COM PROPÓSITO" titulo={<>Contribuir também é<br /><em>participar da missão.</em></>} texto="Sua contribuição ajuda a manter a obra, cuidar de pessoas e levar o Evangelho ainda mais longe." />
          <section className="igreja-contribuicao igreja-container">
            <div className="igreja-contribuicao-intro">
              <span className="igreja-kicker">DÍZIMOS E OFERTAS</span>
              <h2>Uma resposta de gratidão.</h2>
              <p>Contribuir é um ato voluntário de fé e gratidão. Preparamos este espaço para apresentar as formas oficiais de contribuição da AD Jacaré com clareza e segurança.</p>
              <blockquote>“Cada um contribua segundo propôs no seu coração.”<small>2 Coríntios 9:7</small></blockquote>
            </div>
            <div className="igreja-dados-pendentes">
              <span>INFORMAÇÕES EM PREPARAÇÃO</span>
              <div className="igreja-pix-simbolo">PIX</div>
              <h3>Os dados oficiais serão adicionados aqui.</h3>
              <p>Envie depois a chave PIX, o nome do favorecido e os dados bancários que devem aparecer. Nenhuma informação financeira foi inventada.</p>
              <small>Antes de contribuir, sempre confira se os dados exibidos pertencem à igreja.</small>
            </div>
          </section>
          <section className="igreja-transparencia"><div className="igreja-container"><span>SEGURANÇA</span><h2>Confira sempre os dados antes de confirmar.</h2><p>A igreja não solicita senhas, códigos ou dados pessoais para receber contribuições.</p></div></section>
        </>
      )}

      <section className="igreja-conexoes">
        <div className="igreja-container">
          <div><span className="igreja-kicker">AD JACARÉ DIGITAL</span><h2>Continue conectado.</h2></div>
          <div className="igreja-conexoes-links">
            <a href="https://instagram.com/adjacare" target="_blank" rel="noreferrer"><span>Instagram</span><b>@adjacare ↗</b></a>
            <a href="https://aluno.adjacare.org"><span>Escola Bíblica</span><b>Portal do Aluno →</b></a>
            <a href="https://sistema.adjacare.org"><span>Área interna</span><b>Sistema ADJACARÉ →</b></a>
          </div>
        </div>
      </section>

      <footer className="igreja-rodape">
        <div className="igreja-container">
          <LinkInterno rota="/" className="igreja-marca-link"><Marca /></LinkInterno>
          <div className="igreja-rodape-nav"><LinkInterno rota="/quem-somos">Quem somos</LinkInterno><LinkInterno rota="/onde-estamos">Onde estamos</LinkInterno><LinkInterno rota="/departamentos">Departamentos</LinkInterno><LinkInterno rota="/contribuicao">Contribuição</LinkInterno></div>
          <p>Uma igreja presente em Cabreúva.</p>
          <small>© {new Date().getFullYear()} AD Jacaré. Todos os direitos reservados.</small>
        </div>
      </footer>
    </main>
  )
}

function CabecalhoPagina({ numero, kicker, titulo, texto }) {
  return (
    <section className="igreja-pagina-hero">
      <div className="igreja-container">
        <span className="igreja-pagina-numero">{numero}</span>
        <div><span className="igreja-kicker">{kicker}</span><h1>{titulo}</h1><p>{texto}</p></div>
      </div>
      <i className="anel um" /><i className="anel dois" />
    </section>
  )
}
