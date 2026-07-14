import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"
import { relatorioConferencia, relatorioFinanceiro, relatorioPedidos, relatorioProducao } from "./lojaRelatorios"
import "./LojaTetelestai.css"

const abas = ["Visão geral", "Produtos", "Pedidos", "Conferência e retirada", "Caixa", "Financeiro", "Clientes", "Configurações"]
const statusPedido = {
  rascunho: "Rascunho", aguardando_pagamento: "Aguardando pagamento", pago: "Pago",
  pagamento_na_retirada: "Pagamento na retirada", em_separacao: "Em separação",
  pronto_retirada: "Pronto para retirada", retirado: "Retirado", cancelado: "Cancelado",
}
const modelosBase = {
  "Longline": [["P",68,49],["M",70,52],["G",72,55],["GG",75,59],["XG",78,63],["EXG",81,67],["EXG1",84,70],["EXG2",87,73]],
  "Baby Look": [["P",58,43],["M",60,45],["G",62,47],["GG",64,49]],
  "Infantil": [["2 anos",43,33],["4 anos",48,35],["6 anos",52,38],["8 anos",55,40],["10 anos",58,42],["12 anos",61,44],["14 anos",64,46]],
}
const produtoVazio = { nome:"", slug:"", descricao:"", preco:"", publicado:false, destaque:false, controlar_estoque:false, imagem_principal_url:"" }

