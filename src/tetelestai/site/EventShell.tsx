import type { ReactNode } from "react";
import { siteUrl } from "./links";

export const FOTOS_URL = "https://drive.google.com/drive/folders/1GkhbK55cGwVv4t0xDyejwGqOva7lTLYk?usp=drive_link";

export function EventHeader() {
  return (
    <header className="event-nav event-nav-solid">
      <a href={siteUrl()} className="event-brand" aria-label="Tetelestai 2026">
        <img src="/tetelestai-oficial/tetelestai-letreiro.png" alt="Tetelestai" />
      </a>
      <nav aria-label="Navegação principal">
        <a href={siteUrl("tema")}>Tema</a>
        <a href={siteUrl("programacao")}>Programação</a>
        <a href={siteUrl("playlist")}>Playlist</a>
        <a href={FOTOS_URL} target="_blank" rel="noreferrer">Fotos</a>
        <a href={siteUrl("localizacao")}>Local</a>
      </nav>
    </header>
  );
}

export function EventFooter() {
  return (
    <footer className="event-footer">
      <img src="/tetelestai-oficial/coroa.png" alt="" />
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
