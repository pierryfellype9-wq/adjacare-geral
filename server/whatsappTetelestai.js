import { createClient } from "@supabase/supabase-js";
import { enviarEmailPedido } from "./emailLoja.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const moeda = (valor) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function atualizar(telefone, etapa, dados = {}) {
  await supabase.from("whatsapp_sessoes").update({ etapa, dados }).eq("telefone", telefone);
}

async function listarProdutos(telefone, dados, enviarLista, enviarMensagem) {
  const { data: config } = await supabase.from("loja_configuracoes").select("loja_ativa").eq("chave", "tetelestai-2026").maybeSingle();
  if (!config?.loja_ativa) {
    await enviarMensagem(telefone, "A loja Tetelestai ainda não está aberta para pedidos. Avisaremos assim que estiver disponível.");
    await atualizar(telefone, "menu", {});
    return;
  }
  const { data: produtos, error } = await supabase.from("loja_produtos").select("id,nome,descricao,preco").eq("publicado", true).order("destaque", { ascending: false }).order("ordem").limit(10);
  if (error || !produtos?.length) {
    await enviarMensagem(telefone, "Ainda não há camisetas publicadas para pedido.");
    await atualizar(telefone, "menu", {});
    return;
  }
  await atualizar(telefone, "tetelestai_produto", { ...dados, produtos });
  await enviarLista(telefone, {
    cabecalho: "Camisetas Tetelestai 2026",
    corpo: "Escolha a camiseta que deseja adicionar ao pedido.",
    botao: "Ver camisetas",
    secoes: [{ titulo: "Produtos disponíveis", rows: produtos.map((p) => ({ id: `tet_produto:${p.id}`, title: p.nome.slice(0, 24), description: `A partir de ${moeda(p.preco)}`.slice(0, 72) })) }],
  });
}

function resumoCarrinho(carrinho = []) {
  const itens = carrinho.map((i, n) => `${n + 1}. ${i.quantidade}× ${i.produto_nome}\n   ${i.modelo}${i.publico === "Feminino" ? " — CAMISETA FEMININA" : ""} • ${i.tamanho} • ${i.comprimento_cm || "—"} × ${i.largura_cm || "—"} cm\n   ${moeda(i.valor_total)}`).join("\n\n");
  const total = carrinho.reduce((s, i) => s + Number(i.valor_total), 0);
  return `${itens}\n\n*Total: ${moeda(total)}*`;
}

export async function iniciarPedidoTetelestai({ telefone, enviarMensagem }) {
  await atualizar(telefone, "tetelestai_nome", { carrinho: [] });
  await enviarMensagem(telefone, `*Pedido de camisetas Tetelestai 2026*\n\nVamos fazer seu cadastro antes de montar o pedido.\n\nInforme seu *nome completo*:`);
}