function moeda(v) { return Number(v || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" }) }
function dataHora(v) { return v ? new Date(v).toLocaleString("pt-BR") : "—" }
function slugify(v) { return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") }
function celular(v) { return (v || "").replace(/\D/g, "") }

export default function LojaTetelestai({ user }) {
  const [aba, setAba] = useState("Visão geral")
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState(null)
  const [produtos, setProdutos] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [clientes, setClientes] = useState([])
  const [pagamentos, setPagamentos] = useState([])
  const [produto, setProduto] = useState(null)
  const [variacoes, setVariacoes] = useState([])
  const [busca, setBusca] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [periodo, setPeriodo] = useState({ inicio:"", fim:"" })

  const permitido = user?.role === "Administrador" || user?.role === "Dirigente"

  async function carregar() {
    setLoading(true)
    const [c, p, pe, cl, pg] = await Promise.all([
      supabase.from("loja_configuracoes").select("*").eq("chave", "tetelestai-2026").single(),
      supabase.from("loja_produtos").select("*, loja_variacoes(count)").order("ordem").order("criado_em", { ascending:false }),
      supabase.from("loja_pedidos").select("*, loja_clientes(nome_completo,celular,email), loja_pedido_itens(*)").order("criado_em", { ascending:false }),
      supabase.from("loja_clientes").select("*").order("criado_em", { ascending:false }),
      supabase.from("loja_pagamentos").select("*").eq("status", "confirmado").order("criado_em", { ascending:false }),
    ])
    if (c.error && c.error.code === "42P01") alert("A loja ainda não foi instalada. Execute o SQL enviado no Supabase.")
    setConfig(c.data || null); setProdutos(p.data || []); setPedidos(pe.data || []); setClientes(cl.data || []); setPagamentos(pg.data || [])
    setLoading(false)
  }

  useEffect(() => { if (permitido) carregar() }, [permitido])

  const resumo = useMemo(() => ({
    produtos: produtos.filter(p => p.publicado).length,
    pedidos: pedidos.length,
    aguardando: pedidos.filter(p => ["aguardando_pagamento","pagamento_na_retirada"].includes(p.status)).length,
    faturamento: pedidos.filter(p => p.status !== "cancelado").reduce((s,p) => s + Number(p.total || 0), 0),
  }), [produtos, pedidos])

  async function salvarConfig(e) {
    e.preventDefault(); setSalvando(true)
    const payload = { ...config, atualizado_em:new Date().toISOString() }
    delete payload.criado_em
    const { data, error } = await supabase.from("loja_configuracoes").update(payload).eq("id", config.id).select().single()
    setSalvando(false); if (error) return alert(`Erro ao salvar: ${error.message}`)
    setConfig(data); alert("Configurações salvas.")
  }

  async function abrirProduto(item = produtoVazio) {
    setProduto({ ...item, slug:item.slug || "" })
    if (item.id) {
      const { data } = await supabase.from("loja_variacoes").select("*").eq("produto_id", item.id).order("ordem")
      setVariacoes(data || [])
    } else setVariacoes([])
  }

  async function uploadImagem(file) {
    if (!file) return null
    const ext = file.name.split(".").pop(); const path = `produtos/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from("loja-tetelestai").upload(path, file)
    if (error) throw error
    return supabase.storage.from("loja-tetelestai").getPublicUrl(path).data.publicUrl
  }

  async function salvarProduto(e) {
    e.preventDefault(); setSalvando(true)
    try {
      const file = e.currentTarget.imagem?.files?.[0]
      const imagem = file ? await uploadImagem(file) : produto.imagem_principal_url
      const payload = { ...produto, imagem_principal_url:imagem, preco:Number(produto.preco || 0), slug:produto.slug || slugify(produto.nome), atualizado_em:new Date().toISOString() }
      delete payload.loja_variacoes; delete payload.criado_em
      let salvo
      if (produto.id) {
        const { data, error } = await supabase.from("loja_produtos").update(payload).eq("id", produto.id).select().single(); if (error) throw error; salvo = data
      } else {
        delete payload.id
        const { data, error } = await supabase.from("loja_produtos").insert(payload).select().single(); if (error) throw error; salvo = data
      }
      if (variacoes.length) {
        await supabase.from("loja_variacoes").delete().eq("produto_id", salvo.id)
        const linhas = variacoes.map((v, i) => {
          const { id, criado_em, atualizado_em, ...dadosVariacao } = v
          return {
            ...dadosVariacao,
            produto_id: salvo.id,
            ordem: i,
            estoque: v.estoque === "" ? null : Number(v.estoque),
            preco_adicional: Number(v.preco_adicional || 0),
          }
        })
        const { error } = await supabase.from("loja_variacoes").insert(linhas); if (error) throw error
      }
      setProduto(null); await carregar(); setAba("Produtos")
    } catch (err) { alert(`Erro ao salvar produto: ${err.message}`) } finally { setSalvando(false) }
  }

  function adicionarModelo(modelo) {
    const publico = modelo === "Baby Look" ? "Feminino" : modelo === "Infantil" ? "Infantil" : "Tradicional"
    const aviso = modelo === "Baby Look" ? "CAMISETA FEMININA — modelagem menor e acinturada." : ""
    const novos = modelosBase[modelo].filter(([t]) => !variacoes.some(v => v.modelo === modelo && v.tamanho === t)).map(([t,c,l]) => ({ modelo, publico, aviso_modelagem:aviso, tamanho:t, comprimento_cm:c, largura_cm:l, preco_adicional:0, estoque:"", ativa:true }))
    setVariacoes([...variacoes, ...novos])
  }

  async function excluirProduto(id) {
    if (!confirm("Excluir este produto e todas as suas variações?")) return
    const { error } = await supabase.from("loja_produtos").delete().eq("id", id)
    if (error) return alert(error.message); carregar()
  }

  async function alterarStatus(pedido, status) {
    const anterior = pedido.status
    const { error } = await supabase.from("loja_pedidos").update({ status, atualizado_em:new Date().toISOString(), ...(status === "retirado" ? { retirado_em:new Date().toISOString() } : {}) }).eq("id", pedido.id)
    if (error) return alert(error.message)
    await supabase.from("loja_pedido_historico").insert({ pedido_id:pedido.id, status_anterior:anterior, status_novo:status, alterado_por:user?.nome })
    const evento = status === "pronto_retirada" ? "pronto_retirada" : status === "retirado" ? "retirada_confirmada" : status === "cancelado" ? "cancelado" : null
    if (evento) enviarEventoEmail(pedido.id, evento).catch(err => console.warn("E-mail não enviado:", err.message))
    carregar()
  }

  if (!permitido) return <main className="loja-admin"><div className="loja-alerta">Acesso permitido somente para Administrador ou Dirigente.</div></main>
  if (loading) return <main className="loja-admin"><div className="loja-alerta">Carregando a Loja Tetelestai...</div></main>

  return <main className="loja-admin">
    <header className="loja-cabecalho"><div><span>CONGRESSO TETELESTAI 2026</span><h1>Loja Tetelestai</h1><p>Gerencie produtos, pedidos, clientes e a publicação da loja.</p></div><div className={`loja-estado ${config?.loja_ativa ? "ativo":"inativo"}`}>{config?.loja_ativa ? "Loja aberta":"Loja fechada"}</div></header>
    <nav className="loja-abas">{abas.map(a => <button key={a} className={aba === a ? "selecionada":""} onClick={() => { setAba(a); setProduto(null) }}>{a}</button>)}</nav>

    {aba === "Visão geral" && <>
      <section className="loja-resumo"><article><b>{resumo.produtos}</b><span>Produtos publicados</span></article><article><b>{resumo.pedidos}</b><span>Pedidos recebidos</span></article><article><b>{resumo.aguardando}</b><span>Precisam de atenção</span></article><article><b>{moeda(resumo.faturamento)}</b><span>Total em pedidos</span></article></section>
      <section className="loja-painel"><div className="loja-painel-titulo"><div><h2>Últimos pedidos</h2><p>Acompanhe as compras mais recentes.</p></div><button onClick={() => setAba("Pedidos")}>Ver todos</button></div><TabelaPedidos pedidos={pedidos.slice(0,5)} alterarStatus={alterarStatus} /></section>
    </>}

    {aba === "Produtos" && !produto && <section className="loja-painel"><div className="loja-painel-titulo"><div><h2>Produtos</h2><p>Cadastre agora e publique quando as artes estiverem prontas.</p></div><button className="primario" onClick={() => abrirProduto()}>+ Novo produto</button></div><BarraRelatorio periodo={periodo} setPeriodo={setPeriodo} geral={() => relatorioProducao(pedidos)} periodoFn={() => relatorioProducao(pedidos,periodo.inicio,periodo.fim)} titulo="Ordem de produção" />
      <div className="produto-grade">{produtos.map(p => <article className="produto-card" key={p.id}><div className="produto-foto">{p.imagem_principal_url ? <img src={p.imagem_principal_url} alt=""/> : <span>SEM FOTO</span>}</div><div className="produto-conteudo"><div className="produto-flags"><span className={p.publicado ? "publicado":"oculto"}>{p.publicado ? "Publicado":"Oculto"}</span>{p.destaque && <span>Destaque</span>}</div><h3>{p.nome}</h3><strong>{moeda(p.preco)}</strong><small>{p.loja_variacoes?.[0]?.count || 0} variações</small><div className="produto-acoes"><button onClick={() => abrirProduto(p)}>Editar</button><button className="perigo" onClick={() => excluirProduto(p.id)}>Excluir</button></div></div></article>)}</div>
      {!produtos.length && <div className="loja-vazio"><h3>Nenhum produto cadastrado</h3><p>Você pode montar toda a estrutura agora e adicionar as fotos depois.</p></div>}
    </section>}

    {aba === "Produtos" && produto && <EditorProduto produto={produto} setProduto={setProduto} variacoes={variacoes} setVariacoes={setVariacoes} adicionarModelo={adicionarModelo} salvar={salvarProduto} cancelar={() => setProduto(null)} salvando={salvando} />}

    {aba === "Pedidos" && <section className="loja-painel"><div className="loja-painel-titulo"><div><h2>Pedidos da loja</h2><p>Os itens de diferentes modelos ficam agrupados no mesmo pedido.</p></div></div><BarraRelatorio periodo={periodo} setPeriodo={setPeriodo} geral={() => relatorioPedidos(pedidos)} periodoFn={() => relatorioPedidos(pedidos,periodo.inicio,periodo.fim)} titulo="Relatório de pedidos" /><TabelaPedidos pedidos={pedidos} alterarStatus={alterarStatus} detalhada /></section>}

    {aba === "Conferência e retirada" && <ConferenciaRetirada pedidos={pedidos} user={user} recarregar={carregar} periodo={periodo} setPeriodo={setPeriodo} />}

    {aba === "Caixa" && <Caixa pedidos={pedidos} pagamentos={pagamentos} user={user} recarregar={carregar} />}

    {aba === "Financeiro" && <Financeiro pedidos={pedidos} pagamentos={pagamentos} periodo={periodo} setPeriodo={setPeriodo} />}

    {aba === "Clientes" && <section className="loja-painel"><div className="loja-painel-titulo"><div><h2>Clientes</h2><p>Cadastros criados pelo site, WhatsApp ou atendimento manual.</p></div><input className="busca" placeholder="Buscar nome, celular ou e-mail" value={busca} onChange={e => setBusca(e.target.value)} /></div><div className="tabela-wrap"><table><thead><tr><th>Nome completo</th><th>Celular</th><th>E-mail</th><th>Origem</th><th>Cadastro</th></tr></thead><tbody>{clientes.filter(c => JSON.stringify(c).toLowerCase().includes(busca.toLowerCase())).map(c => <tr key={c.id}><td><b>{c.nome_completo}</b></td><td>{c.celular}</td><td>{c.email}</td><td>{c.origem}</td><td>{dataHora(c.criado_em)}</td></tr>)}</tbody></table></div></section>}

    {aba === "Configurações" && config && <ConfigLoja config={config} setConfig={setConfig} salvar={salvarConfig} salvando={salvando} />}
  </main>
}

function BarraRelatorio({ periodo, setPeriodo, geral, periodoFn, titulo }) {
  function gerarPeriodo(){if(!periodo.inicio||!periodo.fim)return alert("Informe a data inicial e a data final.");if(periodo.inicio>periodo.fim)return alert("A data inicial não pode ser posterior à data final.");periodoFn()}
  return <div className="relatorio-barra"><div><b>{titulo}</b><span>PDF detalhado, pronto para impressão e conferência.</span></div><label>De<input type="date" value={periodo.inicio} onChange={e=>setPeriodo({...periodo,inicio:e.target.value})}/></label><label>Até<input type="date" value={periodo.fim} onChange={e=>setPeriodo({...periodo,fim:e.target.value})}/></label><button onClick={gerarPeriodo}>Gerar por período</button><button className="primario" onClick={geral}>Gerar relatório geral</button></div>
}

async function enviarEventoEmail(pedidoId, tipo, forcar=false) {
  const resposta=await fetch("/api/email-loja",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pedido_id:pedidoId,tipo,forcar})})
  const dados=await resposta.json().catch(()=>({}))
  if(!resposta.ok) throw new Error(dados.error||"Não foi possível enviar o e-mail.")
  return dados
}

function Financeiro({ pedidos, pagamentos, periodo, setPeriodo }) {
  const [enviando,setEnviando]=useState(null)
  const validos=pedidos.filter(p=>p.status!=="cancelado"), bruto=validos.reduce((s,p)=>s+Number(p.total||0),0), recebido=pagamentos.reduce((s,p)=>s+Number(p.valor||0),0)
  const pago=id=>pagamentos.filter(x=>x.pedido_id===id).reduce((s,x)=>s+Number(x.valor||0),0)
  const pendentes=validos.filter(p=>Number(p.total)>pago(p.id)+.009)
  async function lembrar(p){setEnviando(p.id);try{await enviarEventoEmail(p.id,"lembrete_pagamento",true);alert("Lembrete enviado para o e-mail do cliente.")}catch(e){alert(e.message)}finally{setEnviando(null)}}
  return <section className="loja-painel"><div className="loja-painel-titulo"><div><h2>Financeiro</h2><p>Visão auditável dos valores recebidos e ainda pendentes.</p></div></div><section className="caixa-resumo financeiro-resumo"><article><span>Faturamento válido</span><b>{moeda(bruto)}</b></article><article><span>Total recebido</span><b>{moeda(recebido)}</b></article><article><span>Total a receber</span><b>{moeda(Math.max(0,bruto-recebido))}</b></article></section><BarraRelatorio periodo={periodo} setPeriodo={setPeriodo} geral={()=>relatorioFinanceiro(pedidos,pagamentos)} periodoFn={()=>relatorioFinanceiro(pedidos,pagamentos,periodo.inicio,periodo.fim)} titulo="Relatório financeiro"/><div className="loja-painel-titulo financeiro-titulo"><div><h3>Pagamentos pendentes</h3><p>O envio manual fica registrado; a rotina automática não envia para pedidos quitados.</p></div></div><div className="tabela-wrap"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Recebido</th><th>Saldo</th><th>Lembrete</th></tr></thead><tbody>{pendentes.map(p=><tr key={p.id}><td><b>#{String(p.numero).padStart(5,"0")}</b></td><td><b>{p.loja_clientes?.nome_completo}</b><small>{p.loja_clientes?.email}</small></td><td>{moeda(p.total)}</td><td>{moeda(pago(p.id))}</td><td><b>{moeda(Number(p.total)-pago(p.id))}</b></td><td><button disabled={enviando===p.id} onClick={()=>lembrar(p)}>{enviando===p.id?"Enviando...":"Enviar lembrete"}</button></td></tr>)}</tbody></table>{!pendentes.length&&<div className="loja-vazio">Nenhum pagamento pendente.</div>}</div></section>
}

function EditorProduto({ produto, setProduto, variacoes, setVariacoes, adicionarModelo, salvar, cancelar, salvando }) {
  function alt(i, campo, valor) { setVariacoes(variacoes.map((v,n) => n === i ? { ...v, [campo]:valor } : v)) }
  return <form className="loja-painel editor-produto" onSubmit={salvar}><div className="loja-painel-titulo"><div><h2>{produto.id ? "Editar produto":"Novo produto"}</h2><p>Fotos e informações podem ser substituídas a qualquer momento.</p></div><button type="button" onClick={cancelar}>Voltar</button></div>
    <div className="form-grid"><label>Nome do produto<input required value={produto.nome} onChange={e => setProduto({...produto,nome:e.target.value,slug:produto.id ? produto.slug : slugify(e.target.value)})}/></label><label>Endereço amigável<input required value={produto.slug} onChange={e => setProduto({...produto,slug:slugify(e.target.value)})}/></label><label>Preço base<input required type="number" min="0" step="0.01" value={produto.preco} onChange={e => setProduto({...produto,preco:e.target.value})}/></label><label>Foto principal<input name="imagem" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"/></label><label className="form-largo">Descrição<textarea rows="4" value={produto.descricao || ""} onChange={e => setProduto({...produto,descricao:e.target.value})}/></label></div>
    <div className="checks"><label><input type="checkbox" checked={produto.publicado} onChange={e => setProduto({...produto,publicado:e.target.checked})}/> Produto publicado</label><label><input type="checkbox" checked={produto.destaque} onChange={e => setProduto({...produto,destaque:e.target.checked})}/> Produto em destaque</label><label><input type="checkbox" checked={produto.controlar_estoque} onChange={e => setProduto({...produto,controlar_estoque:e.target.checked})}/> Controlar estoque</label></div>
    <div className="variacoes-topo"><div><h3>Modelos, tamanhos e medidas</h3><p>Adicione uma tabela pronta e ajuste qualquer medida quando necessário.</p></div><div><button type="button" onClick={() => adicionarModelo("Longline")}>+ Longline</button><button type="button" onClick={() => adicionarModelo("Baby Look")}>+ Baby Look feminina</button><button type="button" onClick={() => adicionarModelo("Infantil")}>+ Infantil</button></div></div>
    <div className="tabela-wrap"><table className="variacoes"><thead><tr><th>Ativa</th><th>Modelo</th><th>Público/modelagem</th><th>Tamanho</th><th>Comprimento</th><th>Largura</th><th>Acréscimo</th><th>Estoque</th><th></th></tr></thead><tbody>{variacoes.map((v,i) => <tr key={`${v.modelo}-${v.tamanho}-${i}`}><td><input type="checkbox" checked={v.ativa} onChange={e => alt(i,"ativa",e.target.checked)}/></td><td><input value={v.modelo} onChange={e => alt(i,"modelo",e.target.value)}/></td><td><input value={v.publico || ""} onChange={e => alt(i,"publico",e.target.value)}/>{v.modelo === "Baby Look" && <small>CAMISETA FEMININA</small>}</td><td><input value={v.tamanho} onChange={e => alt(i,"tamanho",e.target.value)}/></td><td><input type="number" value={v.comprimento_cm ?? ""} onChange={e => alt(i,"comprimento_cm",e.target.value)}/></td><td><input type="number" value={v.largura_cm ?? ""} onChange={e => alt(i,"largura_cm",e.target.value)}/></td><td><input type="number" step="0.01" value={v.preco_adicional} onChange={e => alt(i,"preco_adicional",e.target.value)}/></td><td><input type="number" min="0" placeholder="Ilimitado" value={v.estoque ?? ""} onChange={e => alt(i,"estoque",e.target.value)}/></td><td><button type="button" className="perigo" onClick={() => setVariacoes(variacoes.filter((_,n) => n !== i))}>×</button></td></tr>)}</tbody></table></div>
    {!variacoes.length && <div className="loja-vazio"><p>Adicione Longline, Baby Look feminina ou Infantil.</p></div>}
    <footer className="form-acoes"><button type="button" onClick={cancelar}>Cancelar</button><button className="primario" disabled={salvando}>{salvando ? "Salvando...":"Salvar produto"}</button></footer>
  </form>
}

function TabelaPedidos({ pedidos, alterarStatus, detalhada=false }) {
  if (!pedidos.length) return <div className="loja-vazio"><h3>Nenhum pedido recebido</h3><p>Os pedidos do site e WhatsApp aparecerão juntos aqui.</p></div>
  return <div className="tabela-wrap"><table><thead><tr><th>Pedido</th><th>Cliente</th>{detalhada && <th>Itens</th>}<th>Total</th><th>Pagamento</th><th>Status</th><th>Recebido</th></tr></thead><tbody>{pedidos.map(p => <tr key={p.id}><td><b>#{String(p.numero).padStart(5,"0")}</b><small>{p.origem}</small></td><td><b>{p.loja_clientes?.nome_completo}</b><small>{p.loja_clientes?.celular}</small></td>{detalhada && <td><details><summary>{p.loja_pedido_itens?.length || 0} item(ns)</summary>{p.loja_pedido_itens?.map(i => <p key={i.id}>{i.quantidade}× {i.produto_nome} — {i.modelo}{i.publico === "Feminino" ? " feminina":""} — {i.tamanho} ({i.comprimento_cm} × {i.largura_cm} cm)</p>)}</details></td>}<td><b>{moeda(p.total)}</b></td><td>{p.forma_pagamento || "—"}<small>{p.status_pagamento}</small></td><td><select value={p.status} onChange={e => alterarStatus(p,e.target.value)}>{Object.entries(statusPedido).map(([v,n]) => <option key={v} value={v}>{n}</option>)}</select></td><td>{dataHora(p.criado_em)}</td></tr>)}</tbody></table></div>
}

function ConfigLoja({ config, setConfig, salvar, salvando }) {
  const campo = (k,v) => setConfig({...config,[k]:v})
  return <form className="loja-painel" onSubmit={salvar}><div className="loja-painel-titulo"><div><h2>Configurações da loja</h2><p>Controle a publicação sem alterar o código.</p></div><button className="primario" disabled={salvando}>{salvando ? "Salvando...":"Salvar configurações"}</button></div>
    <h3>Publicação</h3><div className="checks destaque"><label><input type="checkbox" checked={Boolean(config.site_publicado)} onChange={e => campo("site_publicado",e.target.checked)}/> Site completo publicado</label><label><input type="checkbox" checked={config.loja_ativa} onChange={e => campo("loja_ativa",e.target.checked)}/> Loja aberta para pedidos</label><label><input type="checkbox" checked={config.mostrar_botao_topo} onChange={e => campo("mostrar_botao_topo",e.target.checked)}/> Mostrar botão no topo do site</label><label><input type="checkbox" checked={config.whatsapp_ativo} onChange={e => campo("whatsapp_ativo",e.target.checked)}/> Permitir pedidos pelo WhatsApp</label></div>
    <div className="form-grid"><label>Nome da loja<input value={config.nome_loja} onChange={e => campo("nome_loja",e.target.value)}/></label><label>Lançamento automático do site<input type="datetime-local" value={config.lancamento_em?.slice(0,16) || ""} onChange={e => campo("lancamento_em",e.target.value || null)}/></label><label>Texto do botão do topo<input value={config.texto_botao_topo} onChange={e => campo("texto_botao_topo",e.target.value)}/></label><label>Título da vitrine<input value={config.titulo_vitrine} onChange={e => campo("titulo_vitrine",e.target.value)}/></label><label className="form-largo">Descrição da vitrine<textarea value={config.descricao_vitrine || ""} onChange={e => campo("descricao_vitrine",e.target.value)}/></label><label>Início das vendas<input type="datetime-local" value={config.vendas_inicio?.slice(0,16) || ""} onChange={e => campo("vendas_inicio",e.target.value || null)}/></label><label>Fim das vendas<input type="datetime-local" value={config.vendas_fim?.slice(0,16) || ""} onChange={e => campo("vendas_fim",e.target.value || null)}/></label><label className="form-largo">Mensagem com a loja fechada<textarea value={config.mensagem_loja_fechada || ""} onChange={e => campo("mensagem_loja_fechada",e.target.value)}/></label></div>
    <h3>Pagamento</h3><div className="checks"><label><input type="checkbox" checked={config.aceitar_pix} onChange={e => campo("aceitar_pix",e.target.checked)}/> Pix</label><label><input type="checkbox" checked={config.aceitar_cartao} onChange={e => campo("aceitar_cartao",e.target.checked)}/> Cartão</label><label><input type="checkbox" checked={config.aceitar_retirada} onChange={e => campo("aceitar_retirada",e.target.checked)}/> Pagamento na retirada</label><label><input type="checkbox" checked={config.exigir_confirmacao_medidas} onChange={e => campo("exigir_confirmacao_medidas",e.target.checked)}/> Exigir confirmação das medidas</label></div>
    <h3>Retirada única</h3><div className="form-grid"><label>Data<input type="date" value={config.retirada_data || ""} onChange={e => campo("retirada_data",e.target.value || null)}/></label><label>Início<input type="time" value={config.retirada_inicio || ""} onChange={e => campo("retirada_inicio",e.target.value || null)}/></label><label>Fim<input type="time" value={config.retirada_fim || ""} onChange={e => campo("retirada_fim",e.target.value || null)}/></label><label className="form-largo">Local<input value={config.retirada_local || ""} onChange={e => campo("retirada_local",e.target.value)}/></label><label className="form-largo">Orientações<textarea value={config.retirada_instrucoes || ""} onChange={e => campo("retirada_instrucoes",e.target.value)}/></label></div>
  </form>
}

function localizar(pedidos, busca) {
  const termo = busca.trim().toLowerCase().replace(/^#/, "")
  if (!termo) return []
  return pedidos.filter(p => [p.numero, p.loja_clientes?.nome_completo, p.loja_clientes?.celular, p.loja_clientes?.email].some(v => String(v || "").toLowerCase().includes(termo))).slice(0, 15)
}

function ConferenciaRetirada({ pedidos, user, recarregar, periodo, setPeriodo }) {
  const [busca, setBusca] = useState("")
  const [selecionado, setSelecionado] = useState(null)
  const [checks, setChecks] = useState({})
  const [divergencia, setDivergencia] = useState("")
  const [retiradoPor, setRetiradoPor] = useState("")
  const [celularRetirada, setCelularRetirada] = useState("")
  const resultados = busca ? localizar(pedidos, busca) : pedidos

  async function abrir(p) {
    const { data } = await supabase.from("loja_conferencia_itens").select("pedido_item_id,conferido,divergencia").eq("pedido_id", p.id)
    const salvos = Object.fromEntries((data || []).map(i => [i.pedido_item_id, i.conferido]))
    setSelecionado(p); setChecks(Object.fromEntries((p.loja_pedido_itens || []).map(i => [i.id, Boolean(salvos[i.id])]))); setDivergencia((data || []).find(i => i.divergencia)?.divergencia || p.conferencia_divergencia || ""); setRetiradoPor(p.retirado_por_nome || p.loja_clientes?.nome_completo || ""); setCelularRetirada(p.retirado_por_celular || p.loja_clientes?.celular || "")
  }
  async function registrar(status) {
    if (!selecionado) return
    const todos = (selecionado.loja_pedido_itens || []).every(i => checks[i.id])
    if (["pronto_retirada", "retirado"].includes(status) && !todos) return alert("Confira todos os itens antes de continuar.")
    if (status === "retirado" && selecionado.status_pagamento !== "aprovado") return alert("O pedido ainda não está pago. Receba o pagamento na aba Caixa antes de entregar.")
    if (status === "retirado" && !retiradoPor.trim()) return alert("Informe o nome de quem está retirando.")
    const agora = new Date().toISOString()
    const dados = { status, atualizado_em: agora, conferencia_divergencia: divergencia || null, conferido_por: user?.nome, conferido_em: todos ? agora : null }
    if (status === "retirado") Object.assign(dados, { retirado_em: agora, retirado_por_nome: retiradoPor.trim(), retirado_por_celular: celularRetirada.trim(), retirado_por_operador: user?.nome })
    const { error } = await supabase.from("loja_pedidos").update(dados).eq("id", selecionado.id)
    if (error) return alert(`Erro: ${error.message}. Execute o SQL de Conferência e Caixa.`)
    await supabase.from("loja_conferencia_itens").upsert((selecionado.loja_pedido_itens || []).map(i => ({ pedido_id:selecionado.id, pedido_item_id:i.id, quantidade_conferida:checks[i.id] ? i.quantidade : 0, conferido:Boolean(checks[i.id]), divergencia:divergencia || null, conferido_por:user?.nome, conferido_em:checks[i.id] ? agora : null })), { onConflict:"pedido_item_id" })
    await supabase.from("loja_pedido_historico").insert({ pedido_id:selecionado.id, status_anterior:selecionado.status, status_novo:status, descricao:status === "retirado" ? `Retirado por ${retiradoPor}` : divergencia || "Conferência registrada", alterado_por:user?.nome })
    const evento=status==="retirado"?"retirada_confirmada":status==="pronto_retirada"?"pronto_retirada":null;if(evento)enviarEventoEmail(selecionado.id,evento).catch(err=>console.warn("E-mail não enviado:",err.message));alert(status === "retirado" ? "Retirada registrada com sucesso." : "Conferência salva."); setSelecionado(null); setBusca(""); await recarregar()
  }
  return <section className="loja-painel operacao"><div className="loja-painel-titulo"><div><h2>Conferência e retirada</h2><p>Localize, confira peça por peça e registre quem recebeu o pedido.</p></div></div>
    <BarraRelatorio periodo={periodo} setPeriodo={setPeriodo} geral={() => relatorioConferencia(pedidos)} periodoFn={() => relatorioConferencia(pedidos,periodo.inicio,periodo.fim)} titulo="Mapa para separação" />
    <input className="busca busca-grande" autoFocus placeholder="Pedido, nome, celular ou e-mail" value={busca} onChange={e => setBusca(e.target.value)} />
    {!selecionado && <><div className="lista-contagem">{resultados.length} pedido(s) {busca ? "encontrado(s)":"no total"}</div><div className="resultado-lista resultado-todos">{resultados.map(p => <button key={p.id} onClick={() => abrir(p)}><b>#{String(p.numero).padStart(5,"0")} · {p.loja_clientes?.nome_completo}</b><span>{p.loja_clientes?.celular} · {(p.loja_pedido_itens||[]).reduce((s,i)=>s+Number(i.quantidade||0),0)} peça(s) · {moeda(p.total)} · {statusPedido[p.status]}</span></button>)}{!resultados.length && <p>Nenhum pedido encontrado.</p>}</div></>}
    {selecionado && <div className="operacao-grid"><div><div className="pedido-identificacao"><strong>#{String(selecionado.numero).padStart(5,"0")}</strong><div><h3>{selecionado.loja_clientes?.nome_completo}</h3><p>{selecionado.loja_clientes?.celular} · {selecionado.loja_clientes?.email}</p></div><button onClick={() => setSelecionado(null)}>Trocar pedido</button></div>
      <div className="check-itens">{selecionado.loja_pedido_itens?.map(i => <label key={i.id} className={checks[i.id] ? "ok":""}><input type="checkbox" checked={Boolean(checks[i.id])} onChange={e => setChecks({...checks,[i.id]:e.target.checked})}/><span><b>{i.quantidade}× {i.produto_nome}</b><small>{i.modelo}{i.publico === "Feminino" ? " · CAMISETA FEMININA" : ""} · {i.tamanho} · {i.comprimento_cm} × {i.largura_cm} cm</small></span></label>)}</div></div>
      <aside className="operacao-lateral"><div className={`pagamento-selo ${selecionado.status_pagamento === "aprovado" ? "pago":"pendente"}`}>{selecionado.status_pagamento === "aprovado" ? "PAGAMENTO CONFIRMADO" : "PAGAMENTO PENDENTE"}</div><label>Divergência ou observação<textarea rows="3" value={divergencia} onChange={e => setDivergencia(e.target.value)}/></label><label>Nome de quem retirou<input value={retiradoPor} onChange={e => setRetiradoPor(e.target.value)}/></label><label>Celular de quem retirou<input value={celularRetirada} onChange={e => setCelularRetirada(e.target.value)}/></label><button onClick={() => registrar("em_separacao")}>Salvar separação</button><button className="primario" onClick={() => registrar("pronto_retirada")}>Marcar pronto</button><button className="entregar" onClick={() => registrar("retirado")}>Confirmar entrega</button></aside></div>}
  </section>
}

function Caixa({ pedidos, pagamentos, user, recarregar }) {
  const [caixa, setCaixa] = useState(null), [busca, setBusca] = useState(""), [pedido, setPedido] = useState(null)
  const [inicial, setInicial] = useState("0"), [forma, setForma] = useState("dinheiro"), [valor, setValor] = useState(""), [recebido, setRecebido] = useState("")
  const [resumo, setResumo] = useState({ total:0, dinheiro:0, suprimentos:0, sangrias:0 })
  useEffect(() => { supabase.from("loja_caixas").select("*").eq("status","aberto").order("aberto_em",{ascending:false}).limit(1).maybeSingle().then(({data}) => setCaixa(data || null)) }, [])
  async function abrirCaixa() { const {data,error}=await supabase.from("loja_caixas").insert({aberto_por:user?.nome,valor_inicial:Number(inicial||0)}).select().single(); if(error)return alert(`Erro: ${error.message}. Execute o SQL de Conferência e Caixa.`); setCaixa(data) }
  async function atualizarResumo(id=caixa?.id) { if(!id)return; const [{data},{data:movimentos}]=await Promise.all([supabase.from("loja_pagamentos").select("valor,forma").eq("caixa_id",id).eq("status","confirmado"),supabase.from("loja_movimentos_caixa").select("tipo,valor").eq("caixa_id",id)]); setResumo({total:(data||[]).reduce((s,x)=>s+Number(x.valor),0),dinheiro:(data||[]).filter(x=>x.forma==="dinheiro").reduce((s,x)=>s+Number(x.valor),0),suprimentos:(movimentos||[]).filter(x=>x.tipo==="suprimento").reduce((s,x)=>s+Number(x.valor),0),sangrias:(movimentos||[]).filter(x=>x.tipo==="sangria").reduce((s,x)=>s+Number(x.valor),0)}) }
  useEffect(() => { atualizarResumo() }, [caixa?.id])
  function saldo(p){return Math.max(0,Number(p.total||0)-pagamentos.filter(x=>x.pedido_id===p.id&&x.status==="confirmado").reduce((s,x)=>s+Number(x.valor),0))}
  function selecionar(p){setPedido(p);setValor(String(saldo(p)));setRecebido("")}
  async function receber(e){e.preventDefault();if(!pedido||!caixa)return;const v=Number(valor), restante=saldo(pedido);if(!v||v<=0)return alert("Informe o valor recebido.");if(v>restante+.009)return alert(`O valor lançado não pode ultrapassar o saldo de ${moeda(restante)}. Para dinheiro, informe a quantia entregue no campo próprio para calcular o troco.`);const {error}=await supabase.from("loja_pagamentos").insert({pedido_id:pedido.id,caixa_id:caixa.id,forma,valor:v,status:"confirmado",recebido_por:user?.nome});if(error)return alert(error.message);await supabase.from("loja_movimentos_caixa").insert({caixa_id:caixa.id,pedido_id:pedido.id,tipo:"recebimento",valor:v,descricao:`Pagamento ${forma} do pedido #${pedido.numero}`,operador:user?.nome});const quitado=v>=restante-.009;if(quitado){const proximoStatus=["em_separacao","pronto_retirada","retirado"].includes(pedido.status)?pedido.status:"pago";await supabase.from("loja_pedidos").update({status:proximoStatus,status_pagamento:"aprovado",pago_em:new Date().toISOString(),forma_pagamento:forma==="dinheiro"?"retirada":forma==="pix"?"pix":"cartao",atualizado_em:new Date().toISOString()}).eq("id",pedido.id);await supabase.from("loja_pedido_historico").insert({pedido_id:pedido.id,status_anterior:pedido.status,status_novo:proximoStatus,descricao:`Pagamento integral confirmado no caixa por ${forma}.`,alterado_por:user?.nome});enviarEventoEmail(pedido.id,"pagamento_confirmado").catch(err=>console.warn("E-mail não enviado:",err.message))}else{await supabase.from("loja_pedido_historico").insert({pedido_id:pedido.id,status_anterior:pedido.status,status_novo:pedido.status,descricao:`Pagamento parcial de ${moeda(v)} por ${forma}. Saldo restante: ${moeda(restante-v)}.`,alterado_por:user?.nome})}alert(`Pagamento registrado.${quitado?" Pedido quitado.":` Saldo restante: ${moeda(restante-v)}.`}${forma==="dinheiro"&&Number(recebido)>v?` Troco: ${moeda(Number(recebido)-v)}`:""}`);setPedido(null);setBusca("");await recarregar();await atualizarResumo()}
  async function movimentar(tipo){const valorInformado=prompt(`Valor do ${tipo}:`);if(valorInformado===null)return;const v=Number(String(valorInformado).replace(",","."));if(!v||v<=0)return alert("Informe um valor válido.");const descricao=prompt("Motivo/descrição do movimento:");if(!descricao?.trim())return alert("A descrição é obrigatória para auditoria.");const {error}=await supabase.from("loja_movimentos_caixa").insert({caixa_id:caixa.id,tipo,valor:v,descricao:descricao.trim(),operador:user?.nome});if(error)return alert(error.message);await atualizarResumo();alert(tipo==="suprimento"?"Suprimento registrado.":"Sangria registrada.")}
  async function fechar(){const contado=prompt("Informe o valor total contado em dinheiro no caixa:");if(contado===null)return;const esperado=Number(caixa.valor_inicial)+resumo.dinheiro+resumo.suprimentos-resumo.sangrias;const {error}=await supabase.from("loja_caixas").update({status:"fechado",fechado_em:new Date().toISOString(),fechado_por:user?.nome,valor_esperado:esperado,valor_contado:Number(contado),diferenca:Number(contado)-esperado}).eq("id",caixa.id);if(error)return alert(error.message);alert(`Caixa fechado. Diferença: ${moeda(Number(contado)-esperado)}`);setCaixa(null)}
  const resultados=localizar(pedidos,busca).filter(p=>p.status!=="cancelado"&&saldo(p)>0)
  if(!caixa)return <section className="loja-painel caixa-abertura"><span>OPERAÇÃO FINANCEIRA</span><h2>Abra o caixa para começar</h2><p>O valor inicial registra o dinheiro disponível para troco.</p><label>Valor inicial em dinheiro<input type="number" min="0" step="0.01" value={inicial} onChange={e=>setInicial(e.target.value)}/></label><button className="primario" onClick={abrirCaixa}>Abrir caixa</button></section>
  const dinheiroEsperado=Number(caixa.valor_inicial)+resumo.dinheiro+resumo.suprimentos-resumo.sangrias
  return <section className="loja-painel operacao"><div className="loja-painel-titulo"><div><h2>Caixa</h2><p>Aberto por {caixa.aberto_por} em {dataHora(caixa.aberto_em)}</p></div><div className="caixa-acoes"><button onClick={()=>movimentar("suprimento")}>+ Suprimento</button><button onClick={()=>movimentar("sangria")}>− Sangria</button><button className="perigo" onClick={fechar}>Fechar caixa</button></div></div><section className="caixa-resumo"><article><span>Valor inicial</span><b>{moeda(caixa.valor_inicial)}</b></article><article><span>Recebido nesta sessão</span><b>{moeda(resumo.total)}</b><small>Suprimentos {moeda(resumo.suprimentos)} · Sangrias {moeda(resumo.sangrias)}</small></article><article><span>Dinheiro esperado</span><b>{moeda(dinheiroEsperado)}</b></article></section><input className="busca busca-grande" placeholder="Buscar pedido pendente" value={busca} onChange={e=>setBusca(e.target.value)}/>{!pedido&&busca&&<div className="resultado-lista">{resultados.map(p=><button key={p.id} onClick={()=>selecionar(p)}><b>#{String(p.numero).padStart(5,"0")} · {p.loja_clientes?.nome_completo}</b><span>{p.loja_clientes?.celular} · saldo do pedido {moeda(saldo(p))}</span></button>)}</div>}{pedido&&<form className="recebimento" onSubmit={receber}><div><small>PEDIDO #{String(pedido.numero).padStart(5,"0")}</small><h3>{pedido.loja_clientes?.nome_completo}</h3><b>Total: {moeda(pedido.total)} · Saldo: {moeda(saldo(pedido))}</b></div><label>Forma<select value={forma} onChange={e=>setForma(e.target.value)}><option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="cartao_debito">Cartão de débito</option><option value="cartao_credito">Cartão de crédito</option></select></label><label>Valor a lançar<input type="number" min="0.01" max={saldo(pedido)} step="0.01" value={valor} onChange={e=>setValor(e.target.value)}/></label>{forma==="dinheiro"&&<label>Valor entregue pelo cliente<input type="number" min="0" step="0.01" value={recebido} onChange={e=>setRecebido(e.target.value)}/><small>Troco: {moeda(Math.max(0,Number(recebido||0)-Number(valor||0)))}</small></label>}<div><button type="button" onClick={()=>setPedido(null)}>Cancelar</button><button className="primario">Confirmar pagamento</button></div></form>}</section>
}
