import { useEffect, useState } from "react";
import { EventFooter, EventHeader, FOTOS_URL } from "./EventShell";
import { siteUrl } from "./links";

const INICIO_CONGRESSO = new Date("2026-09-04T19:30:00-03:00").getTime();

function tempoRestante() {
  const distancia = Math.max(0, INICIO_CONGRESSO - Date.now());
  return {
    dias: Math.floor(distancia / 86400000),
    horas: Math.floor((distancia / 3600000) % 24),
    minutos: Math.floor((distancia / 60000) % 60),
    segundos: Math.floor((distancia / 1000) % 60),
  };
}

function CongressoCountdown() {
  const [tempo, setTempo] = useState(tempoRestante);
  useEffect(() => {
    const timer = window.setInterval(() => setTempo(tempoRestante()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <div className="countdown-composition">
    <div className="hourglass" aria-hidden="true">
      <svg viewBox="0 0 48 64" role="presentation">
        <path className="hourglass-frame" d="M8 4h32M8 60h32M12 7c0 12 4 17 12 25-8 8-12 13-12 25M36 7c0 12-4 17-12 25 8 8 12 13 12 25" />
        <path className="hourglass-glass-line" d="M16 11h16c-.7 7.6-3.4 11.5-8 16-4.6-4.5-7.3-8.4-8-16ZM15.5 53c1.4-7.2 4.2-11.1 8.5-15.5 4.3 4.4 7.1 8.3 8.5 15.5h-17Z" />
        <path className="hourglass-sand-fill" d="M18.5 13h11c-1 4.8-2.8 7.8-5.5 10.8-2.7-3-4.5-6-5.5-10.8ZM18 51c1.3-4.2 3.2-7 6-10.2 2.8 3.2 4.7 6 6 10.2H18Z" />
        <path className="hourglass-sand-stream" d="M24 26v12" />
      </svg>
    </div>
    <div className="countdown-content">
      <span className="hero-countdown-label">Faltam</span>
      <div className="hero-countdown" aria-label="Contagem regressiva para o congresso">
        {Object.entries(tempo).map(([rotulo, valor]) => <div key={rotulo}><strong>{String(valor).padStart(2,"0")}</strong><small>{rotulo}</small></div>)}
      </div>
    </div>
  </div>;
}

export default function SiteInicial() {
  return (
    <main className="event-site">
      <EventHeader />
      <section className="event-hero" id="inicio">
        <div className="hero-glow" />
        <div className="hero-word" aria-hidden="true">TETELESTAI</div>
        <div className="hero-copy">
          <span className="hero-kicker">7º Congresso de Jovens e Adolescentes</span>
          <div className="hero-lockup" role="img" aria-label="Tetelestai — João 19:30">
            <img className="hero-lockup-crown" src="/tetelestai-oficial/logo-oficial-clara.png" alt="" />
            <img className="hero-lockup-wordmark" src="/tetelestai-oficial/logo-oficial-clara.png" alt="" />
          </div>
          <h1 className="sr-only">Tetelestai</h1>
          <div className="hero-details"><strong>4, 5 e 6 de setembro</strong></div>
          <CongressoCountdown />
          <a className="event-button" href={siteUrl("programacao")}>Ver programação</a>
        </div>
        <div className="scroll-hint">Explore o congresso <span>↓</span></div>
      </section>
      <section className="concept-section" aria-labelledby="concept-title">
        <div className="concept-copy">
          <span className="section-index">01</span>
          <p className="section-label">Vídeo conceito</p>
          <h2 id="concept-title">Uma mensagem.<br />Um brado.</h2>
          <p>Conheça o conceito que conduz o 7º Congresso de Jovens e Adolescentes.</p>
          <a className="concept-link" href="https://youtu.be/09zUmKqWKIE" target="_blank" rel="noreferrer">
            Assistir no YouTube <span>↗</span>
          </a>
        </div>
        <div className="concept-video">
          <iframe
            src="https://www.youtube-nocookie.com/embed/09zUmKqWKIE?rel=0"
            title="Vídeo conceito do Congresso TETELESTAI"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </section>
      <section className="event-explore">
        <div className="explore-heading"><span className="section-index">02</span><p className="section-label">Tudo em um só lugar</p><h2>Escolha o que<br />quer descobrir.</h2></div>
        <div className="explore-grid">
          <a className="explore-card featured" href={siteUrl("programacao")}><span className="card-number">01</span><div><small>Agenda completa</small><h3>Programação</h3></div><b>→</b></a>
          <a className="explore-card blue" href={siteUrl("tema")}><span className="card-number">02</span><div><small>João 19:30</small><h3>O tema</h3></div><b>→</b></a>
          <a className="explore-card music" href={siteUrl("playlist")}><span className="card-number">03</span><div><small>Playlist oficial</small><h3>Ouça agora</h3></div><b>♫</b></a>
          <a className="explore-card location" href={siteUrl("localizacao")}><span className="card-number">04</span><div><small>Como chegar</small><h3>Localização</h3></div><b>↗</b></a>
          <a className="explore-card photos" href={FOTOS_URL} target="_blank" rel="noreferrer"><span className="card-number">05</span><div><small>Álbum oficial</small><h3>Fotos</h3></div><b>↗</b></a>
        </div>
      </section>
      <EventFooter />
    </main>
  );
}
