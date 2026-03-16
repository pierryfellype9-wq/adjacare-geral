import { google } from "googleapis"


export default async function handler(req,res){


 if(req.method !== "POST"){
  return res.status(405).json({erro:"Método não permitido"})
 }


 try{


  const { titulo, descricao, data } = req.body


  const auth = new google.auth.GoogleAuth({
   credentials: JSON.parse(process.env.GOOGLE_SERVICE_KEY),
   scopes:["https://www.googleapis.com/auth/calendar"]
  })


  const client = await auth.getClient()


  const calendar = google.calendar({
   version:"v3",
   auth:client
  })


  await calendar.events.insert({
   calendarId:"midia@adjacare.org",
   requestBody:{
    summary: titulo,
    description: descricao,
    start:{
     dateTime: data,
     timeZone:"America/Sao_Paulo"
    },
    end:{
     dateTime: data,
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
