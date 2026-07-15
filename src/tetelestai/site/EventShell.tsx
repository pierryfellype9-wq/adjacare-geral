import type { ReactNode } from "react";
import StoreHeaderButton from "./loja/StoreHeaderButton";
import { siteUrl } from "./links";

export function EventHeader() {
  return (
    <header className="event-nav event-nav-solid">
      <a href={siteUrl()} className="event-brand" aria-label="Tetelestai 2026">
        <img src="/tetelestai-oficial/logo-oficial-clara.png" alt="" />
        <span>7º Congresso • 2026</span>
      </a>
      <nav aria-label="Navegação principal">
        <a href={siteUrl("tema")}>Tema</a>
        <a href={siteUrl("programacao")}>Programação</a>
        <a href={siteUrl("playlist")}>Playlist</a>
        <a href={siteUrl("fotos")}>Fotos</a>
        <a href={siteUrl("localizacao")}>Local</a>
      </nav>
      <StoreHeaderButton />
    </header>
  );
}

export function EventFooter() {
  return (
    <footer className="event-footer">
      <img src="/tetelestai-oficial/logo-oficial-clara.png" alt="Tetelestai" />
      <p>7º Congresso de Jovens e Adolescentes</p>
      <a href="https://instagram.com/adjacare" target="_blank" rel="noreferrer">@adjacare</a>
    </footer>
  );
}

export function InnerPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <main className="event-site inner-site">
      <EventHeader />
      <section className="inner-hero">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <div aria-hidden="true">TETELESTAI</div>
      </section>
      {children}
      <EventFooter />
    </main>
  );
}
