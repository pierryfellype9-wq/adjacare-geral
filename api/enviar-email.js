import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res){

  const { email, titulo } = req.body

  try{

    await resend.emails.send({
      from: "Sistema ADJACARE <sistema@adjacare.org>",
      to: email,
      subject: "Solicitação recebida",
      html: `
        <h2>Recebemos sua solicitação</h2>
        <p><b>Título:</b> ${titulo}</p>
        <p>Nossa equipe já foi notificada.</p>
      `
    })

    res.status(200).json({ok:true})

  }catch(err){

    res.status(500).json({error:err.message})

  }

}