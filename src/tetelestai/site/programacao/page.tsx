import { InnerPage } from "../EventShell";
import { programacao } from "../data";

export default function Programacao() {
  const preview = window.location.pathname.toLowerCase().startsWith("/site-preview");

  if (!preview) {
    return <InnerPage eyebrow="30 de agosto • 4 a 6 de setembro" title="Programação">
      <section className="coming-page program-locked">
        <span>Em preparação</span>
        <div className="program-locked-mark" aria-hidden="true">T</div>
        <h2>Em breve,<br/>todos os detalhes.</h2>
        <p>A programação completa e os convidados serão revelados junto às próximas artes oficiais do Congresso Tetelestai 2026.</p>
        <a href="https://instagram.com/adjacare" target="_blank" rel="noreferrer">Acompanhar no Instagram ↗</a>
      </section>
    </InnerPage>;
  }

  return <InnerPage eyebrow="30 de agosto • 4 a 6 de setembro" title="Programação">
    <section className="program-intro">
      <span>Louvor e palavra</span>
      <h2>Cada encontro,<br/>uma experiência completa.</h2>
      <p>Clique em uma data para conhecer os convidados e todas as informações daquele culto.</p>
    </section>
    <section className="standalone-content program-content">
      <div className="schedule-list">{programacao.map((item,index)=><details className="schedule-item" key={`${item.data}-${item.horario}`}>
        <summary className="schedule-row"><span className="schedule-number">0{index+1}</span><div className="schedule-date"><strong>{item.data}</strong><span>{item.dia} • {item.horario}</span></div><div className="schedule-type">{item.destaque}</div><span className="schedule-open">Ver convidados <b>+</b></span></summary>
        <div className="schedule-experience">
          <article className="schedule-guest"><div className="schedule-guest-photo"><img src="/foto-convidado-provisoria.svg" alt="Foto provisória"/><span>Foto em breve</span></div><div><small>Louvor</small><h3>{item.louvor}</h3></div></article>
          <article className="schedule-guest"><div className="schedule-guest-photo"><img src="/foto-convidado-provisoria.svg" alt="Foto provisória"/><span>Foto em breve</span></div><div><small>Palavra</small><h3>{item.palavra}</h3></div></article>
          <div className="schedule-place"><small>Local</small><strong>AD Jacaré</strong><span>Av. Ver. José Donato, 913</span></div>
        </div>
      </details>)}</div>
    </section>
  </InnerPage>;
}
