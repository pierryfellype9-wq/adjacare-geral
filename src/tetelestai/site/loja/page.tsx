"use client";

import { useEffect, useMemo, useState } from "react";
import { EventFooter, EventHeader } from "../EventShell";
import { supabaseRest } from "./supabase-rest";
import { siteUrl } from "../links";

type Variacao = { id:string; modelo:string; publico?:string; aviso_modelagem?:string; tamanho:string; comprimento_cm?:number; largura_cm?:number; preco_adicional:number; estoque?:number|null; ativa:boolean };
type Produto = { id:string; nome:string; descricao?:string; imagem_principal_url?:string; preco:number; destaque:boolean; controlar_estoque:boolean; loja_variacoes:Variacao[] };
type Config = { loja_ativa:boolean; titulo_vitrine:string; descricao_vitrine?:string; mensagem_loja_fechada:string; aceitar_pix:boolean; aceitar_cartao:boolean; aceitar_retirada:boolean; exigir_confirmacao_medidas:boolean; retirada_data?:string; retirada_inicio?:string; retirada_fim?:string; retirada_local?:string; retirada_instrucoes?:string };
type Item = { chave:string; produto:Produto; variacao:Variacao; quantidade:number };

const dinheiro = (v:number) => v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const telefoneLimpo = (v:string) => v.replace(/\D/g, "");

