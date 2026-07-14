import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"

const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY)
const resend=new Resend(process.env.RESEND_API_KEY)
const moeda=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})

export async function enviarEmailPedido(pedidoId,tipo,{automatico=false}={}){
  const {data:p,error}=await supabase.from("loja_pedidos").select("*, loja_clientes(*), loja_pedido_itens(*)").eq("id",pedidoId).single()
  if(error||!p)throw new Error("Pedido não encontrado.")
  const email=p.loja_clientes?.email?.trim();if(!email)throw new Error("Cliente sem e-mail cadastrado.")
  if(tipo==="lembrete_pagamento"&&p.status_pagamento==="aprovado")return {ignorado:true,motivo:"Pedido quitado"}
  const chave=tipo==="lembrete_pagamento"?`${tipo}:${new Date().toISOString().slice(0,10)}`:tipo
  const {data:anterior}=await supabase.from("loja_email_eventos").select("id,status").eq("pedido_id",pedidoId).eq("chave",chave).maybeSingle()
  if(anterior?.status==="enviado")return {ignorado:true,motivo:"E-mail já enviado"}
  const numero=`#${String(p.numero).padStart(5,"0")}`, itens=(p.loja_pedido_itens||[]).map(i=>`<li><b>${i.quantidade}× ${i.produto_nome}</b> — ${i.modelo}${i.publico==="Feminino"?" (CAMISETA FEMININA)":""}, tamanho ${i.tamanho}, ${i.comprimento_cm||"—"} × ${i.largura_cm||"—"} cm</li>`).join("")
  const textos={
    pedido_criado:[`Recebemos seu pedido ${numero}`,`Seu pedido foi registrado com sucesso.<ul>${itens}</ul><p><b>Total: ${moeda(p.total)}</b></p>`],
    pagamento_confirmado:[`Pagamento confirmado — pedido ${numero}`,`Confirmamos o pagamento do seu pedido no valor de <b>${moeda(p.total)}</b>.`],
    pronto_retirada:[`Seu pedido ${numero} está pronto para retirada`,`Suas camisetas foram separadas e conferidas. A retirada será feita na igreja, no dia e horário divulgados pela organização.`],
    retirada_confirmada:[`Retirada confirmada — pedido ${numero}`,`Registramos a retirada do seu pedido por <b>${p.retirado_por_nome||"responsável informado"}</b>. Obrigado!`],
    cancelado:[`Pedido ${numero} cancelado`,`O pedido foi registrado como cancelado. Em caso de dúvida, responda este e-mail ou procure a equipe responsável.`],
    lembrete_pagamento:[`Lembrete de pagamento — pedido ${numero}`,`Seu pedido possui pagamento pendente. Valor total: <b>${moeda(p.total)}</b>. Se você já pagou, procure a equipe para conferência antes de realizar um novo pagamento.`],
  }
  if(!textos[tipo])throw new Error("Tipo de e-mail inválido.")
  const html=`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#142033"><div style="background:#061a38;color:white;padding:24px;border-radius:14px 14px 0 0"><small>CONGRESSO TETELESTAI 2026</small><h1 style="margin:8px 0 0">${textos[tipo][0]}</h1></div><div style="padding:24px;border:1px solid #dde5ef;border-top:0">Olá, <b>${p.loja_clientes.nome_completo}</b>.<p>${textos[tipo][1]}</p><p style="font-size:12px;color:#687487">Este é um aviso automático do Sistema AD Jacaré.</p></div></div>`
  const registro={pedido_id:pedidoId,tipo,chave,destinatario:email,status:"processando",automatico}
  const {data:evento,error:eventoErro}=await supabase.from("loja_email_eventos").upsert(registro,{onConflict:"pedido_id,chave"}).select().single();if(eventoErro)throw eventoErro
  try{const resposta=await resend.emails.send({from:"Congresso Tetelestai <midia@adjacare.org>",to:[email],subject:textos[tipo][0],html});await supabase.from("loja_email_eventos").update({status:"enviado",enviado_em:new Date().toISOString(),provedor_id:resposta.data?.id||null,erro:null}).eq("id",evento.id);return {ok:true}}
  catch(e){await supabase.from("loja_email_eventos").update({status:"erro",erro:e.message}).eq("id",evento.id);throw e}
}
