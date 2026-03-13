import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res){

  try{

    const { assunto, mensagem } = req.body

    await resend.emails.send({

      from: "Sistema ADJACARÉ <midia@adjacare.org>",
      to: ["midia@adjacare.org"],
      subject: assunto,
      html: mensagem

    })

    res.status(200).json({ ok:true })

  }catch(err){

    res.status(500).json({ error:err.message })

  }

}
