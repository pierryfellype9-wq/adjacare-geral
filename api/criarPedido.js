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

  const { nome, telefone, descricao, titulo } = req.body

  const { data, error } = await supabase
  .from("pedidos")
  .insert({
   titulo,
   descricao,
   solicitante:nome,
   telefone,
   origem:"site",
   canal:"site",
   status:"Pendente"
  })
  .select()
  .single()

  if(error) throw error

  const lead = await fetch(`https://${process.env.KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads/complex`,{
   method:"POST",
   headers:{
    "Content-Type":"application/json",
    "Authorization":"Bearer "+process.env.KOMMO_TOKEN
   },
   body:JSON.stringify([{
    name:"Pedido de mídia",
    custom_fields_values:[
     {
      field_name:"Descrição",
      values:[{value:descricao}]
     }
    ],
    _embedded:{
     contacts:[
      {
       name:nome,
       custom_fields_values:[
        {
         field_code:"PHONE",
         values:[{value:telefone}]
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

  res.status(500).json({erro:e.message})

 }

}

