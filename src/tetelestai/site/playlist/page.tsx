import { InnerPage } from "../EventShell";

const plataformas = [
  {
    nome: "Spotify",
    classe: "spotify",
    sigla: "S",
    texto: "Ouça a playlist oficial no Spotify.",
    link: "https://open.spotify.com/playlist/3IYQhbL6PGXNVTtaHrM9ik",
  },
  {
    nome: "Deezer",
    classe: "deezer",
    sigla: "D",
    texto: "Acompanhe os hinos pelo Deezer.",
    link: "https://link.deezer.com/s/33QJimJgu1EQLz5eFzJQm",
  },
  {
    nome: "YouTube Music",
    classe: "youtube",
    sigla: "▶",
    texto: "Escute pelo YouTube Music.",
    link: "https://music.youtube.com/playlist?list=PLHA9uKKSZLgM&si=4wprA_qZWfT6Pt4b",
  },
];

export default function Playlist() {
  return <InnerPage eyebrow="Prepare o coração" title="Playlist oficial">
    <section className="standalone-playlist playlist-hub">
      <div className="playlist-intro">
        <span>Três plataformas. Uma só adoração.</span>
        <h2>O som do Tetelestai.</h2>
        <p>Escolha onde prefere ouvir e aprenda os hinos que estarão conosco durante o congresso.</p>
      </div>
      <div className="playlist-platforms">
        {plataformas.map(plataforma => <a key={plataforma.nome} className={`playlist-platform ${plataforma.classe}`} href={plataforma.link} target="_blank" rel="noreferrer">
          <i aria-hidden="true">{plataforma.sigla}</i>
          <div><small>Ouvir em</small><strong>{plataforma.nome}</strong><p>{plataforma.texto}</p></div>
          <b aria-hidden="true">↗</b>
        </a>)}
      </div>
      <div className="spotify-frame playlist-player"><iframe title="Playlist oficial do Congresso Tetelestai 2026" src="https://open.spotify.com/embed/playlist/3IYQhbL6PGXNVTtaHrM9ik?utm_source=generator&si=37886fcdecdc4cc4" width="100%" height="352" frameBorder="0" allowFullScreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" /></div>
    </section>
  </InnerPage>;
}
