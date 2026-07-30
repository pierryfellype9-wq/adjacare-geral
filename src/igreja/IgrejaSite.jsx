import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  CULTOS,
  DEPARTAMENTOS,
  DESCRICOES_SITE,
  JUBILACAO,
  LIDERANCA_LOCAL,
  MARCOS_HISTORIA,
  NAVEGACAO_SITE,
  PILARES_IDENTIDADE,
  ROTAS_SITE,
  TITULOS_SITE,
  obterProximosCultos,
} from "./siteData";
import "./IgrejaSite.css";

const ENDERECO =
  "Av. Vereador José Donato, 913 — Bairro Jacaré, Cabreúva/SP — CEP 13318-000";
const LINK_MAPA =
  "https://www.google.com/maps/search/?api=1&query=Av.%20Vereador%20Jos%C3%A9%20Donato%2C%20913%2C%20Cabre%C3%BAva%20SP";
const MAPA_EMBED =
  "https://www.google.com/maps?q=Av.%20Vereador%20Jos%C3%A9%20Donato%2C%20913%2C%20Cabre%C3%BAva%20SP&output=embed";

function caminhoLimpo() {
  const path =
    window.location.pathname.replace(/^\/igreja(?:-preview)?/, "") || "/";
  return path !== "/" ? path.replace(/\/$/, "") : path;
}

function baseDoSite() {
  const path = window.location.pathname;
  if (path.startsWith("/igreja-preview")) return "/igreja-preview";
  if (path.startsWith("/igreja")) return "/igreja";
  return "";
}

function hrefInterno(base, rota) {
  return rota === "/" ? base || "/" : `${base}${rota}`;
}

function dataAviso(valor) {
  if (!valor) return "Comunicado";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(valor));
}

function definirMeta(seletor, atributo, valor) {
  let elemento = document.head.querySelector(seletor);

  if (!elemento) {
    elemento = document.createElement("meta");
    const [nome, conteudo] = atributo;
    elemento.setAttribute(nome, conteudo);
    document.head.appendChild(elemento);
  }

  elemento.setAttribute("content", valor);
}

