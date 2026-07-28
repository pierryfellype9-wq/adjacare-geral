import { useEffect, useState } from "react"
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
  ["EBD", "Ensino bíblico para crianças, jovens e adultos.", "01"],
  ["Jovens e Adolescentes", "Uma geração crescendo em fé e propósito.", "02"],
  ["Círculo de Oração", "Mulheres unidas em oração e serviço.", "03"],
  ["Infantil", "Cuidado e ensino para os nossos pequenos.", "04"],
  ["Mídia", "Comunicação a serviço do Evangelho.", "05"],
  ["Orquestra e Coral", "Música e adoração para a glória de Deus.", "06"],
]

function dataAviso(valor) {
  if (!valor) return "Comunicado recente"
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(new Date(valor))
    .replace(".", "")
}

export default function IgrejaSite() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [avisos, setAvisos] = useState([])

  useEffect(() => {
    document.title = "AD Jacaré | Igreja Assembleia de Deus"

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

  function navegar(id) {
    setMenuAberto(false)
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <main className="igreja-site">
      <header className="igreja-topo">
        <a className="igreja-marca" href="#inicio" aria-label="AD Jacaré - início">
          <img src="/logo.png" alt="Logo AD Jacaré" />
          <span><b>ASSEMBLEIA DE DEUS</b><strong>AD JACARÉ</strong></span>
        </a>

        <button className="igreja-menu-botao" onClick={() => setMenuAberto(!menuAberto)} aria-label="Abrir menu">
          <i /><i /><i />
        </button>

        <nav className={menuAberto ? "aberto" : ""}>
          <button onClick={() => navegar("inicio")}>Início</button>
          <button onClick={() => navegar("igreja")}>A igreja</button>
          <button onClick={() => navegar("cultos")}>Cultos</button>
          <button onClick={() => navegar("ministerios")}>Departamentos</button>
          <button onClick={() => navegar("avisos")}>Avisos</button>
          <button onClick={() => navegar("localizacao")}>Localização</button>
        </nav>

        <a className="igreja-topo-acao" href="https://instagram.com/adjacare" target="_blank" rel="noreferrer">Acompanhe a igreja <span>↗</span></a>
      </header>

      <section className="igreja-hero" id="inicio">
        <div className="igreja-hero-conteudo">
          <span className="igreja-kicker">UMA IGREJA PRESENTE EM CABREÚVA</span>
          <h1>Fé que nos une.<br /><em>Graça que nos move.</em></h1>
          <p>Um lugar para conhecer a Palavra, viver em comunhão e caminhar com Cristo. Você e sua família são muito bem-vindos.</p>
          <div className="igreja-hero-acoes">
            <button onClick={() => navegar("cultos")}>Planeje sua visita <b>→</b></button>
            <button className="secundario" onClick={() => navegar("igreja")}>Conheça a AD Jacaré</button>
          </div>
        </div>

        <aside className="igreja-hero-proximo">
          <span>PRÓXIMO ENCONTRO</span>
          <div><b>DOM</b><strong>18<small>30</small></strong></div>
          <h2>Culto da Família</h2>
          <p>Av. Ver. José Donato, 913</p>
          <button onClick={() => navegar("localizacao")}>Como chegar <span>↗</span></button>
        </aside>

        <div className="igreja-hero-palavra" aria-hidden="true">JACARÉ</div>
        <div className="igreja-hero-luz um" /><div className="igreja-hero-luz dois" />
      </section>

      <section className="igreja-faixa">
        <p>“Alegrei-me quando me disseram: Vamos à casa do Senhor.”</p><span>Salmos 122:1</span>
      </section>

      <section className="igreja-sobre igreja-container" id="igreja">
        <div className="igreja-sobre-visual">
          <div className="igreja-sobre-selo"><span>AD</span><strong>JACARÉ</strong><small>Cabreúva • SP</small></div>
          <p>UMA CASA<br />PARA TODOS</p>
          <i className="um" /><i className="dois" />
        </div>
        <div className="igreja-sobre-texto">
          <span className="igreja-kicker">QUEM SOMOS</span>
          <h2>Uma igreja para viver a fé em comunidade.</h2>
          <p>Somos uma igreja comprometida com a Palavra de Deus, com a oração e com o cuidado pelas pessoas. Aqui, cada geração encontra espaço para aprender, servir e crescer.</p>
          <p>Nossa missão acontece dentro e fora do templo: anunciando o Evangelho, fortalecendo famílias e servindo a cidade com amor.</p>
          <div className="igreja-valores">
            <article><b>01</b><span><strong>Palavra</strong><small>Base para tudo o que vivemos.</small></span></article>
            <article><b>02</b><span><strong>Comunhão</strong><small>Ninguém precisa caminhar sozinho.</small></span></article>
            <article><b>03</b><span><strong>Serviço</strong><small>Amor demonstrado em atitudes.</small></span></article>
          </div>
        </div>
      </section>

      <section className="igreja-cultos" id="cultos">
        <div className="igreja-container">
          <header className="igreja-secao-titulo claro">
            <div><span className="igreja-kicker">NOSSA SEMANA</span><h2>Sempre há um lugar esperando por você.</h2></div>
            <p>Confira nossos cultos e encontros regulares. Em datas especiais, acompanhe os avisos e o Instagram.</p>
          </header>
          <div className="igreja-cultos-grade">
            {CULTOS.map((culto) => <article key={`${culto.dia}-${culto.horario}`}>
              <div><span>{culto.dia}</span><strong>{culto.horario}</strong></div>
              <h3>{culto.titulo}</h3><p>{culto.detalhe}</p><i>→</i>
            </article>)}
          </div>
        </div>
      </section>

      <section className="igreja-ministerios igreja-container" id="ministerios">
        <header className="igreja-secao-titulo">
          <div><span className="igreja-kicker">SERVIR E PERTENCER</span><h2>Departamentos que conectam pessoas.</h2></div>
          <p>Há espaço para cada idade, talento e chamado. Conheça algumas das áreas que fazem parte da nossa igreja.</p>
        </header>
        <div className="igreja-ministerios-grade">
          {DEPARTAMENTOS.map(([nome, descricao, numero]) => <article key={nome}><span>{numero}</span><div><h3>{nome}</h3><p>{descricao}</p></div><b>↗</b></article>)}
        </div>
      </section>

      <section className="igreja-avisos" id="avisos">
        <div className="igreja-container">
          <header className="igreja-secao-titulo claro">
            <div><span className="igreja-kicker">FIQUE POR DENTRO</span><h2>Avisos da igreja</h2></div>
            <p>Comunicados públicos atualizados diretamente pelo Sistema ADJACARÉ.</p>
          </header>
          <div className="igreja-avisos-grade">
            {avisos.length ? avisos.map((aviso) => <article key={aviso.id} className={aviso.urgente ? "urgente" : ""}>
              <span>{aviso.urgente ? "ATENÇÃO" : dataAviso(aviso.data)}</span><h3>{aviso.titulo}</h3><p>{aviso.mensagem}</p>
            </article>) : <article className="vazio"><span>TUDO CERTO</span><h3>Nenhum comunicado público no momento.</h3><p>Quando houver uma novidade importante, ela aparecerá aqui.</p></article>}
          </div>
        </div>
      </section>

      <section className="igreja-local igreja-container" id="localizacao">
        <div className="igreja-local-mapa"><span>23°18'29.7”S</span><strong>46°56'17.9”W</strong><i /><b>AD</b></div>
        <div className="igreja-local-texto">
          <span className="igreja-kicker">VENHA NOS VISITAR</span><h2>Estamos esperando por você.</h2>
          <p>Av. Vereador José Donato, 913<br />Cabreúva – SP • CEP 13318-000</p>
          <a href="https://www.google.com/maps/search/?api=1&query=Av.%20Vereador%20Jos%C3%A9%20Donato%2C%20913%2C%20Cabre%C3%BAva%20SP" target="_blank" rel="noreferrer">Abrir rota no Google Maps <span>↗</span></a>
        </div>
      </section>

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
        <div className="igreja-container"><div className="igreja-marca"><img src="/logo.png" alt="" /><span><b>ASSEMBLEIA DE DEUS</b><strong>AD JACARÉ</strong></span></div><p>Uma igreja presente em Cabreúva.</p><small>© {new Date().getFullYear()} AD Jacaré. Todos os direitos reservados.</small></div>
      </footer>
    </main>
  )
}
