import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
 process.env.SUPABASE_URL,
 process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req,res){

 try{

  const lead = req.body.leads?.add?.[0]

  if(!lead){
   return res.status(200).json({ok:true})
  }

  const nome = lead.name || "WhatsApp"

  const telefone = lead._embedded?.contacts?.[0]?.custom_fields_values?.[0]?.values?.[0]?.value || ""

  const leadId = lead.id

  const { data:existente } = await supabase
  .from("pedidos")
  .select("id")
  .eq("kommo_lead_id",leadId)
  .maybeSingle()

  if(existente){
   return res.status(200).json({ok:true})
  }

  await supabase
  .from("pedidos")
  .insert({
   titulo:"Pedido via WhatsApp",
   descricao:"Mensagem recebida pelo WhatsApp",
   solicitante:nome,
   telefone,
   origem:"whatsapp",
   canal:"whatsapp",
   status:"Pendente",
   kommo_lead_id:leadId
  })

  res.status(200).json({ok:true})

 }catch(e){

  res.status(500).json({erro:e.message})

 }

}

