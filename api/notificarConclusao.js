import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"


const resend = new Resend(process.env.RESEND_API_KEY)


const supabase = createClient(
 process.env.SUPABASE_URL,
 process.env.SUPABASE_SERVICE_ROLE_KEY
)


export default async function handler(req,res){


 try{


  const { id } = req.body


  const { data:pedido } = await supabase
  .from("pedidos")
  .select("*")
  .eq("id",id)
  .single()


  if(!pedido){
   return res.status(404).json({erro:"Pedido não encontrado"})
  }


  if(!pedido.email){
   return res.status(200).json({ok:true})
  }


  const linkDrive = pedido.link_drive || ""


  await resend.emails.send({


   from:"Sistema ADJACARÉ <midia@adjacare.org>",
   to:pedido.email,
   subject:"Seu pedido de mídia foi concluído",


   html:`


   <h2>Seu pedido foi finalizado 🎉</h2>


   <p><b>Título:</b> ${pedido.titulo}</p>


   <p>A equipe de mídia concluiu seu pedido.</p>


   ${linkDrive ? `
   <p>
   <a href="${linkDrive}" 
   style="
   background:#2563eb;
   color:white;
   padding:12px 18px;
   border-radius:8px;
   text-decoration:none;
   font-weight:600;
   ">
   Acessar arquivos
   </a>
   </p>
   ` : ""}


   <br>


   <p>Equipe de Mídia</p>
   <p>ADJACARÉ</p>


   `


  })


  return res.status(200).json({ok:true})


 }catch(err){


  console.log("Erro email conclusão:",err)


  return res.status(500).json({erro:err.message})


 }


}
