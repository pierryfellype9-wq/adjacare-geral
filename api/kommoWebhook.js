import { createClient } from "@supabase/supabase-js"

export const config = {
  api: {
    bodyParser: true
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res){

  try{

    const body = req.body || {}

    console.log("Webhook recebido:", body)

    const leadId = body["leads[status][0][id]"]
    const statusId = body["leads[status][0][status_id]"]

    if(!leadId){
      return res.status(200).json({ok:true})
    }

    console.log("Lead recebido:", leadId)

    // resto do código aqui

    res.status(200).json({ok:true})

  }catch(err){

    console.error("Erro webhook:", err)

    res.status(200).json({ok:true})

  }

}
