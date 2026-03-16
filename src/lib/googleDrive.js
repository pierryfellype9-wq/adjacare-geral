import { google } from "googleapis"

export async function criarPastaDrive(nomePasta){

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_KEY),
    scopes: ["https://www.googleapis.com/auth/drive"]
  })

  const client = await auth.getClient()

  const drive = google.drive({
    version: "v3",
    auth: client
  })

  const pasta = await drive.files.create({
    requestBody:{
      name: nomePasta,
      mimeType: "application/vnd.google-apps.folder",
      parents: [process.env.DRIVE_PASTA_PEDIDOS]
    }
  })

  return pasta.data.id
}
