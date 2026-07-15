import { useEffect, useState } from "react";
import { EventFooter, EventHeader } from "./EventShell";
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
  return <div className="hero-countdown" aria-label="Contagem regressiva para o congresso">
    <span className="hero-countdown-label">Faltam</span>
    {Object.entries(tempo).map(([rotulo, valor]) => <div key={rotulo}><strong>{String(valor).padStart(2,"0")}</strong><small>{rotulo}</small></div>)}
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
          <img src="/tetelestai-oficial/logo-oficial-clara.png" alt="Tetelestai — João 19:30" />
          <h1 className="sr-only">Tetelestai</h1>
          <p>O brado da vitória. A dívida foi paga. A obra foi consumada.</p>
          <div className="hero-details"><strong>30 AGO</strong><i /><strong>04—06 SET</strong></div>
          <CongressoCountdown />
          <a className="event-button" href={siteUrl("programacao")}>Ver programação</a>
        </div>
        <div className="scroll-hint">Explore o congresso <span>↓</span></div>
      </section>
      <section className="event-explore">
        <div className="explore-heading"><span className="section-index">00</span><p className="section-label">Tudo em um só lugar</p><h2>Escolha o que<br />quer descobrir.</h2></div>
        <div className="explore-grid">
          <a className="explore-card featured" href={siteUrl("programacao")}><span className="card-number">01</span><div><small>Agenda completa</small><h3>Programação</h3></div><b>→</b></a>
          <a className="explore-card blue" href={siteUrl("tema")}><span className="card-number">02</span><div><small>João 19:30</small><h3>O tema</h3></div><b>→</b></a>
          <a className="explore-card music" href={siteUrl("playlist")}><span className="card-number">03</span><div><small>Playlist oficial</small><h3>Ouça agora</h3></div><b>♫</b></a>
          <a className="explore-card location" href={siteUrl("localizacao")}><span className="card-number">04</span><div><small>Como chegar</small><h3>Localização</h3></div><b>↗</b></a>
          <a className="explore-card photos" href={siteUrl("fotos")}><span className="card-number">05</span><div><small>Em breve</small><h3>Fotos</h3></div><b>→</b></a>
        </div>
      </section>
      <EventFooter />
    </main>
  );
}
