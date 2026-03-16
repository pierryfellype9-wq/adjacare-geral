import { google } from "googleapis"


export default async function handler(req,res){


 if(req.method !== "POST"){
  return res.status(405).json({erro:"Método não permitido"})
 }


 try{


  const {
   titulo,
   descricao,
   ministerio,
   solicitante,
   inicio,
   fim,
   publico
  } = req.body


  const auth = new google.auth.GoogleAuth({
   credentials: JSON.parse(process.env.GOOGLE_SERVICE_KEY),
   scopes:["https://www.googleapis.com/auth/calendar"]
  })


  const client = await auth.getClient()


  const calendar = google.calendar({
   version:"v3",
   auth:client
  })


  const descricaoFinal = `
${descricao}


Ministério: ${ministerio}
Solicitado por: ${solicitante}
Visibilidade: ${publico ? "Público" : "Interno"}
`


  await calendar.events.insert({
   calendarId:"midia@adjacare.org",
   requestBody:{
    summary: titulo,
    description: descricaoFinal,


    start:{
     dateTime: inicio,
     timeZone:"America/Sao_Paulo"
    },


    end:{
     dateTime: fim,
     timeZone:"America/Sao_Paulo"
    }


   }
  })


  res.status(200).json({ok:true})


 }catch(e){


  console.log("Erro criar evento:",e)


  res.status(500).json({erro:e.message})


 }


}
