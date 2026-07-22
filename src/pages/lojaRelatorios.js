import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"

const dinheiro = v => Number(v || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" })
const data = v => v ? new Date(v).toLocaleString("pt-BR") : "—"
const numero = p => `#${String(p.numero).padStart(5,"0")}`
const feminina = i => i.publico === "Feminino" || /baby/i.test(i.modelo || "")
const itemNome = i => `${i.produto_nome} | ${i.modelo}${feminina(i) ? " — FEMININA" : ""} | ${i.tamanho} | ${i.comprimento_cm || "—"} x ${i.largura_cm || "—"} cm`

function filtrar(pedidos, inicio, fim) {
  if (!inicio && !fim) return pedidos
  const de = inicio ? new Date(`${inicio}T00:00:00`).getTime() : -Infinity
  const ate = fim ? new Date(`${fim}T23:59:59.999`).getTime() : Infinity
  return pedidos.filter(p => { const t = new Date(p.criado_em).getTime(); return t >= de && t <= ate })
}

function base(titulo, subtitulo, periodo) {
  const doc = new jsPDF({ unit:"mm", format:"a4" })
  doc.setProperties({ title:titulo, subject:"Congresso Tetelestai 2026", creator:"Sistema AD Jacaré" })
  doc.setFillColor(4, 18, 40); doc.rect(0,0,210,31,"F")
  doc.setTextColor(255); doc.setFont("helvetica","bold"); doc.setFontSize(16); doc.text(titulo,14,14)
  doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.text(subtitulo,14,21)
  doc.text(periodo,14,26)
  doc.setTextColor(20)
  return doc
}

function periodoTexto(inicio, fim) { return inicio || fim ? `Período: ${inicio ? new Date(`${inicio}T12:00:00`).toLocaleDateString("pt-BR") : "início"} a ${fim ? new Date(`${fim}T12:00:00`).toLocaleDateString("pt-BR") : "hoje"}` : "Relatório geral — todos os períodos" }
function rodape(doc) { const total=doc.getNumberOfPages(); for(let p=1;p<=total;p++){doc.setPage(p);doc.setFontSize(7);doc.setTextColor(100);doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} • Página ${p}/${total}`,14,291);doc.text("Congresso Tetelestai 2026 • Documento operacional",196,291,{align:"right"})} }
function salvar(doc,nome){rodape(doc);doc.save(`${nome}-${new Date().toISOString().slice(0,10)}.pdf`)}
const temaTabela={headStyles:{fillColor:[7,29,61],textColor:255,fontSize:7},styles:{fontSize:7,cellPadding:2,overflow:"linebreak"},alternateRowStyles:{fillColor:[245,248,252]},margin:{left:14,right:14,bottom:14}}

export function relatorioPedidos(pedidos, inicio, fim) {
  const lista=filtrar(pedidos,inicio,fim), validos=lista.filter(p=>p.status!=="cancelado")
  const doc=base("RELATÓRIO DE PEDIDOS","Controle administrativo e financeiro",periodoTexto(inicio,fim))
  doc.setFontSize(10);doc.setFont("helvetica","bold");doc.text(`Pedidos: ${lista.length}`,14,39);doc.text(`Válidos: ${validos.length}`,65,39);doc.text(`Total válido: ${dinheiro(validos.reduce((s,p)=>s+Number(p.total||0),0))}`,112,39)
  autoTable(doc,{...temaTabela,startY:45,head:[["Pedido/Data","Cliente/Contato","Itens","Pagamento","Status","Total"]],body:lista.map(p=>[`${numero(p)}\n${data(p.criado_em)}`,`${p.loja_clientes?.nome_completo||"—"}\n${p.loja_clientes?.celular||"—"}\n${p.loja_clientes?.email||"—"}`,(p.loja_pedido_itens||[]).map(i=>`${i.quantidade}x ${itemNome(i)}`).join("\n"),`${p.forma_pagamento||"—"}\n${p.status_pagamento||"—"}`,p.status,dinheiro(p.total)])})
  salvar(doc,"tetelestai-relatorio-pedidos")
}

export function relatorioConferencia(pedidos, inicio, fim) {
  const lista=filtrar(pedidos,inicio,fim).filter(p=>p.status!=="cancelado")
  const doc=base("MAPA DE SEPARAÇÃO E CONFERÊNCIA","Uso interno — conferir modelo, público, tamanho e quantidade",periodoTexto(inicio,fim))
  let y=38
  lista.forEach((p,indice)=>{
    if(y>245){doc.addPage();y=18}
    doc.setFillColor(238,243,249);doc.roundedRect(14,y,182,13,2,2,"F");doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text(`${numero(p)} — ${p.loja_clientes?.nome_completo||"Cliente"}`,18,y+5)
    doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.text(`${p.loja_clientes?.celular||"—"} • ${p.loja_clientes?.email||"—"} • Pagamento: ${p.status_pagamento||"—"}`,18,y+10);y+=16
    autoTable(doc,{...temaTabela,startY:y,head:[["OK","Qtd.","Produto / modelo / tamanho / medidas","Observação"]],body:(p.loja_pedido_itens||[]).map(i=>["☐",i.quantidade,itemNome(i),""]),columnStyles:{0:{cellWidth:11,halign:"center",fontSize:12},1:{cellWidth:14,halign:"center"},3:{cellWidth:39}},didDrawPage:()=>{},showHead:"firstPage"})
    y=doc.lastAutoTable.finalY+5
    doc.setFontSize(7);doc.text("Separado por: __________________  Conferido por: __________________  Data: ____/____/______",18,y);y+=indice===lista.length-1?0:10
  })
  if(!lista.length){doc.setFontSize(11);doc.text("Nenhum pedido encontrado no período selecionado.",14,45)}
  salvar(doc,"tetelestai-mapa-separacao")
}

export function relatorioProducao(pedidos, inicio, fim) {
  const lista=filtrar(pedidos,inicio,fim).filter(p=>p.status!=="cancelado")
  const mapa=new Map()
  lista.flatMap(p=>p.loja_pedido_itens||[]).forEach(i=>{const chave=[i.produto_nome,i.modelo,feminina(i)?"FEMININA":(i.publico||"Tradicional"),i.tamanho,i.comprimento_cm||"",i.largura_cm||""].join("|");const atual=mapa.get(chave)||{...i,quantidade:0};atual.quantidade+=Number(i.quantidade||0);mapa.set(chave,atual)})
  const itens=[...mapa.values()].sort((a,b)=>`${a.produto_nome}|${a.modelo}|${a.tamanho}`.localeCompare(`${b.produto_nome}|${b.modelo}|${b.tamanho}`,"pt-BR",{numeric:true}))
  const doc=base("ORDEM CONSOLIDADA DE PRODUÇÃO","Documento para confecção — quantidades somadas somente de pedidos não cancelados",periodoTexto(inicio,fim))
  doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text(`Pedidos considerados: ${lista.length}`,14,39);doc.text(`Total de peças: ${itens.reduce((s,i)=>s+i.quantidade,0)}`,92,39)
  autoTable(doc,{...temaTabela,startY:45,head:[["Produto","Modelo","Público/modelagem","Tamanho","Medidas (C x L)","Quantidade"]],body:itens.map(i=>[i.produto_nome,i.modelo,feminina(i)?"CAMISETA FEMININA":(i.publico||"Tradicional"),i.tamanho,`${i.comprimento_cm||"—"} x ${i.largura_cm||"—"} cm`,i.quantidade]),columnStyles:{5:{halign:"center",fontStyle:"bold",fontSize:10}}})
  let y=doc.lastAutoTable.finalY+9;if(y>250){doc.addPage();y=20}doc.setFontSize(8);doc.setFont("helvetica","bold");doc.text("VALIDAÇÃO ANTES DE ENVIAR À PRODUÇÃO",14,y);doc.setFont("helvetica","normal");doc.text("Responsável: ______________________________  Data: ____/____/______  Assinatura: ______________________________",14,y+7)
  salvar(doc,"tetelestai-ordem-producao")
}

export function relatorioFinanceiro(pedidos, pagamentos, inicio, fim) {
  const lista=filtrar(pedidos,inicio,fim), ids=new Set(lista.map(p=>p.id)), pg=(pagamentos||[]).filter(x=>ids.has(x.pedido_id)&&x.status==="confirmado")
  const validos=lista.filter(p=>p.status!=="cancelado"), bruto=validos.reduce((s,p)=>s+Number(p.total||0),0), recebido=pg.reduce((s,p)=>s+Number(p.valor||0),0)
  const porPedido=new Map();pg.forEach(x=>porPedido.set(x.pedido_id,(porPedido.get(x.pedido_id)||0)+Number(x.valor||0)))
  const doc=base("RELATÓRIO FINANCEIRO","Recebimentos, saldos e formas de pagamento",periodoTexto(inicio,fim))
  doc.setFont("helvetica","bold");doc.setFontSize(9);doc.text(`Faturamento válido: ${dinheiro(bruto)}`,14,39);doc.text(`Recebido: ${dinheiro(recebido)}`,79,39);doc.text(`A receber: ${dinheiro(Math.max(0,bruto-recebido))}`,135,39)
  autoTable(doc,{...temaTabela,startY:45,head:[["Pedido","Cliente","Total","Recebido","Saldo","Situação"]],body:validos.map(p=>{const pago=porPedido.get(p.id)||0;return [numero(p),p.loja_clientes?.nome_completo||"—",dinheiro(p.total),dinheiro(pago),dinheiro(Math.max(0,Number(p.total)-pago)),p.status_pagamento]})})
  let y=doc.lastAutoTable.finalY+9;if(y>245){doc.addPage();y=20}doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text("LANÇAMENTOS CONFIRMADOS",14,y)
  autoTable(doc,{...temaTabela,startY:y+4,head:[["Data","Pedido","Forma","Valor","Operador/Referência"]],body:pg.map(x=>[data(x.criado_em),numero(lista.find(p=>p.id===x.pedido_id)||{numero:"—"}),x.forma,dinheiro(x.valor),x.recebido_por||x.referencia||"—"])})
  salvar(doc,"tetelestai-relatorio-financeiro")
}