export default function LojaPublica() {
  const [config, setConfig] = useState<Config|null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carrinho, setCarrinho] = useState<Item[]>([]);
  const [produto, setProduto] = useState<Produto|null>(null);
  const [variacaoId, setVariacaoId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [checkout, setCheckout] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState<{numero:number; forma:string}|null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([
      supabaseRest("loja_configuracoes?chave=eq.tetelestai-2026&select=*&limit=1"),
      supabaseRest("loja_produtos?publicado=eq.true&select=*,loja_variacoes(*)&order=destaque.desc,ordem.asc"),
    ]).then(([c,p]) => { setConfig(c[0] || null); setProdutos((p || []).map((x:Produto) => ({...x, loja_variacoes:(x.loja_variacoes || []).filter(v => v.ativa)}))); }).catch(() => setErro("Não foi possível carregar a loja agora.")).finally(() => setCarregando(false));
  }, []);

  const total = useMemo(() => carrinho.reduce((s,i) => s + (Number(i.produto.preco) + Number(i.variacao.preco_adicional || 0)) * i.quantidade, 0), [carrinho]);
  const selecionada = produto?.loja_variacoes.find(v => v.id === variacaoId);

  function abrirProduto(p:Produto) { setProduto(p); setVariacaoId(""); setQuantidade(1); }
  function adicionar() {
    if (!produto || !selecionada) return;
    const chave = `${produto.id}-${selecionada.id}`;
    setCarrinho(atual => atual.some(i => i.chave === chave) ? atual.map(i => i.chave === chave ? {...i, quantidade:i.quantidade + quantidade}:i) : [...atual,{chave,produto,variacao:selecionada,quantidade}]);
    setProduto(null);
  }
  function alterarQuantidade(chave:string, valor:number) { setCarrinho(c => valor < 1 ? c.filter(i => i.chave !== chave) : c.map(i => i.chave === chave ? {...i,quantidade:valor}:i)); }

  async function finalizar(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro(""); setEnviando(true);
    const fd = new FormData(e.currentTarget); const forma = String(fd.get("forma") || "retirada");
    try {
      const clientePayload = { nome_completo:String(fd.get("nome") || "").trim(), celular:telefoneLimpo(String(fd.get("celular") || "")), email:String(fd.get("email") || "").trim().toLowerCase(), origem:"site", whatsapp_opt_in:Boolean(fd.get("whatsapp")), atualizado_em:new Date().toISOString() };
      if (clientePayload.celular.length < 10) throw new Error("Informe um celular válido com DDD.");
      const existentes = await supabaseRest(`loja_clientes?celular=eq.${clientePayload.celular}&select=id&limit=1`);
      let clienteId = existentes[0]?.id;
      if (clienteId) await supabaseRest(`loja_clientes?id=eq.${clienteId}`, { method:"PATCH", body:JSON.stringify(clientePayload) });
      else { const criado = await supabaseRest("loja_clientes", { method:"POST", headers:{Prefer:"return=representation"}, body:JSON.stringify(clientePayload) }); clienteId = criado[0].id; }
      const pedidoPayload = { cliente_id:clienteId, origem:"site", status:forma === "retirada" ? "pagamento_na_retirada":"aguardando_pagamento", forma_pagamento:forma, status_pagamento:forma === "retirada" ? "na_retirada":"pendente", subtotal:total, desconto:0, total, confirmou_medidas:Boolean(fd.get("medidas")), observacoes_cliente:String(fd.get("observacoes") || "") };
      const pedido = await supabaseRest("loja_pedidos", { method:"POST", headers:{Prefer:"return=representation"}, body:JSON.stringify(pedidoPayload) });
      await supabaseRest("loja_pedido_itens", { method:"POST", body:JSON.stringify(carrinho.map(i => ({ pedido_id:pedido[0].id, produto_id:i.produto.id, variacao_id:i.variacao.id, produto_nome:i.produto.nome, modelo:i.variacao.modelo, publico:i.variacao.publico, tamanho:i.variacao.tamanho, comprimento_cm:i.variacao.comprimento_cm, largura_cm:i.variacao.largura_cm, quantidade:i.quantidade, valor_unitario:Number(i.produto.preco)+Number(i.variacao.preco_adicional || 0), valor_total:(Number(i.produto.preco)+Number(i.variacao.preco_adicional || 0))*i.quantidade })))});
      fetch("/api/email-loja", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ pedido_id:pedido[0].id, tipo:"pedido_criado" }) }).catch(() => {});
      setConcluido({numero:pedido[0].numero, forma}); setCarrinho([]); setCheckout(false);
    } catch (err) { setErro(err instanceof Error ? err.message : "Não foi possível concluir seu pedido."); } finally { setEnviando(false); }
  }

  return <main className="event-site store-site"><EventHeader />
    <section className="store-hero"><span>Loja oficial</span><h1>{config?.titulo_vitrine || "Camisetas Tetelestai"}</h1><p>{config?.descricao_vitrine || "Escolha seu modelo, confira cuidadosamente as medidas e monte seu pedido."}</p><div className="store-hero-meta"><b>SEM ENTREGA</b><span>Retirada única na igreja</span></div></section>
    {carregando && <section className="store-loading">Preparando a loja...</section>}
    {!carregando && (!config?.loja_ativa || !produtos.length) && <section className="store-closed"><span>Em preparação</span><h2>A coleção está chegando.</h2><p>{config?.mensagem_loja_fechada || "Em breve, as camisetas estarão disponíveis para pedido."}</p><a href={siteUrl("camisetas")}>Consultar guia de medidas</a></section>}
    {!carregando && config?.loja_ativa && produtos.length > 0 && <>
      <section className="store-toolbar"><div><span>{produtos.length} produto(s)</span><strong>Escolha sua camiseta</strong></div><button onClick={() => setCheckout(true)} disabled={!carrinho.length}>Sacola <b>{carrinho.reduce((s,i)=>s+i.quantidade,0)}</b> — {dinheiro(total)}</button></section>
      <section className="store-products">{produtos.map(p => <article className="store-product" key={p.id} onClick={() => abrirProduto(p)}><div className="store-product-image">{p.imagem_principal_url ? <img src={p.imagem_principal_url} alt={p.nome}/> : <div><span>IMAGEM EM BREVE</span><b>TETELESTAI</b></div>}{p.destaque && <em>Destaque</em>}</div><div className="store-product-info"><span>{[...new Set(p.loja_variacoes.map(v=>v.modelo))].join(" • ")}</span><h2>{p.nome}</h2><p>A partir de <strong>{dinheiro(Number(p.preco))}</strong></p><button>Escolher modelo e tamanho</button></div></article>)}</section>
      <section className="store-assurance"><article><span>01</span><h3>Confira as medidas</h3><p>Compare com uma camiseta que já vista bem. Não escolha apenas pela letra.</p></article><article><span>02</span><h3>Baby Look é feminina</h3><p>Modelagem menor e acinturada, sempre identificada antes da compra.</p></article><article><span>03</span><h3>Retirada única</h3><p>Não haverá entrega. Todos os pedidos serão retirados no dia informado.</p></article></section>
    </>}

    {produto && <div className="store-overlay" role="dialog" aria-modal="true"><section className="product-modal"><button className="modal-close" onClick={() => setProduto(null)}>Fechar ×</button><div className="product-modal-image">{produto.imagem_principal_url ? <img src={produto.imagem_principal_url} alt={produto.nome}/> : <b>TETELESTAI</b>}</div><div className="product-modal-copy"><span>Produto oficial</span><h2>{produto.nome}</h2><p>{produto.descricao}</p><strong className="product-price">{dinheiro(Number(produto.preco) + Number(selecionada?.preco_adicional || 0))}</strong><label>Modelo e tamanho<select value={variacaoId} onChange={e => setVariacaoId(e.target.value)}><option value="">Selecione</option>{produto.loja_variacoes.map(v => <option key={v.id} value={v.id} disabled={produto.controlar_estoque && v.estoque === 0}>{v.modelo}{v.publico === "Feminino" ? " — CAMISETA FEMININA":""} — {v.tamanho} — {v.comprimento_cm} × {v.largura_cm} cm{produto.controlar_estoque && v.estoque === 0 ? " — ESGOTADO":""}</option>)}</select></label>{selecionada && <div className={`variant-confirm ${selecionada.publico === "Feminino" ? "feminine":""}`}><b>{selecionada.modelo}{selecionada.publico === "Feminino" ? " — CAMISETA FEMININA":""}</b><span>Tamanho {selecionada.tamanho} • {selecionada.comprimento_cm} cm de comprimento • {selecionada.largura_cm} cm de largura</span>{selecionada.aviso_modelagem && <small>{selecionada.aviso_modelagem}</small>}</div>}<label>Quantidade<input type="number" min="1" max={selecionada?.estoque || 99} value={quantidade} onChange={e => setQuantidade(Math.max(1,Number(e.target.value)))}/></label><button className="store-primary" disabled={!selecionada} onClick={adicionar}>Adicionar à sacola</button><a href={siteUrl("camisetas")}>Como medir corretamente?</a></div></section></div>}

    {checkout && <div className="store-overlay" role="dialog" aria-modal="true"><section className="cart-modal"><button className="modal-close" onClick={() => setCheckout(false)}>Continuar comprando ×</button><div className="cart-title"><span>Sua sacola</span><h2>Revise cada modelo.</h2></div><div className="cart-layout"><div className="cart-items">{carrinho.map(i => <article key={i.chave}><div><b>{i.produto.nome}</b><strong>{i.variacao.modelo}{i.variacao.publico === "Feminino" ? " — CAMISETA FEMININA":""}</strong><span>{i.variacao.tamanho} • {i.variacao.comprimento_cm} × {i.variacao.largura_cm} cm</span></div><div className="cart-qty"><button onClick={() => alterarQuantidade(i.chave,i.quantidade-1)}>−</button><b>{i.quantidade}</b><button onClick={() => alterarQuantidade(i.chave,i.quantidade+1)}>+</button></div><strong>{dinheiro((Number(i.produto.preco)+Number(i.variacao.preco_adicional||0))*i.quantidade)}</strong></article>)}<footer><span>Total</span><b>{dinheiro(total)}</b></footer></div><form className="checkout-form" onSubmit={finalizar}><h3>Seus dados</h3><label>Nome completo<input name="nome" required minLength={5}/></label><label>Celular com DDD<input name="celular" required inputMode="tel"/></label><label>E-mail<input name="email" required type="email"/></label><label>Observações<textarea name="observacoes" rows={3}/></label><h3>Pagamento</h3>{config?.aceitar_retirada && <label className="pay-option"><input type="radio" name="forma" value="retirada" defaultChecked required/><span><b>Pagamento na retirada</b><small>Dinheiro, Pix ou cartão no dia, conforme disponibilidade.</small></span></label>}{config?.aceitar_pix && <label className="pay-option disabled"><input type="radio" disabled/><span><b>Pix online</b><small>Será liberado após a configuração do pagamento.</small></span></label>}{config?.aceitar_cartao && <label className="pay-option disabled"><input type="radio" disabled/><span><b>Cartão online</b><small>Será liberado após a configuração do pagamento.</small></span></label>}<label className="check-confirm"><input type="checkbox" name="medidas" required={config?.exigir_confirmacao_medidas}/><span>Conferi o modelo, o tamanho e as medidas de cada camiseta.</span></label><label className="check-confirm"><input type="checkbox" name="whatsapp"/><span>Autorizo contato pelo WhatsApp sobre este pedido.</span></label>{erro && <p className="store-error">{erro}</p>}<button className="store-primary" disabled={enviando}>{enviando ? "Criando pedido...":"Confirmar pedido"}</button></form></div></section></div>}

    {concluido && <div className="store-overlay" role="dialog" aria-modal="true"><section className="success-modal"><span>Pedido confirmado</span><h2>#{String(concluido.numero).padStart(5,"0")}</h2><p>Seu pedido foi registrado e já aparece para a equipe da igreja.</p><div><b>Pagamento na retirada</b><span>Não haverá entrega. Guarde o número do pedido.</span></div>{config?.retirada_data ? <p><strong>Retirada:</strong> {new Date(`${config.retirada_data}T12:00:00`).toLocaleDateString("pt-BR")} • {config.retirada_inicio?.slice(0,5)} às {config.retirada_fim?.slice(0,5)}<br/>{config.retirada_local}</p> : <p>A data única da retirada será divulgada pela organização.</p>}<button className="store-primary" onClick={() => setConcluido(null)}>Voltar para a loja</button></section></div>}
    {erro && !checkout && <div className="store-floating-error">{erro}</div>}<EventFooter />
  </main>;
}
