import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"
import "./LojaTetelestai.css"

const abas = ["Visão geral", "Produtos", "Pedidos", "Clientes", "Configurações"]
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
  const [produto, setProduto] = useState(null)
  const [variacoes, setVariacoes] = useState([])
  const [busca, setBusca] = useState("")
  const [salvando, setSalvando] = useState(false)

  const permitido = user?.role === "Administrador" || user?.role === "Dirigente"

  async function carregar() {
    setLoading(true)
    const [c, p, pe, cl] = await Promise.all([
      supabase.from("loja_configuracoes").select("*").eq("chave", "tetelestai-2026").single(),
      supabase.from("loja_produtos").select("*, loja_variacoes(count)").order("ordem").order("criado_em", { ascending:false }),
      supabase.from("loja_pedidos").select("*, loja_clientes(nome_completo,celular,email), loja_pedido_itens(*)").order("criado_em", { ascending:false }),
      supabase.from("loja_clientes").select("*").order("criado_em", { ascending:false }),
    ])
    if (c.error && c.error.code === "42P01") alert("A loja ainda não foi instalada. Execute o SQL enviado no Supabase.")
    setConfig(c.data || null); setProdutos(p.data || []); setPedidos(pe.data || []); setClientes(cl.data || [])
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

    {aba === "Produtos" && !produto && <section className="loja-painel"><div className="loja-painel-titulo"><div><h2>Produtos</h2><p>Cadastre agora e publique quando as artes estiverem prontas.</p></div><button className="primario" onClick={() => abrirProduto()}>+ Novo produto</button></div>
      <div className="produto-grade">{produtos.map(p => <article className="produto-card" key={p.id}><div className="produto-foto">{p.imagem_principal_url ? <img src={p.imagem_principal_url} alt=""/> : <span>SEM FOTO</span>}</div><div className="produto-conteudo"><div className="produto-flags"><span className={p.publicado ? "publicado":"oculto"}>{p.publicado ? "Publicado":"Oculto"}</span>{p.destaque && <span>Destaque</span>}</div><h3>{p.nome}</h3><strong>{moeda(p.preco)}</strong><small>{p.loja_variacoes?.[0]?.count || 0} variações</small><div className="produto-acoes"><button onClick={() => abrirProduto(p)}>Editar</button><button className="perigo" onClick={() => excluirProduto(p.id)}>Excluir</button></div></div></article>)}</div>
      {!produtos.length && <div className="loja-vazio"><h3>Nenhum produto cadastrado</h3><p>Você pode montar toda a estrutura agora e adicionar as fotos depois.</p></div>}
    </section>}

    {aba === "Produtos" && produto && <EditorProduto produto={produto} setProduto={setProduto} variacoes={variacoes} setVariacoes={setVariacoes} adicionarModelo={adicionarModelo} salvar={salvarProduto} cancelar={() => setProduto(null)} salvando={salvando} />}

    {aba === "Pedidos" && <section className="loja-painel"><div className="loja-painel-titulo"><div><h2>Pedidos da loja</h2><p>Os itens de diferentes modelos ficam agrupados no mesmo pedido.</p></div></div><TabelaPedidos pedidos={pedidos} alterarStatus={alterarStatus} detalhada /></section>}

    {aba === "Clientes" && <section className="loja-painel"><div className="loja-painel-titulo"><div><h2>Clientes</h2><p>Cadastros criados pelo site, WhatsApp ou atendimento manual.</p></div><input className="busca" placeholder="Buscar nome, celular ou e-mail" value={busca} onChange={e => setBusca(e.target.value)} /></div><div className="tabela-wrap"><table><thead><tr><th>Nome completo</th><th>Celular</th><th>E-mail</th><th>Origem</th><th>Cadastro</th></tr></thead><tbody>{clientes.filter(c => JSON.stringify(c).toLowerCase().includes(busca.toLowerCase())).map(c => <tr key={c.id}><td><b>{c.nome_completo}</b></td><td>{c.celular}</td><td>{c.email}</td><td>{c.origem}</td><td>{dataHora(c.criado_em)}</td></tr>)}</tbody></table></div></section>}

    {aba === "Configurações" && config && <ConfigLoja config={config} setConfig={setConfig} salvar={salvarConfig} salvando={salvando} />}
  </main>
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
    <h3>Publicação</h3><div className="checks destaque"><label><input type="checkbox" checked={config.loja_ativa} onChange={e => campo("loja_ativa",e.target.checked)}/> Loja aberta para pedidos</label><label><input type="checkbox" checked={config.mostrar_botao_topo} onChange={e => campo("mostrar_botao_topo",e.target.checked)}/> Mostrar botão no topo do site</label><label><input type="checkbox" checked={config.whatsapp_ativo} onChange={e => campo("whatsapp_ativo",e.target.checked)}/> Permitir pedidos pelo WhatsApp</label></div>
    <div className="form-grid"><label>Nome da loja<input value={config.nome_loja} onChange={e => campo("nome_loja",e.target.value)}/></label><label>Texto do botão do topo<input value={config.texto_botao_topo} onChange={e => campo("texto_botao_topo",e.target.value)}/></label><label>Título da vitrine<input value={config.titulo_vitrine} onChange={e => campo("titulo_vitrine",e.target.value)}/></label><label className="form-largo">Descrição da vitrine<textarea value={config.descricao_vitrine || ""} onChange={e => campo("descricao_vitrine",e.target.value)}/></label><label>Início das vendas<input type="datetime-local" value={config.vendas_inicio?.slice(0,16) || ""} onChange={e => campo("vendas_inicio",e.target.value || null)}/></label><label>Fim das vendas<input type="datetime-local" value={config.vendas_fim?.slice(0,16) || ""} onChange={e => campo("vendas_fim",e.target.value || null)}/></label><label className="form-largo">Mensagem com a loja fechada<textarea value={config.mensagem_loja_fechada || ""} onChange={e => campo("mensagem_loja_fechada",e.target.value)}/></label></div>
    <h3>Pagamento</h3><div className="checks"><label><input type="checkbox" checked={config.aceitar_pix} onChange={e => campo("aceitar_pix",e.target.checked)}/> Pix</label><label><input type="checkbox" checked={config.aceitar_cartao} onChange={e => campo("aceitar_cartao",e.target.checked)}/> Cartão</label><label><input type="checkbox" checked={config.aceitar_retirada} onChange={e => campo("aceitar_retirada",e.target.checked)}/> Pagamento na retirada</label><label><input type="checkbox" checked={config.exigir_confirmacao_medidas} onChange={e => campo("exigir_confirmacao_medidas",e.target.checked)}/> Exigir confirmação das medidas</label></div>
    <h3>Retirada única</h3><div className="form-grid"><label>Data<input type="date" value={config.retirada_data || ""} onChange={e => campo("retirada_data",e.target.value || null)}/></label><label>Início<input type="time" value={config.retirada_inicio || ""} onChange={e => campo("retirada_inicio",e.target.value || null)}/></label><label>Fim<input type="time" value={config.retirada_fim || ""} onChange={e => campo("retirada_fim",e.target.value || null)}/></label><label className="form-largo">Local<input value={config.retirada_local || ""} onChange={e => campo("retirada_local",e.target.value)}/></label><label className="form-largo">Orientações<textarea value={config.retirada_instrucoes || ""} onChange={e => campo("retirada_instrucoes",e.target.value)}/></label></div>
  </form>
}
