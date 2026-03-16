import { createClient } from "@supabase/supabase-js"
import { google } from "googleapis"

const supabase = createClient(
 process.env.SUPABASE_URL,
 process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function criarPastaDrive(nomePasta){

 const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_KEY),
  scopes: ["https://www.googleapis.com/auth/drive"]
 })

 const drive = google.drive({
  version: "v3",
  auth
 })

 const pasta = await drive.files.create({
  requestBody:{
   name:nomePasta,
   mimeType:"application/vnd.google-apps.folder",
   parents:[process.env.DRIVE_PASTA_PEDIDOS]
  },
  fields:"id"
 })

 const pastaId = pasta.data.id

 return `https://drive.google.com/drive/folders/${pastaId}`

}

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

  // cria pasta no drive
  const linkDrive = await criarPastaDrive(titulo)

  const { data, error } = await supabase
  .from("pedidos")
  .insert({
 titulo,
 descricao,
 prioridade,
 destino,
 ministerio,
 criado_por,
 email,
 telefone,
 origem:"site",
 canal:"site",
 link_drive:linkDrive,
 status:"Pendente",
 data:new Date().toISOString()
})
  .select()
  .single()

  if(error) throw error

  res.status(200).json({ok:true})

 }catch(e){

  console.log("Erro criarPedido:",e)

  res.status(500).json({erro:e.message})

 }

}

