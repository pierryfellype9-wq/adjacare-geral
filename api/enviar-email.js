import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res){

  try{

    const { assunto, mensagem, para } = req.body

    let listaEmails = []

    // CASO TENHA EMAIL ESPECÍFICO → ENVIA PARA ELE
    if(para){

      listaEmails = [para]

    }else{

      // CASO NÃO TENHA → ENVIA PARA MÍDIA

      const { data: midiaUsers, error } = await supabase
        .from("users")
        .select("email")
        .eq("role","Mídia")

      if(error){
        throw error
      }

      const emailsMidia = midiaUsers
        .map(u => u.email)
        .filter(Boolean)

      listaEmails = [...new Set([
        "midia@adjacare.org",
        ...emailsMidia
      ])]

    }

    await resend.emails.send({

      from: "Sistema ADJACARÉ <midia@adjacare.org>",
      to: listaEmails,
      subject: assunto,
      html: mensagem

    })

    res.status(200).json({ ok:true })

  }catch(err){

    res.status(500).json({ error:err.message })

  }

}
