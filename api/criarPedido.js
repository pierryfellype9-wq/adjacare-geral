import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
 process.env.SUPABASE_URL,
 process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req,res){

 if(req.method !== "POST"){
  return res.status(405).json({erro:"Método não permitido"})
 }

 try{

  const {
   titulo,
   descricao,
   prioridade,
   destino,
   ministerio,
   criado_por,
   email,
   telefone
  } = req.body

  const { data, error } = await supabase
  .from("pedidos")
  .insert({
   titulo,
   descricao,
   prioridade,
   destino,
   ministerio,
   criado_por,
   solicitante:criado_por,
   telefone,
   origem:"site",
   canal:"site",
   status:"Pendente",
   data:new Date().toISOString()
  })
  .select()
  .single()

  if(error) throw error

  // criar lead no Kommo
  const lead = await fetch(`https://${process.env.KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads/complex`,{
   method:"POST",
   headers:{
    "Content-Type":"application/json",
    "Authorization":"Bearer "+process.env.KOMMO_TOKEN
   },
   body:JSON.stringify([{
    name:titulo,
    custom_fields_values:[
     {
      field_name:"Descrição",
      values:[{value:descricao}]
     }
    ],
    _embedded:{
     contacts:[
      {
       name:criado_por,
       custom_fields_values:[
        {
         field_code:"PHONE",
         values:[{value:telefone}]
        },
        {
         field_code:"EMAIL",
         values:[{value:email}]
        }
       ]
      }
     ]
    }
   }])
  })

  const leadData = await lead.json()

  if(leadData && leadData[0]?.id){

   await supabase
   .from("pedidos")
   .update({
    kommo_lead_id:leadData[0].id
   })
   .eq("id",data.id)

  }

  res.status(200).json({ok:true})

 }catch(e){

  console.log("Erro criarPedido:",e)

  res.status(500).json({erro:e.message})

 }

}
