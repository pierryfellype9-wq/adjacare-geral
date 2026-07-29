import { createClient } from "@supabase/supabase-js"
import { google } from "googleapis"
import { authorizeRequest, rejectUnauthorized } from "../server/authorize.js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder"

function escaparBuscaDrive(valor = "") {
  return String(valor).replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

async function encontrarOuCriarPastaPedidos(drive, pastaBaseId) {
  const nome = "PEDIDOS DO SISTEMA"
  const resposta = await drive.files.list({
    q: [
      `'${escaparBuscaDrive(pastaBaseId)}' in parents`,
      `mimeType = '${DRIVE_FOLDER_MIME}'`,
      "trashed = false",
      `name = '${nome}'`,
    ].join(" and "),
    fields: "files(id,name)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

  if (resposta.data.files?.[0]) return resposta.data.files[0]

  const criada = await drive.files.create({
    requestBody: {
      name: nome,
      mimeType: DRIVE_FOLDER_MIME,
      parents: [pastaBaseId],
      appProperties: {
        sistema_adjacare: "pedidos",
      },
    },
    fields: "id,name",
    supportsAllDrives: true,
  })

  return criada.data
}

async function criarPastaDrive(nomePasta) {
  const pastaBaseId = process.env.DRIVE_PASTA_PEDIDOS
  if (!pastaBaseId) {
    throw new Error("Configure DRIVE_PASTA_PEDIDOS na Vercel.")
  }

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_KEY),
    scopes: ["https://www.googleapis.com/auth/drive"],
  })

  const drive = google.drive({
    version: "v3",
    auth,
  })

  const pastaPedidos = await encontrarOuCriarPastaPedidos(drive, pastaBaseId)
  const pasta = await drive.files.create({
    requestBody: {
      name: nomePasta,
      mimeType: DRIVE_FOLDER_MIME,
      parents: [pastaPedidos.id],
      appProperties: {
        sistema_adjacare: "pedido",
      },
    },
    fields: "id",
    supportsAllDrives: true,
  })

  return `https://drive.google.com/drive/folders/${pasta.data.id}`
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" })
  }

  try {
    const authorization = await authorizeRequest(req)
    if (authorization.error) return rejectUnauthorized(res, authorization)

    const {
      titulo,
      descricao,
      prioridade,
      destino,
      ministerio,
      criado_por,
      email,
      telefone,
      origem = "site",
      canal = "site",
    } = req.body

    const linkDrive = await criarPastaDrive(titulo)

    const { error } = await supabase
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
        origem,
        canal,
        link_drive: linkDrive,
        status: "Pendente",
        data: new Date().toISOString(),
      })

    if (error) throw error

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error("Erro criarPedido:", error)
    return res.status(500).json({ erro: error.message })
  }
}
