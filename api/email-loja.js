import { createClient } from "@supabase/supabase-js"
import { enviarEmailPedido } from "../server/emailLoja.js"

export default async function handler(req,res){
  if(req.query?.acao==="lembretes"){
    if(process.env.CRON_SECRET&&req.headers.authorization!==`Bearer ${process.env.CRON_SECRET}`)return res.status(401).json({error:"Não autorizado"})
    const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY)
    const limite=new Date(Date.now()-48*60*60*1000).toISOString()
    const {data,error}=await supabase.from("loja_pedidos").select("id").neq("status","cancelado").neq("status_pagamento","aprovado").lt("criado_em",limite)
    if(error)return res.status(500).json({error:error.message})
    const resultados=[]
    for(const p of data||[]){try{resultados.push({id:p.id,...await enviarEmailPedido(p.id,"lembrete_pagamento",{automatico:true})})}catch(e){resultados.push({id:p.id,error:e.message})}}
    return res.status(200).json({processados:resultados.length,resultados})
  }
  if(req.method!=="POST")return res.status(405).json({error:"Método não permitido"})
  try{const {pedido_id,tipo}=req.body||{};if(!pedido_id||!tipo)return res.status(400).json({error:"Pedido e tipo são obrigatórios."});return res.status(200).json(await enviarEmailPedido(pedido_id,tipo))}catch(e){return res.status(500).json({error:e.message||"Erro ao enviar e-mail"})}
}