export async function processarPedidoTetelestai({ telefone, texto, sessao, enviarMensagem, enviarLista, enviarBotoes }) {
  if (!sessao.etapa?.startsWith("tetelestai_")) return false;
  const dados = sessao.dados || {};

  if (sessao.etapa === "tetelestai_nome") {
    if (texto.trim().length < 5 || !texto.trim().includes(" ")) {
      await enviarMensagem(telefone, "Informe seu nome completo, com nome e sobrenome.");
      return true;
    }
    await atualizar(telefone, "tetelestai_email", { ...dados, nome_completo: texto.trim() });
    await enviarMensagem(telefone, `Agora informe seu *e-mail*:\n\nExemplo: nome@email.com`);
    return true;
  }

  if (sessao.etapa === "tetelestai_email") {
    const email = texto.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await enviarMensagem(telefone, "Esse e-mail não parece válido. Confira e envie novamente.");
      return true;
    }
    const clientePayload = { nome_completo: dados.nome_completo, celular: telefone.replace(/\D/g, ""), email, origem: "whatsapp", whatsapp_opt_in: true, atualizado_em: new Date().toISOString() };
    const { data: existente } = await supabase.from("loja_clientes").select("id").eq("celular", clientePayload.celular).maybeSingle();
    let clienteId = existente?.id;
    if (clienteId) await supabase.from("loja_clientes").update(clientePayload).eq("id", clienteId);
    else {
      const { data: criado, error } = await supabase.from("loja_clientes").insert(clientePayload).select("id").single();
      if (error) { await enviarMensagem(telefone, `Não foi possível cadastrar seus dados: ${error.message}`); return true; }
      clienteId = criado.id;
    }
    const novosDados = { ...dados, email, cliente_id: clienteId, carrinho: dados.carrinho || [] };
    const { data: pedidos } = await supabase.from("loja_pedidos").select("numero,status,total").eq("cliente_id", clienteId).neq("status", "cancelado").order("criado_em", { ascending: false }).limit(3);
    if (pedidos?.length) {
      await atualizar(telefone, "tetelestai_cliente_existente", { ...novosDados, pedidos_existentes: pedidos });
      await enviarBotoes(telefone, {
        corpo: `Encontrei ${pedidos.length === 1 ? "um pedido" : "pedidos"} no seu cadastro.\n\n${pedidos.map(p => `#${String(p.numero).padStart(5,"0")} • ${p.status.replaceAll("_"," ")} • ${moeda(p.total)}`).join("\n")}\n\nDeseja fazer um novo pedido?`,
        botoes: [{ id: "tet_novo", title: "Novo pedido" }, { id: "tet_consultar", title: "Só consultar" }, { id: "tet_cancelar", title: "Cancelar" }],
      });
    } else await listarProdutos(telefone, novosDados, enviarLista, enviarMensagem);
    return true;
  }

  if (sessao.etapa === "tetelestai_cliente_existente") {
    if (texto === "tet_novo") { await listarProdutos(telefone, { ...dados, carrinho: [] }, enviarLista, enviarMensagem); return true; }
    if (texto === "tet_consultar") {
      await enviarMensagem(telefone, `Seus pedidos:\n\n${(dados.pedidos_existentes || []).map(p => `#${String(p.numero).padStart(5,"0")} • ${p.status.replaceAll("_"," ")} • ${moeda(p.total)}`).join("\n")}\n\nEnvie *menu* para voltar ao início.`);
      await atualizar(telefone, "menu", {}); return true;
    }
    if (texto === "tet_cancelar") { await atualizar(telefone, "menu", {}); await enviarMensagem(telefone, "Operação cancelada. Envie *menu* quando precisar."); return true; }
    await enviarMensagem(telefone, "Escolha uma das opções exibidas nos botões."); return true;
  }

  if (sessao.etapa === "tetelestai_produto") {
    if (!texto.startsWith("tet_produto:")) { await enviarMensagem(telefone, "Selecione uma camiseta pela lista."); return true; }
    const produtoId = texto.split(":")[1];
    const produto = (dados.produtos || []).find(p => p.id === produtoId);
    const { data: variacoes } = await supabase.from("loja_variacoes").select("*").eq("produto_id", produtoId).eq("ativa", true).order("ordem");
    const disponiveis = (variacoes || []).filter(v => v.estoque !== 0);
    const modelos = [...new Set(disponiveis.map(v => v.modelo))];
    if (!produto || !modelos.length) { await enviarMensagem(telefone, "Esse produto está sem modelos disponíveis no momento."); return true; }
    await atualizar(telefone, "tetelestai_modelo", { ...dados, produto, variacoes: disponiveis, modelos });
    await enviarLista(telefone, { cabecalho: produto.nome, corpo: "Escolha o modelo. Baby Look é camiseta feminina, com modelagem menor e acinturada.", botao: "Escolher modelo", secoes: [{ titulo: "Modelos", rows: modelos.slice(0,10).map((m,i) => ({ id:`tet_modelo:${i}`, title:m.slice(0,24), description:(m === "Baby Look" ? "CAMISETA FEMININA" : "Modelagem disponível").slice(0,72) })) }] });
    return true;
  }

  if (sessao.etapa === "tetelestai_modelo") {
    const indice = Number(texto.split(":")[1]);
    const modelo = dados.modelos?.[indice];
    if (!texto.startsWith("tet_modelo:") || !modelo) { await enviarMensagem(telefone, "Escolha o modelo pela lista."); return true; }
    const variacoes = (dados.variacoes || []).filter(v => v.modelo === modelo).slice(0,10);
    await atualizar(telefone, "tetelestai_tamanho", { ...dados, modelo });
    await enviarLista(telefone, { cabecalho: `${dados.produto.nome} — ${modelo}`.slice(0,60), corpo: modelo === "Baby Look" ? "Atenção: Baby Look é CAMISETA FEMININA, menor e acinturada. Confira as medidas." : "Escolha o tamanho conferindo comprimento e largura.", botao:"Escolher tamanho", secoes:[{ titulo:"Tamanhos e medidas", rows:variacoes.map(v => ({ id:`tet_variacao:${v.id}`, title:`${v.tamanho} • ${v.comprimento_cm || "—"}×${v.largura_cm || "—"} cm`.slice(0,24), description:`${modelo}${v.publico === "Feminino" ? " — CAMISETA FEMININA" : ""}`.slice(0,72) })) }] });
    return true;
  }

  if (sessao.etapa === "tetelestai_tamanho") {
    if (!texto.startsWith("tet_variacao:")) { await enviarMensagem(telefone, "Escolha um tamanho pela lista."); return true; }
    const variacao = (dados.variacoes || []).find(v => v.id === texto.split(":")[1]);
    if (!variacao) { await enviarMensagem(telefone, "Tamanho indisponível. Escolha novamente."); return true; }
    await atualizar(telefone, "tetelestai_quantidade", { ...dados, variacao });
    await enviarLista(telefone, { cabecalho:"Quantidade", corpo:`${dados.produto.nome}\n${variacao.modelo}${variacao.publico === "Feminino" ? " — CAMISETA FEMININA" : ""} • ${variacao.tamanho}\n${variacao.comprimento_cm || "—"} × ${variacao.largura_cm || "—"} cm`, botao:"Escolher quantidade", secoes:[{ titulo:"Quantidade", rows:Array.from({length:10},(_,i)=>({id:`tet_qtd:${i+1}`,title:`${i+1} unidade${i ? "s" : ""}`})) }] });
    return true;
  }

  if (sessao.etapa === "tetelestai_quantidade") {
    const quantidade = Number(texto.split(":")[1]);
    if (!texto.startsWith("tet_qtd:") || quantidade < 1 || quantidade > 10) { await enviarMensagem(telefone, "Escolha uma quantidade entre 1 e 10 pela lista."); return true; }
    const v = dados.variacao, p = dados.produto, unitario = Number(p.preco) + Number(v.preco_adicional || 0);
    const item = { produto_id:p.id, variacao_id:v.id, produto_nome:p.nome, modelo:v.modelo, publico:v.publico, tamanho:v.tamanho, comprimento_cm:v.comprimento_cm, largura_cm:v.largura_cm, quantidade, valor_unitario:unitario, valor_total:unitario*quantidade };
    const carrinho = [...(dados.carrinho || [])];
    const igual = carrinho.find(i => i.variacao_id === item.variacao_id);
    if (igual) { igual.quantidade += quantidade; igual.valor_total = igual.quantidade * igual.valor_unitario; } else carrinho.push(item);
    const novosDados = { ...dados, carrinho };
    await atualizar(telefone, "tetelestai_pos_item", novosDados);
    await enviarBotoes(telefone, { corpo:`Item adicionado.\n\n${resumoCarrinho(carrinho)}\n\nO que deseja fazer?`, botoes:[{id:"tet_adicionar",title:"Adicionar outra"},{id:"tet_revisar",title:"Revisar pedido"},{id:"tet_cancelar",title:"Cancelar"}] });
    return true;
  }

  if (sessao.etapa === "tetelestai_pos_item") {
    if (texto === "tet_adicionar") { await listarProdutos(telefone, dados, enviarLista, enviarMensagem); return true; }
    if (texto === "tet_cancelar") { await atualizar(telefone,"menu",{}); await enviarMensagem(telefone,"Pedido cancelado. Nenhuma informação de pedido foi salva."); return true; }
    if (texto === "tet_revisar") {
      await atualizar(telefone,"tetelestai_confirmacao",dados);
      await enviarBotoes(telefone,{ corpo:`*Confira cuidadosamente:*\n\n${resumoCarrinho(dados.carrinho)}\n\nAo confirmar, você declara que conferiu modelo, tamanho e medidas. Não haverá entrega; a retirada será na igreja.`, botoes:[{id:"tet_confirmar",title:"Confirmar pedido"},{id:"tet_adicionar",title:"Adicionar outra"},{id:"tet_cancelar",title:"Cancelar"}] });
      return true;
    }
    await enviarMensagem(telefone,"Escolha uma das opções exibidas."); return true;
  }

  if (sessao.etapa === "tetelestai_confirmacao") {
    if (texto === "tet_adicionar") { await listarProdutos(telefone,dados,enviarLista,enviarMensagem); return true; }
    if (texto === "tet_cancelar") { await atualizar(telefone,"menu",{}); await enviarMensagem(telefone,"Pedido cancelado. Nenhum pedido foi gerado."); return true; }
    if (texto !== "tet_confirmar") { await enviarMensagem(telefone,"Use os botões para confirmar, adicionar outra camiseta ou cancelar."); return true; }
    const total = (dados.carrinho || []).reduce((s,i)=>s+Number(i.valor_total),0);
    const { data: pedido, error } = await supabase.from("loja_pedidos").insert({ cliente_id:dados.cliente_id, origem:"whatsapp", status:"pagamento_na_retirada", forma_pagamento:"retirada", status_pagamento:"na_retirada", subtotal:total, desconto:0, total, confirmou_medidas:true, observacoes_cliente:"Pedido realizado pelo WhatsApp da igreja." }).select("id,numero").single();
    if (error) { await enviarMensagem(telefone,`Não foi possível gerar o pedido: ${error.message}`); return true; }
    const itens = dados.carrinho.map(({produto_id,variacao_id,produto_nome,modelo,publico,tamanho,comprimento_cm,largura_cm,quantidade,valor_unitario,valor_total}) => ({pedido_id:pedido.id,produto_id,variacao_id,produto_nome,modelo,publico,tamanho,comprimento_cm,largura_cm,quantidade,valor_unitario,valor_total}));
    const { error: erroItens } = await supabase.from("loja_pedido_itens").insert(itens);
    if (erroItens) { await supabase.from("loja_pedidos").delete().eq("id",pedido.id); await enviarMensagem(telefone,`Não foi possível salvar os itens: ${erroItens.message}`); return true; }
    enviarEmailPedido(pedido.id,"pedido_criado").catch(()=>{});
    await atualizar(telefone,"menu",{});
    await enviarMensagem(telefone,`*Pedido confirmado!*\n\nNúmero: *#${String(pedido.numero).padStart(5,"0")}*\n${resumoCarrinho(dados.carrinho)}\n\nPagamento: na retirada.\nEntrega: não haverá entrega; a retirada será na igreja, na data informada pela organização.\n\nGuarde o número do pedido.`);
    return true;
  }

  return false;
}
