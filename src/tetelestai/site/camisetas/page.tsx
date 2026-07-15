import { InnerPage } from "../EventShell";

const longline = [
  ["P", 68, 49], ["M", 70, 52], ["G", 72, 55], ["GG", 75, 59],
  ["XG", 78, 63], ["EXG", 81, 67], ["EXG1", 84, 70], ["EXG2", 87, 73],
];
const babyLook = [["P", 58, 43], ["M", 60, 45], ["G", 62, 47], ["GG", 64, 49]];
const infantil = [["2 anos", 43, 33], ["4 anos", 48, 35], ["6 anos", 52, 38], ["8 anos", 55, 40], ["10 anos", 58, 42], ["12 anos", 61, 44], ["14 anos", 64, 46]];

function Tabela({ dados }: { dados: (string | number)[][] }) {
  return <div className="size-table"><div className="size-row head"><span>Tamanho</span><span>Comprimento</span><span>Largura</span></div>{dados.map(([t,c,l])=><div className="size-row" key={t}><strong>{t}</strong><span>{c} cm</span><span>{l} cm</span></div>)}</div>;
}

export default function Camisetas() {
  return <InnerPage eyebrow="Loja oficial" title="Camisetas">
    <section className="official-shirts-showcase">
      <article><div><span>Cor oficial 01</span><h2>Marrom</h2><p>Coroa dourada, Tetelestai em off-white e acabamento posterior “Está consumado”.</p></div><img src="/tetelestai-oficial/camiseta-marrom-frente-costas.webp" alt="Camiseta Tetelestai marrom, frente e costas" /></article>
      <article><div><span>Cor oficial 02</span><h2>Branca</h2><p>Coroa dourada, Tetelestai em marrom e acabamento posterior “Está consumado”.</p></div><img src="/tetelestai-oficial/camiseta-branca-frente-costas.webp" alt="Camiseta Tetelestai branca, frente e costas" /></article>
    </section>
    <section className="shirts-intro">
      <span>Guia de tamanhos</span>
      <h2>Escolha pelo modelo<br />e pelas medidas.</h2>
      <p>Compare as medidas abaixo com uma camiseta que já serve bem. Não escolha somente pela letra do tamanho.</p>
    </section>
    <section className="shirt-models">
      <article className="shirt-model longline-model">
        <div className="shirt-heading"><span>01</span><div><small>Modelo tradicional</small><h2>Longline</h2></div></div>
        <p>Modelagem tradicional. Confira comprimento e largura antes de selecionar.</p>
        <Tabela dados={longline} />
      </article>
      <article className="shirt-model baby-model">
        <div className="shirt-alert">Atenção: modelo feminino</div>
        <div className="shirt-heading"><span>02</span><div><small>Camiseta feminina</small><h2>Baby Look</h2></div></div>
        <p><strong>Modelagem feminina, menor e acinturada.</strong> O tamanho não corresponde às mesmas medidas da Longline.</p>
        <Tabela dados={babyLook} />
      </article>
      <article className="shirt-model kids-model">
        <div className="shirt-heading"><span>03</span><div><small>Disponibilidade a confirmar</small><h2>Infantil</h2></div></div>
        <p>As medidas já estão preparadas, mas a venda deste modelo ainda será confirmada.</p>
        <Tabela dados={infantil} />
      </article>
    </section>
    <section className="measure-guide"><div><span>Como medir</span><h2>Use uma camiseta que já veste bem.</h2></div><ol><li><strong>Comprimento</strong><span>Meça do ponto mais alto do ombro até a barra.</span></li><li><strong>Largura</strong><span>Meça de uma axila à outra, com a camiseta aberta e reta.</span></li><li><strong>Compare</strong><span>Escolha o modelo e a medida mais próximos da peça usada como referência.</span></li></ol></section>
  </InnerPage>;
}