function Seta({ pequena = false }) {
  return (
    <svg
      aria-hidden="true"
      className={pequena ? "seta pequena" : "seta"}
      viewBox="0 0 24 24"
    >
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function Marca({ rodape = false }) {
  if (rodape) {
    return (
      <span className="igreja-marca igreja-marca-rodape">
        <img
          src="/logo-ad-institucional-branca.png"
          alt="Assembleia de Deus Jundiaí"
        />
      </span>
    );
  }

  return (
    <span className="igreja-marca">
      <img src="/logo-ad-site.png" alt="" />
      <span>
        <b>ASSEMBLEIA DE DEUS</b>
        <strong>AD JACARÉ</strong>
        <small>Jundiaí • SP</small>
      </span>
    </span>
  );
}

function LinkSite({ rota, base, navegar, children, className = "", ...props }) {
  return (
    <a
      {...props}
      className={className}
      href={hrefInterno(base, rota)}
      onClick={(event) => {
        event.preventDefault();
        navegar(rota);
      }}
    >
      {children}
    </a>
  );
}

function CabecalhoPagina({ indice, kicker, titulo, texto }) {
  return (
    <section className="igreja-pagina-cabecalho">
      <div className="igreja-container">
        <span className="igreja-pagina-indice" aria-hidden="true">
          {indice}
        </span>
        <div>
          <span className="igreja-kicker">{kicker}</span>
          <h1>{titulo}</h1>
          <p>{texto}</p>
        </div>
      </div>
    </section>
  );
}

function AvisosPublicos({ avisos }) {
  if (!avisos.length) return null;

  return (
    <section className="igreja-avisos" aria-labelledby="titulo-avisos">
      <div className="igreja-container">
        <header className="igreja-titulo-secao claro">
          <div>
            <span className="igreja-kicker">COMUNICADOS</span>
            <h2 id="titulo-avisos">Informações da igreja</h2>
          </div>
          <p>Avisos públicos atualizados diretamente pelo Sistema ADJACARÉ.</p>
        </header>

        <div className="igreja-avisos-lista">
          {avisos.map((aviso) => (
            <article key={aviso.id} className={aviso.urgente ? "urgente" : ""}>
              <span>{aviso.urgente ? "Atenção" : dataAviso(aviso.data)}</span>
              <h3>{aviso.titulo}</h3>
              <p>{aviso.mensagem}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Rodape({ base, navegar }) {
  return (
    <footer className="igreja-rodape">
      <div className="igreja-container igreja-rodape-principal">
        <div className="igreja-rodape-identidade">
          <LinkSite
            rota="/"
            base={base}
            navegar={navegar}
            aria-label="Voltar ao início"
          >
            <Marca rodape />
          </LinkSite>
          <p>
            Ministério do Belém
            <br />
            Sede Vianelo • Congregação do Jacaré
          </p>
        </div>

        <div>
          <h2>Institucional</h2>
          <nav aria-label="Navegação institucional do rodapé">
            <LinkSite rota="/quem-somos" base={base} navegar={navegar}>
              Quem somos
            </LinkSite>
            <LinkSite rota="/onde-estamos" base={base} navegar={navegar}>
              Onde estamos
            </LinkSite>
            <LinkSite rota="/departamentos" base={base} navegar={navegar}>
              Departamentos
            </LinkSite>
            <LinkSite rota="/programacao" base={base} navegar={navegar}>
              Programação
            </LinkSite>
            <LinkSite rota="/contribuicao" base={base} navegar={navegar}>
              Contribuição
            </LinkSite>
          </nav>
        </div>

        <div>
          <h2>Acessos</h2>
          <nav aria-label="Serviços digitais">
            <a href="/enviar-hino">Enviar hino</a>
            <a href="https://aluno.adjacare.org">Portal do Aluno</a>
            <a href="https://sistema.adjacare.org">Sistema ADJACARÉ</a>
            <a
              href="https://instagram.com/adjacare"
              target="_blank"
              rel="noreferrer"
            >
              Instagram @adjacare
            </a>
          </nav>
        </div>

        <div className="igreja-rodape-endereco">
          <h2>Visite-nos</h2>
          <address>
            Av. Vereador José Donato, 913
            <br />
            Bairro Jacaré • Cabreúva/SP
            <br />
            CEP 13318-000
          </address>
          <a href={LINK_MAPA} target="_blank" rel="noreferrer">
            Abrir no Google Maps <Seta pequena />
          </a>
        </div>
      </div>

      <div className="igreja-container igreja-rodape-base">
        <small>
          © {new Date().getFullYear()} AD Jacaré. Todos os direitos reservados.
        </small>
        <button type="button" onClick={() => window.scrollTo({ top: 0 })}>
          Voltar ao topo <span aria-hidden="true">↑</span>
        </button>
      </div>
    </footer>
  );
}

export default function IgrejaSite() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [pagina, setPagina] = useState(
    () => ROTAS_SITE[caminhoLimpo()] || "inicio"
  );
  const [avisos, setAvisos] = useState([]);
  const base = useMemo(baseDoSite, []);
  const proximosCultos = useMemo(() => obterProximosCultos(), []);
  const proximoCulto = proximosCultos[0];

  useEffect(() => {
    function voltar() {
      setPagina(ROTAS_SITE[caminhoLimpo()] || "inicio");
      setMenuAberto(false);
      window.scrollTo(0, 0);
    }

    window.addEventListener("popstate", voltar);
    return () => window.removeEventListener("popstate", voltar);
  }, []);

  useEffect(() => {
    document.title = TITULOS_SITE[pagina];
    document.documentElement.lang = "pt-BR";
    document.body.classList.add("igreja-body");

    definirMeta(
      'meta[name="description"]',
      ["name", "description"],
      DESCRICOES_SITE[pagina]
    );
    definirMeta(
      'meta[property="og:title"]',
      ["property", "og:title"],
      TITULOS_SITE[pagina]
    );
    definirMeta(
      'meta[property="og:description"]',
      ["property", "og:description"],
      DESCRICOES_SITE[pagina]
    );
    definirMeta('meta[name="theme-color"]', ["name", "theme-color"], "#0c315f");

    const icone = document.head.querySelector('link[rel~="icon"]');
    if (icone) icone.setAttribute("href", "/logo-ad-site.png");

    return () => document.body.classList.remove("igreja-body");
  }, [pagina]);

  useEffect(() => {
    document.body.classList.toggle("igreja-menu-aberto", menuAberto);

    function fecharComEscape(event) {
      if (event.key === "Escape") setMenuAberto(false);
    }

    window.addEventListener("keydown", fecharComEscape);
    return () => {
      document.body.classList.remove("igreja-menu-aberto");
      window.removeEventListener("keydown", fecharComEscape);
    };
  }, [menuAberto]);

  useEffect(() => {
    let ativo = true;

    async function carregarAvisos() {
      const { data, error } = await supabase
        .from("avisos")
        .select("id,titulo,mensagem,data,urgente,fixado,expira_em,destino")
        .eq("destino", "Todos")
        .order("fixado", { ascending: false })
        .order("data", { ascending: false })
        .limit(3);

      if (error || !ativo) return;

      const agora = new Date();
      setAvisos(
        (data || []).filter(
          (aviso) => !aviso.expira_em || new Date(aviso.expira_em) > agora
        )
      );
    }

    carregarAvisos();
    return () => {
      ativo = false;
    };
  }, []);

  function navegar(rota) {
    const destino = hrefInterno(base, rota);
    const novaPagina = ROTAS_SITE[rota] || "inicio";

    if (window.location.pathname !== destino) {
      window.history.pushState({}, "", destino);
    }

    setPagina(novaPagina);
    setMenuAberto(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className={`igreja-site pagina-${pagina}`}>
      <a className="igreja-pular" href="#conteudo-principal">
        Pular para o conteúdo
      </a>

      <div className="igreja-barra-institucional">
        <div className="igreja-container">
          <span>Ministério do Belém • Sede Vianelo</span>
          <nav aria-label="Acessos rápidos">
            <a
              href="https://instagram.com/adjacare"
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>
            <a href="https://aluno.adjacare.org">Portal do Aluno</a>
            <a href="https://sistema.adjacare.org">Sistema</a>
          </nav>
        </div>
      </div>

      <header className="igreja-cabecalho">
        <div className="igreja-container">
          <LinkSite
            rota="/"
            base={base}
            navegar={navegar}
            className="igreja-marca-link"
            aria-label="AD Jacaré — página inicial"
          >
            <Marca />
          </LinkSite>

          <button
            type="button"
            className="igreja-menu-botao"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            aria-expanded={menuAberto}
            aria-controls="igreja-navegacao"
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          >
            <span />
            <span />
            <span />
          </button>

          <nav
            id="igreja-navegacao"
            className={`igreja-navegacao ${menuAberto ? "aberta" : ""}`}
            aria-label="Navegação principal"
          >
            {NAVEGACAO_SITE.map((item) => (
              <LinkSite
                key={item.rota}
                rota={item.rota}
                base={base}
                navegar={navegar}
                aria-current={pagina === item.pagina ? "page" : undefined}
              >
                {item.label}
              </LinkSite>
            ))}
            <a className="igreja-nav-hino" href="/enviar-hino">
              Enviar hino <Seta pequena />
            </a>
            <div className="igreja-menu-acessos">
              <a href="https://aluno.adjacare.org">Portal do Aluno</a>
              <a href="https://sistema.adjacare.org">Sistema ADJACARÉ</a>
              <a
                href="https://instagram.com/adjacare"
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
            </div>
          </nav>
        </div>
      </header>

      <main id="conteudo-principal" tabIndex="-1">
        {pagina === "inicio" && (
          <>
            <section className="igreja-hero">
              <div className="igreja-container igreja-hero-grade">
                <div className="igreja-hero-conteudo">
                  <span className="igreja-kicker">
                    ASSEMBLEIA DE DEUS • CONGREGAÇÃO DO JACARÉ
                  </span>
                  <h1>Uma igreja presente em Cabreúva.</h1>
                  <p>
                    Palavra, oração e comunhão. A AD Jacaré faz parte do
                    Ministério do Belém, Sede Vianelo, e está de portas abertas
                    para receber você e sua família.
                  </p>
                  <div className="igreja-acoes">
                    <LinkSite
                      rota="/programacao"
                      base={base}
                      navegar={navegar}
                      className="igreja-botao primario"
                    >
                      Ver programação <Seta />
                    </LinkSite>
                    <LinkSite
                      rota="/onde-estamos"
                      base={base}
                      navegar={navegar}
                      className="igreja-botao secundario"
                    >
                      Como chegar
                    </LinkSite>
                  </div>
                </div>

                <div className="igreja-hero-identidade" aria-label="AD Jacaré">
                  <span>Desde</span>
                  <strong>2016</strong>
                  <div>
                    <img
                      src="/logo-ad-institucional-branca.png"
                      alt="Assembleia de Deus Jundiaí"
                    />
                  </div>
                  <p>
                    Congregação do Jacaré
                    <small>Cabreúva • São Paulo</small>
                  </p>
                </div>
              </div>
            </section>

            <section
              className="igreja-proximo"
              aria-labelledby="titulo-proximo-culto"
            >
              <div className="igreja-container">
                <div>
                  <span>PRÓXIMO ENCONTRO</span>
                  <strong>{proximoCulto.quando}</strong>
                </div>
                <div>
                  <span>{proximoCulto.dia}</span>
                  <h2 id="titulo-proximo-culto">{proximoCulto.titulo}</h2>
                </div>
                <time>{proximoCulto.horario}</time>
                <LinkSite rota="/programacao" base={base} navegar={navegar}>
                  Programação completa <Seta pequena />
                </LinkSite>
              </div>
            </section>

            <section className="igreja-apresentacao igreja-container">
              <div className="igreja-numero-secao" aria-hidden="true">
                01
              </div>
              <div>
                <span className="igreja-kicker">A AD JACARÉ</span>
                <h2>
                  Uma congregação do Ministério do Belém no bairro do Jacaré.
                </h2>
              </div>
              <div className="igreja-apresentacao-texto">
                <p>
                  A Congregação do Jacaré foi fundada em 2016, durante a
                  presidência do Pr. Ezequias Soares, tendo como primeiro pastor
                  local o Pr. Manoel Ferreira Moital. Atualmente, a igreja é
                  liderada pelo Pr. Douglas Moital do Prado, ao lado de sua
                  esposa, Anne Karoline do Carmo Prado.
                </p>
                <LinkSite
                  rota="/quem-somos"
                  base={base}
                  navegar={navegar}
                  className="igreja-link"
                >
                  Conheça nossa história <Seta pequena />
                </LinkSite>
              </div>
            </section>

            <section
              className="igreja-programacao-resumo"
              aria-labelledby="titulo-programacao-resumo"
            >
              <div className="igreja-container">
                <header className="igreja-titulo-secao">
                  <div>
                    <span className="igreja-kicker">NOSSA SEMANA</span>
                    <h2 id="titulo-programacao-resumo">
                      Sempre há um encontro próximo.
                    </h2>
                  </div>
                  <p>
                    Confira os próximos cultos e escolha o melhor dia para nos
                    visitar.
                  </p>
                </header>

                <ol className="igreja-proximos-lista">
                  {proximosCultos.map((culto, index) => (
                    <li key={culto.id}>
                      <span>0{index + 1}</span>
                      <div>
                        <small>{culto.quando}</small>
                        <strong>{culto.titulo}</strong>
                      </div>
                      <time>{culto.horario}</time>
                    </li>
                  ))}
                </ol>

                <LinkSite
                  rota="/programacao"
                  base={base}
                  navegar={navegar}
                  className="igreja-link"
                >
                  Consultar todos os horários <Seta pequena />
                </LinkSite>
              </div>
            </section>

            <AvisosPublicos avisos={avisos} />

            <section className="igreja-chamada-visita">
              <div className="igreja-container">
                <span className="igreja-kicker">VENHA NOS VISITAR</span>
                <h2>Bairro Jacaré, em Cabreúva.</h2>
                <p>{ENDERECO}</p>
                <LinkSite
                  rota="/onde-estamos"
                  base={base}
                  navegar={navegar}
                  className="igreja-botao claro"
                >
                  Ver endereço e rota <Seta />
                </LinkSite>
              </div>
            </section>
          </>
        )}

        {pagina === "quem-somos" && (
          <>
            <CabecalhoPagina
              indice="01"
              kicker="QUEM SOMOS"
              titulo="Uma história que atravessa gerações."
              texto="Conheça a trajetória que une a chegada do Ministério do Belém a Jundiaí, a fundação da Congregação do Jacaré e a continuidade desta obra."
            />

            <section className="igreja-historia igreja-container">
              <header>
                <span className="igreja-kicker">NOSSA HISTÓRIA</span>
                <h2>Uma obra construída com fé e perseverança.</h2>
                <p>
                  Do trabalho iniciado pelo missionário Daniel Berg à igreja que
                  hoje serve o bairro do Jacaré, esta história permanece firmada
                  na mesma mensagem do Evangelho.
                </p>
              </header>

              <div className="igreja-linha-tempo">
                {MARCOS_HISTORIA.map((marco) => (
                  <article key={marco.marco}>
                    <time>{marco.marco}</time>
                    <div>
                      <span>{marco.contexto}</span>
                      <h3>{marco.titulo}</h3>
                      {marco.paragrafos.map((paragrafo) => (
                        <p key={paragrafo}>{paragrafo}</p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section
              className="igreja-jubilacao"
              aria-labelledby="titulo-jubilacao"
            >
              <div className="igreja-container">
                <header className="igreja-jubilacao-cabecalho">
                  <span className="igreja-kicker">
                    JUBILAÇÃO • {JUBILACAO.data}
                  </span>
                  <h2 id="titulo-jubilacao">{JUBILACAO.titulo}</h2>
                </header>

                <figure className="igreja-jubilacao-foto">
                  <img
                    src={JUBILACAO.foto}
                    alt={JUBILACAO.fotoAlt}
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption>
                    <span>AD JACARÉ • MEMÓRIA INSTITUCIONAL</span>
                    <p>{JUBILACAO.legenda}</p>
                  </figcaption>
                </figure>

                <div className="igreja-jubilacao-conteudo">
                  <div className="igreja-jubilacao-periodo">
                    <strong>2016—2026</strong>
                    <span>UMA DÉCADA DE SERVIÇO</span>
                  </div>
                  <div className="igreja-jubilacao-texto">
                    {JUBILACAO.paragrafos.map((paragrafo) => (
                      <p key={paragrafo}>{paragrafo}</p>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="igreja-lideranca igreja-container">
              <div>
                <span className="igreja-kicker">LIDERANÇA LOCAL</span>
                <h2>
                  {LIDERANCA_LOCAL.pastor} e {LIDERANCA_LOCAL.esposa}.
                </h2>
                <p>
                  Desde {LIDERANCA_LOCAL.inicio}, o Pr. Douglas e sua esposa,
                  Anne, conduzem a congregação, dando continuidade ao trabalho
                  com responsabilidade, compromisso e fidelidade ao chamado que
                  Deus lhes confiou.
                </p>
              </div>
              <figure className="igreja-lideranca-foto">
                <img
                  src={LIDERANCA_LOCAL.foto}
                  alt={`${LIDERANCA_LOCAL.pastor} ao lado de sua esposa, ${LIDERANCA_LOCAL.esposa}`}
                />
                <figcaption>
                  <span>PASTOR LOCAL E ESPOSA</span>
                  <strong>{LIDERANCA_LOCAL.pastor}</strong>
                  <small>{LIDERANCA_LOCAL.esposa}</small>
                </figcaption>
              </figure>
            </section>

            <section className="igreja-identidade">
              <div className="igreja-container">
                <span className="igreja-kicker">
                  MISSÃO, VALORES E IDENTIDADE
                </span>
                <div className="igreja-identidade-conteudo">
                  <h2>
                    Anunciar o Evangelho, servir à comunidade e glorificar a
                    Jesus.
                  </h2>
                  <p>
                    A AD Jacaré mantém viva a essência que marcou o início desta
                    obra e segue firme no propósito de levar a mensagem de
                    salvação a todas as pessoas.
                  </p>
                  <ol>
                    {PILARES_IDENTIDADE.map((pilar, indice) => (
                      <li key={pilar}>
                        <span>{String(indice + 1).padStart(2, "0")}</span>
                        <strong>{pilar}</strong>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>
          </>
        )}

        {pagina === "onde-estamos" && (
          <>
            <CabecalhoPagina
              indice="02"
              kicker="ONDE ESTAMOS"
              titulo="No bairro do Jacaré, em Cabreúva."
              texto="Consulte o endereço, abra a rota e planeje sua visita."
            />

            <section className="igreja-localizacao igreja-container">
              <div className="igreja-localizacao-texto">
                <span className="igreja-kicker">NOSSO ENDEREÇO</span>
                <h2>AD Jacaré</h2>
                <address>
                  Av. Vereador José Donato, 913
                  <br />
                  Bairro Jacaré
                  <br />
                  Cabreúva – SP
                  <br />
                  CEP 13318-000
                </address>
                <a
                  className="igreja-botao primario"
                  href={LINK_MAPA}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir rota no Google Maps <Seta />
                </a>
              </div>

              <div className="igreja-mapa">
                <iframe
                  title="Mapa com a localização da AD Jacaré"
                  src={MAPA_EMBED}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </section>

            <section className="igreja-localizacao-programacao">
              <div className="igreja-container">
                <div>
                  <span className="igreja-kicker">ANTES DE VIR</span>
                  <h2>Confira os horários da semana.</h2>
                </div>
                <p>
                  A programação regular está disponível em uma página própria.
                  Em datas especiais, consulte também os comunicados e o
                  Instagram da igreja.
                </p>
                <LinkSite
                  rota="/programacao"
                  base={base}
                  navegar={navegar}
                  className="igreja-link"
                >
                  Ver programação <Seta pequena />
                </LinkSite>
              </div>
            </section>
          </>
        )}

        {pagina === "departamentos" && (
          <>
            <CabecalhoPagina
              indice="03"
              kicker="DEPARTAMENTOS"
              titulo="A igreja em ação."
              texto="Áreas de ensino, cuidado, comunhão, missão e serviço que integram a Congregação do Jacaré."
            />

            <section className="igreja-departamentos igreja-container">
              <header className="igreja-titulo-secao">
                <div>
                  <span className="igreja-kicker">NOSSA COMUNIDADE</span>
                  <h2>Departamentos da AD Jacaré</h2>
                </div>
                <p>
                  Lideranças, contatos e informações detalhadas serão
                  acrescentados quando os dados oficiais forem enviados.
                </p>
              </header>

              <div className="igreja-departamentos-lista">
                {DEPARTAMENTOS.map((departamento) => (
                  <article key={departamento.numero}>
                    <span>{departamento.numero}</span>
                    <div>
                      <small>{departamento.sigla}</small>
                      <h3>{departamento.nome}</h3>
                    </div>
                    <p>{departamento.descricao}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {pagina === "programacao" && (
          <>
            <CabecalhoPagina
              indice="04"
              kicker="PROGRAMAÇÃO"
              titulo="Nossa semana na AD Jacaré."
              texto="Cultos, oração, Escola Bíblica Dominical e encontros regulares da congregação."
            />

            <section className="igreja-programacao igreja-container">
              <header>
                <span className="igreja-kicker">HORÁRIOS REGULARES</span>
                <h2>Escolha um dia e venha nos visitar.</h2>
                <p>
                  Em feriados e programações especiais, os horários podem ser
                  alterados. Acompanhe os avisos e o Instagram @adjacare.
                </p>
              </header>

              <div className="igreja-programacao-lista">
                {CULTOS.map((culto) => (
                  <article key={culto.id}>
                    <span>{culto.abreviado}</span>
                    <div>
                      <small>{culto.dia}</small>
                      <h3>{culto.titulo}</h3>
                    </div>
                    <time>{culto.horario}</time>
                  </article>
                ))}
              </div>
            </section>

            <section className="igreja-envio-hino">
              <div className="igreja-container">
                <div>
                  <span className="igreja-kicker">SOM E PROJEÇÃO</span>
                  <h2>Vai cantar em um de nossos cultos?</h2>
                  <p>
                    Envie o hino pelo formulário dentro do prazo definido para o
                    culto. Depois do horário-limite, o atendimento deve ser
                    feito diretamente com a equipe na cabine.
                  </p>
                </div>
                <a className="igreja-botao claro" href="/enviar-hino">
                  Enviar hino <Seta />
                </a>
              </div>
            </section>
          </>
        )}

        {pagina === "contribuicao" && (
          <>
            <CabecalhoPagina
              indice="05"
              kicker="CONTRIBUIÇÃO"
              titulo="Dízimos e ofertas."
              texto="Um espaço reservado para as formas oficiais de contribuição da AD Jacaré."
            />

            <section className="igreja-contribuicao igreja-container">
              <div>
                <span className="igreja-kicker">INFORMAÇÕES EM PREPARAÇÃO</span>
                <h2>Os dados oficiais serão publicados nesta página.</h2>
                <p>
                  A chave PIX, o nome do favorecido e os dados bancários serão
                  exibidos somente após a confirmação da administração da
                  igreja.
                </p>
              </div>

              <aside>
                <span>SEGURANÇA</span>
                <h3>Confira o favorecido antes de confirmar.</h3>
                <p>
                  A igreja não solicita senhas, códigos de acesso ou dados
                  pessoais para receber contribuições.
                </p>
              </aside>
            </section>
          </>
        )}
      </main>

      <Rodape base={base} navegar={navegar} />
    </div>
  );
}
