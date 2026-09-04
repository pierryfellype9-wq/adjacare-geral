import { InnerPage } from "../EventShell";

const cultos = [
  {
    data: "04/09", dia: "Sexta-feira", horario: "19h30", destaque: "Culto de abertura",
    convidados: [
      { tipo: "Palavra", nome: "Pr. Otoniel Gomes", foto: "/tetelestai-oficial/programacao/sextap-1.webp", posicao: "50% 37%" },
      { tipo: "Louvor", nome: "Grupo Elas Louvam", foto: "/tetelestai-oficial/programacao/sextal-2.webp", posicao: "50% 38%" },
    ],
  },
  {
    data: "05/09", dia: "Sábado", horario: "19h", destaque: "Culto de celebração",
    convidados: [
      { tipo: "Palavra", nome: "Pr. Jailson Marinho", foto: "/tetelestai-oficial/programacao/sabp-1.webp", posicao: "50% 36%" },
      { tipo: "Louvor", nome: "Gabriel Miranda", foto: "/tetelestai-oficial/programacao/sabl-2.webp", posicao: "50% 38%" },
      { tipo: "Louvor", nome: "Viviane Rodrigues", foto: "/tetelestai-oficial/programacao/sabl-3.webp", posicao: "50% 37%" },
    ],
  },
  {
    data: "06/09", dia: "Domingo de manhã", horario: "10h", destaque: "Culto da manhã",
    convidados: [
      { tipo: "Palavra", nome: "Tatiana Hissa", foto: "/tetelestai-oficial/programacao/dommp-1.webp", posicao: "50% 42%" },
      { tipo: "Louvor", nome: "Pr. Samir Hissa", foto: "/tetelestai-oficial/programacao/domml-2.webp", posicao: "50% 42%" },
    ],
  },
  {
    data: "06/09", dia: "Domingo à noite", horario: "18h30", destaque: "Culto de encerramento",
    convidados: [
      { tipo: "Palavra", nome: "Pr. Ismael Moreira", foto: "/tetelestai-oficial/programacao/domnp-1.webp", posicao: "50% 36%" },
      { tipo: "Louvor", nome: "Matusalém e Stephany", foto: "/tetelestai-oficial/programacao/domnl-2.webp", posicao: "50% 38%" },
    ],
  },
];

export default function Programacao() {
  return <InnerPage eyebrow="4 a 6 de setembro" title="Programação">
    <section className="program-intro">
      <span>Louvor e palavra</span>
      <h2>Quatro cultos.<br/>Uma só mensagem.</h2>
      <p>Confira os horários e conheça os preletores e convidados do Congresso Tetelestai.</p>
    </section>
    <section className="standalone-content program-content">
      <div className="schedule-list">{cultos.map((culto, index) => <details className="schedule-item" key={`${culto.data}-${culto.horario}`} open={index === 0}>
        <summary className="schedule-row">
          <span className="schedule-number">0{index + 1}</span>
          <div className="schedule-date"><strong>{culto.data}</strong><span>{culto.dia} • {culto.horario}</span></div>
          <div className="schedule-type">{culto.destaque}</div>
          <span className="schedule-open">Ver convidados <b>+</b></span>
        </summary>
        <div className={`schedule-experience guests-${culto.convidados.length}`}>
          {culto.convidados.map((convidado) => <article className="schedule-guest" key={convidado.nome}>
            <div className="schedule-guest-photo"><img src={convidado.foto} alt={convidado.nome} style={{ objectPosition: convidado.posicao }}/></div>
            <div><small>{convidado.tipo}</small><h3>{convidado.nome}</h3></div>
          </article>)}
        </div>
      </details>)}</div>
    </section>
  </InnerPage>;
}
