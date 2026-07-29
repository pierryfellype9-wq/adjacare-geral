import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { enviarPush } from "../server/pushNotifications.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v25.0";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const DEPARTAMENTOS_HINOS_BLOQUEADOS = new Set([
  "admin",
  "administrador",
  "dirig",
  "dirigente",
  "superintendente",
  "sonoplastia",
]);
const DEPARTAMENTOS_POR_PAGINA = 8;

async function salvarMensagem(telefone, direcao, mensagem) {
  await supabase.from("whatsapp_mensagens").insert({
    telefone,
    direcao,
    mensagem,
  });
}

async function enviarMensagem(telefone, texto) {
  const resposta = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: telefone,
        type: "text",
        text: {
          body: texto,
          preview_url: false,
        },
      }),
    }
  );

  const retorno = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const detalhe = retorno?.error?.message || `WhatsApp recusou a mensagem (${resposta.status}).`;
    const codigo = retorno?.error?.code ? ` [código ${retorno.error.code}]` : "";
    await salvarMensagem(telefone, "erro", `${detalhe}${codigo}`);
    throw new Error(`${detalhe}${codigo}`);
  }

  await salvarMensagem(telefone, "enviada", texto);
}

async function enviarInterativo(telefone, interactive, registro) {
  const resposta = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: telefone, type: "interactive", interactive }),
  });
  if (!resposta.ok) {
    const detalhe = await resposta.text();
    throw new Error(`WhatsApp recusou a mensagem interativa: ${detalhe}`);
  }
  await salvarMensagem(telefone, "enviada", registro);
}

async function enviarLista(telefone, { cabecalho, corpo, botao, secoes }) {
  try {
    const sections = secoes.map(({ titulo, title, rows }) => ({
      title: (title || titulo || "Opções").slice(0, 24),
      rows,
    }));
    await enviarInterativo(telefone, {
      type: "list",
      header: cabecalho ? { type: "text", text: cabecalho.slice(0, 60) } : undefined,
      body: { text: corpo.slice(0, 1024) },
      action: { button: botao.slice(0, 20), sections },
    }, `${cabecalho || "Lista"}\n${corpo}`);
  } catch (error) {
    console.error("Falha ao enviar lista; usando texto:", error.message);
    const linhas = secoes.flatMap(s => s.rows).map((r,i) => `${i + 1}. ${r.title}${r.description ? ` — ${r.description}` : ""}`).join("\n");
    await enviarMensagem(telefone, `*${cabecalho || "Escolha uma opção"}*\n\n${corpo}\n\n${linhas}\n\nResponda com o número da opção.`);
  }
}

async function enviarBotoes(telefone, { corpo, botoes }) {
  try {
    await enviarInterativo(telefone, {
      type: "button",
      body: { text: corpo.slice(0, 1024) },
      action: { buttons: botoes.slice(0, 3).map(b => ({ type: "reply", reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) } })) },
    }, corpo);
  } catch (error) {
    console.error("Falha ao enviar botões; usando texto:", error.message);
    await enviarMensagem(telefone, `${corpo}\n\n${botoes.map((b,i)=>`${i+1}. ${b.title}`).join("\n")}\n\nResponda com o número da opção.`);
  }
}

function textoSeguro(valor, limite = 120) {
  return String(valor || "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limite);
}

function slugSeguro(valor) {
  return textoSeguro(valor, 80)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "outro";
}

function dataHoraBrasilia(valor, incluirHora = true) {
  const opcoes = {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };
  if (incluirHora) {
    opcoes.hour = "2-digit";
    opcoes.minute = "2-digit";
  }
  return new Intl.DateTimeFormat("pt-BR", opcoes).format(new Date(valor));
}

function dataPasta(valor) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(valor)).replaceAll("/", "-");
}

function extrairMidia(mensagem) {
  for (const tipo of ["audio", "video", "image", "document", "sticker"]) {
    if (mensagem?.[tipo]?.id) return { tipo, ...mensagem[tipo] };
  }
  return null;
}

function extensaoPorMime(mime = "", tipo = "document") {
  const mapa = {
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/ogg": "ogg",
    "audio/aac": "aac",
    "audio/wav": "wav",
    "audio/amr": "amr",
    "audio/opus": "opus",
    "video/mp4": "mp4",
    "video/3gpp": "3gp",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  return mapa[mime.toLowerCase()] ||
    (tipo === "audio"
      ? "mp3"
      : tipo === "video"
        ? "mp4"
        : tipo === "image"
          ? "jpg"
          : tipo === "sticker"
            ? "webp"
            : "bin");
}

function extensaoDaMidia(midia) {
  const nome = textoSeguro(midia.filename || "", 180);
  const encontrada = nome.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase();
  return encontrada || extensaoPorMime(midia.mime_type, midia.tipo);
}

async function obterDrive() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: "v3", auth });
  }

  if (process.env.GOOGLE_SERVICE_KEY) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    return google.drive({ version: "v3", auth: await auth.getClient() });
  }

  throw new Error(
    "Google Drive não configurado. Configure o OAuth da conta da igreja ou uma conta de serviço com acesso a um Drive Compartilhado."
  );
}

function mensagemErroDrive(error) {
  const mensagem = String(
    error?.response?.data?.error?.message ||
      error?.errors?.[0]?.message ||
      error?.message ||
      ""
  );
  const semCota =
    /service accounts? do not have storage quota/i.test(mensagem) ||
    /storageQuota/i.test(mensagem);

  if (semCota && !process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
    return "O Google Drive da igreja ainda precisa ser conectado ao sistema. A equipe responsável já pode configurar o acesso pela conta Google da igreja.";
  }
  return textoSeguro(mensagem, 300) || "O Google Drive não aceitou o arquivo.";
}

function escaparBuscaDrive(valor) {
  return String(valor || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function encontrarPastaDrive(drive, parentId, chave, valor) {
  const resposta = await drive.files.list({
    q: [
      `'${escaparBuscaDrive(parentId)}' in parents`,
      `mimeType = '${DRIVE_FOLDER_MIME}'`,
      "trashed = false",
      `appProperties has { key='${escaparBuscaDrive(chave)}' and value='${escaparBuscaDrive(valor)}' }`,
    ].join(" and "),
    fields: "files(id,name,webViewLink)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return resposta.data.files?.[0] || null;
}

async function encontrarOuCriarPasta(drive, { parentId, nome, chave, valor }) {
  const existente = await encontrarPastaDrive(drive, parentId, chave, valor);
  if (existente) return existente;

  const criada = await drive.files.create({
    requestBody: {
      name: textoSeguro(nome, 120),
      mimeType: DRIVE_FOLDER_MIME,
      parents: [parentId],
      appProperties: { [chave]: valor },
    },
    fields: "id,name,webViewLink",
    supportsAllDrives: true,
  });
  return criada.data;
}

async function garantirPastasDoCulto(culto, departamento) {
  const drive = await obterDrive();
  let pastaRaiz = process.env.DRIVE_PASTA_HINOS;
  if (!pastaRaiz) {
    const pastaBase = process.env.DRIVE_PASTA_PEDIDOS;
    if (!pastaBase) {
      throw new Error("Configure DRIVE_PASTA_HINOS na Vercel.");
    }
    const pastaHinos = await encontrarOuCriarPasta(drive, {
      parentId: pastaBase,
      nome: "HINOS PARA PROJEÇÃO",
      chave: "sistema_adjacare",
      valor: "hinos_projecao",
    });
    pastaRaiz = pastaHinos.id;
  }

  const pastaCulto = await encontrarOuCriarPasta(drive, {
    parentId: pastaRaiz,
    nome: `${dataPasta(culto.data_culto)} - ${culto.titulo}`,
    chave: "whatsapp_culto_id",
    valor: culto.id,
  });

  if (culto.pasta_drive_id !== pastaCulto.id) {
    await supabase
      .from("whatsapp_cultos")
      .update({
        pasta_drive_id: pastaCulto.id,
        pasta_drive_link: pastaCulto.webViewLink || `https://drive.google.com/drive/folders/${pastaCulto.id}`,
      })
      .eq("id", culto.id);
  }

  const pastaDepartamento = await encontrarOuCriarPasta(drive, {
    parentId: pastaCulto.id,
    nome: departamento,
    chave: "whatsapp_departamento",
    valor: `${culto.id}:${slugSeguro(departamento)}`,
  });
  return { drive, pastaCulto, pastaDepartamento };
}

async function criarPastaPedidoDrive(titulo) {
  const pastaBase = process.env.DRIVE_PASTA_PEDIDOS;
  if (!pastaBase) {
    throw new Error("Configure DRIVE_PASTA_PEDIDOS na Vercel.");
  }

  const drive = await obterDrive();
  const pastaPedidos = await encontrarOuCriarPasta(drive, {
    parentId: pastaBase,
    nome: "PEDIDOS DO SISTEMA",
    chave: "sistema_adjacare",
    valor: "pedidos",
  });

  const criada = await drive.files.create({
    requestBody: {
      name: textoSeguro(titulo, 120),
      mimeType: DRIVE_FOLDER_MIME,
      parents: [pastaPedidos.id],
      appProperties: {
        sistema_adjacare: "pedido_whatsapp",
      },
    },
    fields: "id,webViewLink",
    supportsAllDrives: true,
  });

  return criada.data.webViewLink || `https://drive.google.com/drive/folders/${criada.data.id}`;
}

async function baixarMidiaWhatsApp(mediaId) {
  const metadados = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${mediaId}`,
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
  );
  if (!metadados.ok) {
    throw new Error(`Não foi possível consultar a mídia (${metadados.status}).`);
  }
  const meta = await metadados.json();
  if (!meta.url) throw new Error("A Meta não retornou o endereço do arquivo.");
  const limite = Number(process.env.WHATSAPP_HINO_MAX_BYTES || 50 * 1024 * 1024);
  if (Number(meta.file_size || 0) > limite) {
    throw new Error(`O arquivo ultrapassa o limite de ${Math.round(limite / 1024 / 1024)} MB.`);
  }

  const arquivo = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });
  if (!arquivo.ok) {
    throw new Error(`Não foi possível baixar a mídia (${arquivo.status}).`);
  }
  const buffer = Buffer.from(await arquivo.arrayBuffer());
  if (buffer.length > limite) {
    throw new Error(`O arquivo ultrapassa o limite de ${Math.round(limite / 1024 / 1024)} MB.`);
  }
  return {
    buffer,
    mimeType: meta.mime_type || arquivo.headers.get("content-type") || "application/octet-stream",
  };
}

async function proximoNumeroHino(cultoId, departamento, nomeApresentacao) {
  const { count } = await supabase
    .from("whatsapp_hinos_projecao")
    .select("id", { count: "exact", head: true })
    .eq("culto_id", cultoId)
    .eq("departamento", departamento)
    .eq("nome_apresentacao", nomeApresentacao);
  return Number(count || 0) + 1;
}

async function salvarHinoNoDrive({ telefone, midia, culto, departamento, nomeApresentacao }) {
  if (culto.status !== "aberto") {
    throw new Error("O recebimento de hinos para esse culto está fechado.");
  }
  if (culto.prazo_envio && new Date(culto.prazo_envio).getTime() < Date.now()) {
    throw new Error("O prazo de envio dos hinos para esse culto terminou.");
  }

  const download = await baixarMidiaWhatsApp(midia.id);
  const hash = createHash("sha256").update(download.buffer).digest("hex");
  const { data: duplicado } = await supabase
    .from("whatsapp_hinos_projecao")
    .select("protocolo,nome_drive,arquivo_drive_link")
    .eq("culto_id", culto.id)
    .eq("hash_sha256", hash)
    .maybeSingle();
  if (duplicado) return { duplicado: true, registro: duplicado };

  const numero = await proximoNumeroHino(culto.id, departamento, nomeApresentacao);
  const extensao = extensaoDaMidia({ ...midia, mime_type: download.mimeType });
  const nomeDrive = `${textoSeguro(nomeApresentacao, 90)} - Hino ${String(numero).padStart(2, "0")}.${extensao}`;
  const { drive, pastaDepartamento } = await garantirPastasDoCulto(culto, departamento);

  const upload = await drive.files.create({
    requestBody: {
      name: nomeDrive,
      parents: [pastaDepartamento.id],
      description: `Recebido pelo WhatsApp ${telefone} para ${culto.titulo}.`,
      appProperties: {
        whatsapp_culto_id: culto.id,
        whatsapp_hash_sha256: hash,
      },
    },
    media: { mimeType: download.mimeType, body: BufferToStream(download.buffer) },
    fields: "id,name,webViewLink",
    supportsAllDrives: true,
  });

  const payload = {
    culto_id: culto.id,
    telefone,
    departamento,
    nome_apresentacao: nomeApresentacao,
    tipo_midia: midia.tipo,
    nome_original: textoSeguro(midia.filename || "", 180) || null,
    nome_drive: nomeDrive,
    mime_type: download.mimeType,
    tamanho_bytes: download.buffer.length,
    hash_sha256: hash,
    whatsapp_media_id: midia.id,
    arquivo_drive_id: upload.data.id,
    arquivo_drive_link: upload.data.webViewLink || `https://drive.google.com/file/d/${upload.data.id}/view`,
    status: "recebido",
  };
  const { data: registro, error } = await supabase
    .from("whatsapp_hinos_projecao")
    .insert(payload)
    .select("protocolo,nome_drive,arquivo_drive_link")
    .single();
  if (error) throw error;

  await enviarPush({
    titulo: "🎵 Novo hino recebido",
    mensagem: `${nomeApresentacao} • ${culto.titulo} • ${departamento}`,
    roles: ["Administrador", "Mídia", "Sonoplastia"],
    preferencia: "notificar_hinos",
    dados: {
      tipo: "hino",
      protocolo: registro.protocolo,
      culto_id: culto.id,
      path: "/whatsapp?aba=hinos",
    },
  }).catch((erroPush) =>
    console.error("Hino salvo, mas a notificação push falhou:", erroPush)
  );

  return { duplicado: false, registro };
}

function BufferToStream(buffer) {
  return Readable.from(buffer);
}

async function listarCultosAbertos() {
  const agora = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("whatsapp_cultos")
    .select("id,titulo,data_culto,prazo_envio,status,pasta_drive_id,pasta_drive_link")
    .eq("status", "aberto")
    .gte("data_culto", agora)
    .order("data_culto", { ascending: true })
    .limit(10);
  if (error) throw error;
  return data || [];
}

async function enviarListaCultos(telefone) {
  const cultos = await listarCultosAbertos();
  if (!cultos.length) {
    await enviarBotoes(telefone, {
      corpo: "No momento não há cultos abertos para envio de hinos. Você pode falar com a equipe de Som e Projeção.",
      botoes: [
        { id: "som_atendente", title: "Falar com a equipe" },
        { id: "som_cancelar", title: "Voltar ao menu" },
      ],
    });
    return false;
  }
  await enviarLista(telefone, {
    cabecalho: "Hinos para projeção",
    corpo: "Selecione o culto em que o hino será apresentado.",
    botao: "Selecionar culto",
    secoes: [{
      titulo: "Próximos cultos",
      rows: cultos.map((culto) => ({
        id: `som_culto_${culto.id}`,
        title: textoSeguro(culto.titulo, 24),
        description: dataHoraBrasilia(culto.data_culto),
      })),
    }],
  });
  return true;
}

async function listarDepartamentosHinos() {
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .not("role", "is", null);

  if (error) throw error;

  const departamentos = [...new Set(
    (data || [])
      .map((usuario) => textoSeguro(usuario.role, 80))
      .filter(Boolean)
      .filter((nome) => !DEPARTAMENTOS_HINOS_BLOQUEADOS.has(slugSeguro(nome)))
  )].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return departamentos;
}

function encontrarDepartamento(departamentos, slug, nomePadrao) {
  return departamentos.find((nome) => slugSeguro(nome) === slug) || nomePadrao;
}

function opcaoDepartamento(nome, title = nome, description) {
  return {
    id: `som_dep_${slugSeguro(nome)}`,
    title: title.slice(0, 24),
    description,
    tipo: "departamento",
    departamento: nome,
  };
}

function montarPaginaDepartamentos(departamentos, pagina = 0) {
  if (pagina === 0) {
    const cofemp = encontrarDepartamento(departamentos, "cofemp", "Cofemp");
    const infantil = encontrarDepartamento(departamentos, "infantil", "Infantil");
    const midia = encontrarDepartamento(departamentos, "midia", "Mídia");

    return [
      opcaoDepartamento("Adolescentes e Jovens", "Adolesc. e Jovens"),
      opcaoDepartamento(cofemp),
      opcaoDepartamento(infantil),
      opcaoDepartamento("Individual", "Individual (solo)"),
      opcaoDepartamento(midia),
      {
        id: "som_dep_pagina_1",
        title: "Outros departamentos",
        description: "Ver os departamentos restantes",
        tipo: "pagina",
        pagina: 1,
      },
    ];
  }

  const principais = new Set(["adolescentes", "jovens", "cofemp", "infantil", "midia"]);
  const restantes = departamentos
    .filter((nome) => !principais.has(slugSeguro(nome)))
    .concat("Outro");
  const inicio = (pagina - 1) * DEPARTAMENTOS_POR_PAGINA;
  const itens = restantes
    .slice(inicio, inicio + DEPARTAMENTOS_POR_PAGINA)
    .map((nome) => opcaoDepartamento(nome));

  if (inicio + DEPARTAMENTOS_POR_PAGINA < restantes.length) {
    itens.push({
      id: `som_dep_pagina_${pagina + 1}`,
      title: "Mais departamentos",
      description: "Ver as próximas opções",
      tipo: "pagina",
      pagina: pagina + 1,
    });
  }

  itens.push({
    id: `som_dep_pagina_${pagina > 1 ? pagina - 1 : 0}`,
    title: pagina > 1 ? "Página anterior" : "Voltar aos principais",
    description: "Voltar à lista anterior",
    tipo: "pagina",
    pagina: pagina > 1 ? pagina - 1 : 0,
  });

  return itens;
}

async function enviarListaDepartamentos(telefone, pagina = 0) {
  const departamentos = await listarDepartamentosHinos();
  const opcoes = montarPaginaDepartamentos(departamentos, pagina);

  await enviarLista(telefone, {
    cabecalho: "Quem irá cantar?",
    corpo: "Selecione o departamento. Para cantor, dupla ou convidado, escolha Individual.",
    botao: "Selecionar",
    secoes: [{
      titulo: pagina === 0 ? "Quem irá cantar?" : "Outros departamentos",
      rows: opcoes.map(({ id, title, description }) => ({ id, title, description })),
    }],
  });
}

async function enviarMenuPrincipal(telefone) {
  await enviarLista(telefone, {
    cabecalho: "AD Jacaré",
    corpo: "Olá! Escolha como podemos ajudar.",
    botao: "Abrir opções",
    secoes: [{ titulo: "Atendimento", rows: [
      { id:"menu_som", title:"Enviar hino/áudio/vídeo", description:"Som e Projeção" },
      { id:"menu_ebd", title:"Senha da EBD", description:"Consultar acesso do aluno" },
      { id:"menu_restrito", title:"Área de Liderança", description:"Líderes, dirigentes e professores" },
      { id:"menu_encerrar", title:"Encerrar atendimento", description:"Finalizar e parar o bot" },
      { id:"menu_atendente", title:"Falar com atendente", description:"Atendimento humano" },
    ] }],
  });
}

async function enviarMenuAreaRestrita(telefone) {
  await enviarLista(telefone, {
    cabecalho: "Área de Liderança",
    corpo: "Acesso interno para líderes, dirigentes e professores cadastrados.",
    botao: "Abrir serviços",
    secoes: [{ titulo: "Serviços internos", rows: [
      { id:"area_pedido", title:"Pedido para Mídia", description:"Solicitar arte, divulgação ou mídia" },
      { id:"area_status", title:"Consultar pedidos", description:"Acompanhar solicitações enviadas" },
      { id:"area_suporte", title:"Suporte para líderes", description:"Dúvidas de líderes e professores" },
      { id:"area_midia", title:"Falar com a Mídia", description:"Atendimento humano" },
      { id:"area_secretaria", title:"Falar com Secretaria", description:"Atendimento humano" },
      { id:"area_menu", title:"Menu principal", description:"Voltar às opções públicas" },
    ] }],
  });
}

function menuPrincipal() {
  return `Olá! 👋
Você está no atendimento da AD Jacaré.

Digite uma opção:

1️⃣ Enviar hino, áudio ou vídeo para Som/Projeção
2️⃣ Consultar senha da EBD
3️⃣ Área de Liderança
4️⃣ Encerrar atendimento
5️⃣ Falar com um atendente`;
}

function ehSaudacao(texto = "") {
  const normalizado = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z\s]/g, "").trim();
  return /^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite|iniciar|inicio|comecar|atendimento)$/.test(normalizado);
}

async function ativarAtendimentoHumano(telefone, destino = "Atendimento") {
  await supabase
    .from("whatsapp_sessoes")
    .update({
      etapa: "atendimento_humano",
      atendimento_humano: true,
      atendente_nome: null,
      autenticado: false,
      usuario_id: null,
      usuario_nome: null,
      usuario_email: null,
      dados: { destino },
    })
    .eq("telefone", telefone);

  await enviarMensagem(
    telefone,
    `👋 Sua conversa foi encaminhada para *${destino}*.

Aguarde um momento. Um atendente irá responder por aqui.`
  );
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    if (req.query.acao === "formulario_hinos") {
      try {
        const [cultos, departamentos] = await Promise.all([
          listarCultosAbertos(),
          listarDepartamentosHinos(),
        ]);
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).json({
          cultos: cultos.map(({ id, titulo, data_culto, prazo_envio, status }) => ({
            id,
            titulo,
            data_culto,
            prazo_envio,
            status,
          })),
          departamentos,
        });
      } catch (error) {
        console.error("Erro ao carregar formulário público de hinos:", error);
        return res.status(500).json({ error: "Não foi possível carregar as informações." });
      }
    }

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send("Token inválido");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Método não permitido");
  }

  try {
    const mensagem = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!mensagem) return res.status(200).send("Sem mensagem");

    if (mensagem.id) {
      const { error: erroEvento } = await supabase.from("whatsapp_eventos_processados").insert({ mensagem_id: mensagem.id });
      if (erroEvento?.code === "23505") return res.status(200).send("Mensagem já processada");
      if (erroEvento) console.error("Deduplicação indisponível:", erroEvento.message);
    }

    const telefone = mensagem.from;
    const interacaoId = mensagem.interactive?.list_reply?.id || mensagem.interactive?.button_reply?.id;
    const aliases = {
      menu_som:"1", menu_ebd:"2", menu_restrito:"3", menu_encerrar:"4", menu_atendente:"5",
      som_confirmar:"1", som_corrigir:"2", som_cancelar:"3",
      som_outro_hino:"1", som_finalizar:"2", som_atendente:"som_atendente",
    };
    const texto = aliases[interacaoId] || interacaoId || mensagem.text?.body?.trim();
    const midiaRecebida = extrairMidia(mensagem);

    if (texto) {
      await salvarMensagem(telefone, "recebida", mensagem.interactive?.list_reply?.title || mensagem.interactive?.button_reply?.title || texto);
    } else if (midiaRecebida) {
      await salvarMensagem(
        telefone,
        "recebida",
        `Arquivo recebido: ${textoSeguro(midiaRecebida.filename || midiaRecebida.tipo, 180)}`
      );
    }

    const { data: sessoes } = await supabase
      .from("whatsapp_sessoes")
      .select("*")
      .eq("telefone", telefone)
      .limit(1);

    let sessao = sessoes?.[0];

    if (!sessao) {
      const { data: novaSessao, error } = await supabase
        .from("whatsapp_sessoes")
        .insert({
          telefone,
          etapa: "menu",
          autenticado: false,
          atendimento_humano: false,
          dados: {},
        })
        .select()
        .single();

      if (error) {
        await enviarMensagem(telefone, `Erro ao iniciar sessão: ${error.message}`);
        return res.status(200).send("ok");
      }

      sessao = novaSessao;
      await enviarMenuPrincipal(telefone);
      return res.status(200).send("ok");
    }

    if (sessao.atendimento_humano === true) {
      return res.status(200).send("Atendimento humano ativo");
    }

    if (sessao.etapa === "encerrado") {
      if (texto && (texto.toLowerCase() === "menu" || ehSaudacao(texto))) {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "menu",
            autenticado: false,
            usuario_id: null,
            usuario_nome: null,
            usuario_email: null,
            atendimento_humano: false,
            dados: {},
          })
          .eq("telefone", telefone);
        await enviarMenuPrincipal(telefone);
      }
      return res.status(200).send("Atendimento encerrado");
    }

    if (midiaRecebida && sessao.etapa === "som_aguardando_arquivo") {
      try {
        const dados = sessao.dados || {};
        const { data: culto, error: erroCulto } = await supabase
          .from("whatsapp_cultos")
          .select("*")
          .eq("id", dados.culto_id)
          .single();
        if (erroCulto || !culto) throw new Error("O culto selecionado não foi encontrado.");

        await enviarMensagem(
          telefone,
          "⏳ Recebi o arquivo. Agora estou ajustando o nome e salvando na pasta correta do Google Drive. Aguarde um momento..."
        );

        const resultado = await salvarHinoNoDrive({
          telefone,
          midia: midiaRecebida,
          culto,
          departamento: dados.departamento,
          nomeApresentacao: dados.nome_apresentacao,
        });

        await supabase
          .from("whatsapp_sessoes")
          .update({ etapa: "som_apos_envio", dados })
          .eq("telefone", telefone);

        const registro = resultado.registro;
        await enviarBotoes(telefone, {
          corpo: resultado.duplicado
            ? `Esse mesmo arquivo já havia sido recebido para este culto.\n\nProtocolo: *${registro.protocolo}*\nArquivo: ${registro.nome_drive}`
            : `✅ *Hino recebido com sucesso!*\n\nProtocolo: *${registro.protocolo}*\nCulto: ${culto.titulo}\nData: ${dataHoraBrasilia(culto.data_culto)}\nDepartamento: ${dados.departamento}\nQuem cantará: ${dados.nome_apresentacao}\nArquivo: ${registro.nome_drive}\nStatus: Recebido\n\nGuarde o número do protocolo.`,
          botoes: [
            { id: "som_outro_hino", title: "Enviar outro hino" },
            { id: "som_finalizar", title: "Finalizar" },
          ],
        });
      } catch (error) {
        console.error("Erro ao processar hino:", error);
        await enviarBotoes(telefone, {
          corpo: `Não consegui salvar esse arquivo.\n\nMotivo: ${mensagemErroDrive(error)}\n\nVocê pode tentar novamente ou falar com a equipe.`,
          botoes: [
            { id: "som_atendente", title: "Falar com a equipe" },
            { id: "som_cancelar", title: "Voltar ao menu" },
          ],
        });
      }
      return res.status(200).send("ok");
    }

    if (midiaRecebida) {
      await enviarMensagem(
        telefone,
        `Recebi seu arquivo, mas antes precisamos selecionar o culto e identificar quem irá cantar.\n\nEnvie *menu* e escolha *Som e Projeção*.`
      );
      return res.status(200).send("ok");
    }

    if (!texto) {
      await enviarMensagem(
        telefone,
        `Não consegui identificar o conteúdo enviado.\n\nEnvie *menu* para começar novamente.`
      );
      return res.status(200).send("ok");
    }

    if (texto.toLowerCase() === "menu" || ehSaudacao(texto)) {
      await supabase
        .from("whatsapp_sessoes")
        .update({
          etapa: "menu",
          autenticado: false,
          usuario_id: null,
          usuario_nome: null,
          usuario_email: null,
          atendimento_humano: false,
          dados: {},
        })
        .eq("telefone", telefone);

      await enviarMenuPrincipal(telefone);
      return res.status(200).send("ok");
    }

    if (interacaoId === "som_atendente") {
      await ativarAtendimentoHumano(telefone, "Som/Projeção");
      return res.status(200).send("ok");
    }

    if (interacaoId === "som_cancelar" && String(sessao.etapa || "").startsWith("som_")) {
      await supabase.from("whatsapp_sessoes").update({ etapa: "menu", dados: {} }).eq("telefone", telefone);
      await enviarMenuPrincipal(telefone);
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "menu") {
      if (texto === "2") {
        await supabase
          .from("whatsapp_sessoes")
          .update({ etapa: "aguardando_nome_ebd", dados: {} })
          .eq("telefone", telefone);
        await enviarMensagem(
          telefone,
          `🔐 Consulta de senha da EBD

Informe o nome completo do aluno:`
        );
        return res.status(200).send("ok");
      }

      if (texto === "5") {
        await ativarAtendimentoHumano(telefone, "Atendimento");
        return res.status(200).send("ok");
      }

      if (texto === "1") {
        try {
          const temCultos = await enviarListaCultos(telefone);
          await supabase
            .from("whatsapp_sessoes")
            .update({
              etapa: temCultos ? "som_selecionando_culto" : "som_sem_cultos",
              dados: { destino: "Som/Projeção" },
            })
            .eq("telefone", telefone);
        } catch (error) {
          console.error("Erro ao listar cultos:", error);
          await ativarAtendimentoHumano(telefone, "Som/Projeção");
        }
        return res.status(200).send("ok");
      }

      if (texto === "3") {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "aguardando_email_area_restrita",
            autenticado: false,
            usuario_id: null,
            usuario_nome: null,
            usuario_email: null,
            dados: {},
          })
          .eq("telefone", telefone);
        await enviarMensagem(
          telefone,
          "🔒 Esta área é exclusiva para líderes, dirigentes e professores cadastrados.\n\nInforme seu e-mail cadastrado no sistema:"
        );
        return res.status(200).send("ok");
      }

      if (texto === "4") {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "encerrado",
            autenticado: false,
            usuario_id: null,
            usuario_nome: null,
            usuario_email: null,
            atendimento_humano: false,
            dados: {},
          })
          .eq("telefone", telefone);
        await enviarMensagem(
          telefone,
          "✅ Atendimento encerrado. O bot permanecerá parado. Para iniciar uma nova conversa, envie *oi* ou *menu*."
        );
        return res.status(200).send("ok");
      }

      await enviarMensagem(telefone, "Não consegui identificar essa opção.");
      await enviarMenuPrincipal(telefone);
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "menu_area_restrita") {
      if (!sessao.autenticado) {
        await supabase
          .from("whatsapp_sessoes")
          .update({ etapa: "aguardando_email_area_restrita", dados: {} })
          .eq("telefone", telefone);
        await enviarMensagem(telefone, "Informe seu e-mail cadastrado no sistema:");
        return res.status(200).send("ok");
      }

      if (interacaoId === "area_pedido") {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "aguardando_titulo_pedido",
            dados: { ...sessao.dados, destino: "Mídia" },
          })
          .eq("telefone", telefone);
        await enviarMensagem(telefone, "Digite o título do pedido:");
        return res.status(200).send("ok");
      }

      if (interacaoId === "area_status") {
        await consultarStatus(telefone, sessao.usuario_nome);
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "encerrado",
            autenticado: false,
            usuario_id: null,
            usuario_nome: null,
            usuario_email: null,
            dados: {},
          })
          .eq("telefone", telefone);
        return res.status(200).send("ok");
      }

      if (interacaoId === "area_suporte") {
        await supabase
          .from("whatsapp_sessoes")
          .update({ etapa: "suporte_lider" })
          .eq("telefone", telefone);
        await enviarMensagem(telefone, "Explique sua dúvida como líder ou professor:");
        return res.status(200).send("ok");
      }

      if (interacaoId === "area_midia") {
        await ativarAtendimentoHumano(telefone, "Mídia");
        return res.status(200).send("ok");
      }

      if (interacaoId === "area_secretaria") {
        await ativarAtendimentoHumano(telefone, "Secretaria");
        return res.status(200).send("ok");
      }

      if (interacaoId === "area_menu") {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "menu",
            autenticado: false,
            usuario_id: null,
            usuario_nome: null,
            usuario_email: null,
            dados: {},
          })
          .eq("telefone", telefone);
        await enviarMenuPrincipal(telefone);
        return res.status(200).send("ok");
      }

      await enviarMensagem(telefone, "Selecione uma das opções da área restrita.");
      await enviarMenuAreaRestrita(telefone);
      return res.status(200).send("ok");
    }

    if (sessao.etapa?.startsWith("tetelestai_")) {
      await supabase.from("whatsapp_sessoes").update({ etapa:"menu", dados:{} }).eq("telefone", telefone);
      await enviarMensagem(telefone, "A opção de camisetas não está mais disponível por aqui.");
      await enviarMenuPrincipal(telefone);
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "aguardando_nome_ebd") {
  const nomeBusca = texto.trim();

  const { data: alunos, error } = await supabase
    .from("ebd_alunos")
    .select("*")
    .ilike("nome", `%${nomeBusca}%`)
    .limit(5);

  if (error) {
    await enviarMensagem(
      telefone,
      `Erro ao consultar aluno da EBD.

Detalhe: ${error.message}`
    );
    return res.status(200).send("ok");
  }

  if (!alunos || alunos.length === 0) {
    await enviarMensagem(
      telefone,
      `Não encontrei nenhum aluno com esse nome.

Confira se digitou corretamente ou envie "menu" para voltar.`
    );
    return res.status(200).send("ok");
  }

  if (alunos.length > 1) {
    const lista = alunos
      .map((aluno, index) => `${index + 1}. ${aluno.nome}`)
      .join("\n");

    await supabase
      .from("whatsapp_sessoes")
      .update({
        etapa: "selecionando_aluno_ebd",
        dados: { alunos },
      })
      .eq("telefone", telefone);

    await enviarMensagem(
      telefone,
      `Encontrei mais de um aluno:

${lista}

Digite o número correspondente:`
    );

    return res.status(200).send("ok");
  }

  const aluno = alunos[0];

  const login = aluno.email_portal || "Login não cadastrado";
  const senha = aluno.senha_portal || "Senha não cadastrada";
  const situacao = aluno.ativo ? "🟢 Ativo" : "🔴 Inativo";

  await supabase
    .from("whatsapp_sessoes")
    .update({
      etapa: "portal_aluno_opcoes",
      dados: {},
    })
    .eq("telefone", telefone);

  await enviarMensagem(
    telefone,
    `🎓 Dados do Portal do Aluno

👤 Aluno: ${aluno.nome}

📧 Login: ${login}

🔑 Senha: ${senha}

📌 Situação: ${situacao}

🌐 Acesso:
https://sistema.adjacare.org/portal-aluno

Digite:

1️⃣ Falar com um atendente
2️⃣ Voltar ao menu`
  );

  return res.status(200).send("ok");
}

    if (sessao.etapa === "selecionando_aluno_ebd") {
  const indice = Number(texto) - 1;
  const alunos = sessao.dados?.alunos || [];
  const aluno = alunos[indice];

  if (!aluno) {
    await enviarMensagem(telefone, "Opção inválida. Digite o número do aluno.");
    return res.status(200).send("ok");
  }

  const login = aluno.email_portal || "Login não cadastrado";
  const senha = aluno.senha_portal || "Senha não cadastrada";
  const situacao = aluno.ativo ? "🟢 Ativo" : "🔴 Inativo";

  await supabase
    .from("whatsapp_sessoes")
    .update({
      etapa: "portal_aluno_opcoes",
      dados: {},
    })
    .eq("telefone", telefone);

  await enviarMensagem(
    telefone,
    `🎓 Dados do Portal do Aluno

👤 Aluno: ${aluno.nome}

📧 Login: ${login}

🔑 Senha: ${senha}

📌 Situação: ${situacao}

🌐 Acesso:
https://sistema.adjacare.org/portal-aluno

Digite:

1️⃣ Falar com um atendente
2️⃣ Voltar ao menu`
  );

  return res.status(200).send("ok");
}

    if (sessao.etapa === "portal_aluno_opcoes") {
  if (texto === "1") {
    await ativarAtendimentoHumano(telefone, "Suporte");

    return res.status(200).send("ok");
  }

  if (texto === "2") {
    await supabase
      .from("whatsapp_sessoes")
      .update({
        etapa: "menu",
        dados: {},
      })
      .eq("telefone", telefone);

    await enviarMenuPrincipal(telefone);

    return res.status(200).send("ok");
  }

  await enviarMensagem(
    telefone,
    `Opção inválida.

Digite:
1️⃣ Falar com um atendente
2️⃣ Voltar ao menu`
  );

  return res.status(200).send("ok");
}

    if (sessao.etapa === "som_sem_cultos") {
      if (texto === "som_atendente" || texto === "1") {
        await ativarAtendimentoHumano(telefone, "Som/Projeção");
        return res.status(200).send("ok");
      }
      await supabase.from("whatsapp_sessoes").update({ etapa: "menu", dados: {} }).eq("telefone", telefone);
      await enviarMenuPrincipal(telefone);
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "som_selecionando_culto") {
      const cultoId = String(interacaoId || texto).replace(/^som_culto_/, "");
      const { data: culto } = await supabase
        .from("whatsapp_cultos")
        .select("id,titulo,data_culto,prazo_envio,status")
        .eq("id", cultoId)
        .eq("status", "aberto")
        .maybeSingle();

      if (!culto) {
        await enviarMensagem(telefone, "Esse culto não está mais disponível. Escolha novamente.");
        await enviarListaCultos(telefone);
        return res.status(200).send("ok");
      }

      await supabase
        .from("whatsapp_sessoes")
        .update({
          etapa: "som_selecionando_departamento",
          dados: {
            destino: "Som/Projeção",
            culto_id: culto.id,
            culto_titulo: culto.titulo,
            culto_data: culto.data_culto,
            departamento_pagina: 0,
          },
        })
        .eq("telefone", telefone);
      await enviarListaDepartamentos(telefone);
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "som_selecionando_departamento") {
      const departamentos = await listarDepartamentosHinos();
      const paginaAtual = Number(sessao.dados?.departamento_pagina || 0);
      const opcoesPagina = montarPaginaDepartamentos(departamentos, paginaAtual);
      const selecao = String(interacaoId || texto || "");
      let opcaoSelecionada = null;

      if (interacaoId) {
        opcaoSelecionada = opcoesPagina.find((opcao) => opcao.id === interacaoId) || null;
      } else if (/^\d+$/.test(selecao)) {
        opcaoSelecionada = opcoesPagina[Number(selecao) - 1] || null;
      }

      if (opcaoSelecionada?.tipo === "pagina" || selecao.startsWith("som_dep_pagina_")) {
        const pagina = opcaoSelecionada?.pagina ?? Number(selecao.replace("som_dep_pagina_", ""));
        await supabase
          .from("whatsapp_sessoes")
          .update({ dados: { ...sessao.dados, departamento_pagina: pagina } })
          .eq("telefone", telefone);
        await enviarListaDepartamentos(telefone, pagina);
        return res.status(200).send("ok");
      }

      const departamentoId = selecao.replace(/^som_dep_/, "");
      const departamento =
        opcaoSelecionada?.departamento ||
        departamentos.find((nome) => slugSeguro(nome) === departamentoId);

      if (!departamento) {
        await enviarMensagem(telefone, "Selecione uma das opções da lista.");
        await enviarListaDepartamentos(telefone, paginaAtual);
        return res.status(200).send("ok");
      }

      await supabase
        .from("whatsapp_sessoes")
        .update({
          etapa: "som_aguardando_nome_apresentacao",
          dados: { ...sessao.dados, departamento },
        })
        .eq("telefone", telefone);
      await enviarMensagem(
        telefone,
        departamento === "Individual"
          ? "Informe o *nome de quem irá cantar*:"
          : `Informe o *nome do grupo, conjunto ou pessoa* que irá cantar pelo departamento ${departamento}:`
      );
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "som_aguardando_nome_apresentacao") {
      const nomeApresentacao = textoSeguro(texto, 120);
      if (nomeApresentacao.length < 2) {
        await enviarMensagem(telefone, "Informe um nome válido com pelo menos 2 caracteres.");
        return res.status(200).send("ok");
      }

      const dados = { ...sessao.dados, nome_apresentacao: nomeApresentacao };
      await supabase
        .from("whatsapp_sessoes")
        .update({ etapa: "som_confirmando_dados", dados })
        .eq("telefone", telefone);
      await enviarBotoes(telefone, {
        corpo: `Confira antes de enviar o arquivo:\n\nCulto: *${dados.culto_titulo}*\nData: ${dataHoraBrasilia(dados.culto_data)}\nDepartamento: ${dados.departamento}\nQuem cantará: ${dados.nome_apresentacao}\n\nEstá tudo correto?`,
        botoes: [
          { id: "som_confirmar", title: "Está correto" },
          { id: "som_corrigir", title: "Corrigir" },
          { id: "som_cancelar", title: "Cancelar" },
        ],
      });
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "som_confirmando_dados") {
      if (texto === "1") {
        await supabase
          .from("whatsapp_sessoes")
          .update({ etapa: "som_aguardando_arquivo" })
          .eq("telefone", telefone);
        await enviarMensagem(
          telefone,
          `Agora envie o material do hino.\n\nVocê pode enviar *imagem, áudio, vídeo, documento ou figurinha*.\nO material será renomeado e organizado automaticamente no Drive.`
        );
        return res.status(200).send("ok");
      }
      if (texto === "2") {
        await supabase
          .from("whatsapp_sessoes")
          .update({ etapa: "som_selecionando_culto", dados: { destino: "Som/Projeção" } })
          .eq("telefone", telefone);
        await enviarListaCultos(telefone);
        return res.status(200).send("ok");
      }
      if (texto === "3") {
        await supabase.from("whatsapp_sessoes").update({ etapa: "menu", dados: {} }).eq("telefone", telefone);
        await enviarMenuPrincipal(telefone);
        return res.status(200).send("ok");
      }
      await enviarMensagem(telefone, "Use um dos botões para confirmar, corrigir ou cancelar.");
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "som_aguardando_arquivo") {
      await enviarMensagem(
        telefone,
        "Envie o material como imagem, áudio, vídeo, documento ou figurinha. Para cancelar, envie *menu*."
      );
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "som_apos_envio") {
      if (texto === "1") {
        await supabase
          .from("whatsapp_sessoes")
          .update({ etapa: "som_aguardando_arquivo" })
          .eq("telefone", telefone);
        await enviarMensagem(telefone, "Pode enviar o próximo arquivo para o mesmo culto e participante.");
        return res.status(200).send("ok");
      }
      if (texto === "2") {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "encerrado",
            autenticado: false,
            usuario_id: null,
            usuario_nome: null,
            usuario_email: null,
            atendimento_humano: false,
            dados: {},
          })
          .eq("telefone", telefone);
        await enviarMensagem(
          telefone,
          "✅ Envio finalizado. Obrigado por encaminhar o material com antecedência. O atendimento foi encerrado."
        );
        return res.status(200).send("ok");
      }
      await enviarMensagem(telefone, "Escolha *Enviar outro hino* ou *Finalizar*.");
      return res.status(200).send("ok");
    }

    if (
      sessao.etapa === "aguardando_email_pedido" ||
      sessao.etapa === "aguardando_email_status" ||
      sessao.etapa === "aguardando_email_suporte_lider" ||
      sessao.etapa === "aguardando_email_area_restrita"
    ) {
      const email = texto.trim().toLowerCase();

      const { data: usuarios, error } = await supabase
        .from("users")
        .select("*")
        .ilike("email", email)
        .limit(1);

      if (error) {
        await enviarMensagem(telefone, `Erro ao consultar usuário: ${error.message}`);
        return res.status(200).send("ok");
      }

      const usuario = usuarios?.[0];

      if (!usuario) {
        await enviarMensagem(telefone, "Não encontrei esse e-mail no sistema.");
        return res.status(200).send("ok");
      }

      const nomeUsuario = usuario.nome || usuario.name || usuario.email;

      const ministerioUsuario =
        usuario.ministerio ||
        usuario.departamento ||
        usuario.setor ||
        usuario.role ||
        "Não informado";

      let proximaEtapa = "menu";

      if (sessao.etapa === "aguardando_email_pedido") {
        proximaEtapa = "aguardando_titulo_pedido";
      }

      if (sessao.etapa === "aguardando_email_status") {
        proximaEtapa = "consultando_status";
      }

      if (sessao.etapa === "aguardando_email_suporte_lider") {
        proximaEtapa = "suporte_lider";
      }

      if (sessao.etapa === "aguardando_email_area_restrita") {
        proximaEtapa = "menu_area_restrita";
      }

      await supabase
        .from("whatsapp_sessoes")
        .update({
          autenticado: true,
          usuario_id: usuario.id,
          usuario_nome: nomeUsuario,
          usuario_email: usuario.email,
          etapa: proximaEtapa,
          dados: {
            ...sessao.dados,
            ministerio: ministerioUsuario,
          },
        })
        .eq("telefone", telefone);

      if (proximaEtapa === "aguardando_titulo_pedido") {
        await enviarMensagem(
          telefone,
          `Olá, ${nomeUsuario}! ✅
Acesso confirmado.

Digite o título do pedido:`
        );
      }

      if (proximaEtapa === "consultando_status") {
        await consultarStatus(telefone, nomeUsuario);

        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "menu",
            autenticado: false,
            usuario_id: null,
            usuario_nome: null,
            usuario_email: null,
            dados: {},
          })
          .eq("telefone", telefone);
      }

      if (proximaEtapa === "suporte_lider") {
        await enviarMensagem(
          telefone,
          `Olá, ${nomeUsuario}! ✅
Acesso confirmado.

Explique sua dúvida como líder/professor:`
        );
      }

      if (proximaEtapa === "menu_area_restrita") {
        await enviarMensagem(telefone, `Olá, ${nomeUsuario}! ✅ Acesso confirmado.`);
        await enviarMenuAreaRestrita(telefone);
      }

      return res.status(200).send("ok");
    }

    if (sessao.etapa === "aguardando_titulo_pedido") {
      await supabase
        .from("whatsapp_sessoes")
        .update({
          etapa: "aguardando_descricao_pedido",
          dados: {
            ...sessao.dados,
            titulo: texto,
          },
        })
        .eq("telefone", telefone);

      await enviarMensagem(telefone, "Agora descreva o pedido:");
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "aguardando_descricao_pedido") {
      await supabase
        .from("whatsapp_sessoes")
        .update({
          etapa: "aguardando_prioridade_pedido",
          dados: {
            ...sessao.dados,
            descricao: texto,
          },
        })
        .eq("telefone", telefone);

      await enviarMensagem(
        telefone,
        `Qual a prioridade?

1 - Normal
2 - Urgente
3 - Baixa`
      );

      return res.status(200).send("ok");
    }

    if (sessao.etapa === "aguardando_prioridade_pedido") {
      let prioridade = "Normal";

      if (texto === "2") prioridade = "Urgente";
      if (texto === "3") prioridade = "Baixa";

      const dados = {
        ...sessao.dados,
        prioridade,
      };

      await supabase
        .from("whatsapp_sessoes")
        .update({
          etapa: "confirmando_pedido",
          dados,
        })
        .eq("telefone", telefone);

      await enviarMensagem(
        telefone,
        `Confira o pedido:

Título: ${dados.titulo}
Descrição: ${dados.descricao}
Destino: ${dados.destino}
Ministério: ${dados.ministerio || "Não informado"}
Prioridade: ${dados.prioridade}

Digite:
1 - Confirmar
2 - Cancelar`
      );

      return res.status(200).send("ok");
    }

    if (sessao.etapa === "confirmando_pedido") {
      if (texto === "1") {
        const dados = sessao.dados;
        const linkDrive = await criarPastaPedidoDrive(dados.titulo);

        const { error: erroPedido } = await supabase.from("pedidos").insert({
          titulo: dados.titulo,
          descricao: dados.descricao,
          destino: dados.destino || "Mídia",
          prioridade: dados.prioridade || "Normal",
          ministerio: dados.ministerio || "Não informado",
          criado_por: sessao.usuario_nome || "WhatsApp",
          status: "Pendente",
          link_drive: linkDrive,
          origem: "whatsapp",
          canal: "whatsapp",
          data: new Date().toISOString(),
        });

        if (erroPedido) {
          await enviarMensagem(
            telefone,
            `Erro ao salvar o pedido no sistema.

Detalhe: ${erroPedido.message}`
          );
          return res.status(200).send("ok");
        }

        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "menu",
            autenticado: false,
            usuario_id: null,
            usuario_nome: null,
            usuario_email: null,
            dados: {},
          })
          .eq("telefone", telefone);

        await enviarMensagem(
          telefone,
          `✅ Pedido criado com sucesso!

Status inicial: Pendente.

Conversa encerrada. Para uma nova solicitação, envie "menu" e faça a autenticação novamente.`
        );

        return res.status(200).send("ok");
      }

      if (texto === "2") {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "menu",
            autenticado: false,
            usuario_id: null,
            usuario_nome: null,
            usuario_email: null,
            dados: {},
          })
          .eq("telefone", telefone);

        await enviarMensagem(
          telefone,
          `Pedido cancelado.

Conversa encerrada. Para uma nova solicitação, envie "menu".`
        );

        return res.status(200).send("ok");
      }

      await enviarMensagem(telefone, "Digite 1 para confirmar ou 2 para cancelar.");
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "suporte_lider") {
      const tituloSuporte = "Suporte para líder/professor";
      const linkDrive = await criarPastaPedidoDrive(tituloSuporte);
      const { error: erroSuporte } = await supabase.from("pedidos").insert({
        titulo: tituloSuporte,
        descricao: texto,
        destino: "Mídia",
        prioridade: "Normal",
        ministerio: sessao.dados?.ministerio || "Não informado",
        criado_por: sessao.usuario_nome || "WhatsApp",
        status: "Pendente",
        link_drive: linkDrive,
        origem: "whatsapp",
        canal: "whatsapp",
        data: new Date().toISOString(),
      });

      if (erroSuporte) {
        await enviarMensagem(
          telefone,
          `Erro ao enviar suporte.

Detalhe: ${erroSuporte.message}`
        );
        return res.status(200).send("ok");
      }

      await supabase
        .from("whatsapp_sessoes")
        .update({
          etapa: "menu",
          autenticado: false,
          usuario_id: null,
          usuario_nome: null,
          usuario_email: null,
          dados: {},
        })
        .eq("telefone", telefone);

      await enviarMensagem(
        telefone,
        `✅ Solicitação enviada com sucesso!

Conversa encerrada. Para uma nova solicitação, envie "menu" e faça a autenticação novamente.`
      );

      return res.status(200).send("ok");
    }

    await enviarMenuPrincipal(telefone);
    return res.status(200).send("ok");
  } catch (error) {
    console.error("Erro no webhook:", error);
    return res.status(200).send("Erro registrado");
  }
}

async function consultarStatus(telefone, nomeUsuario) {
  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select("titulo, status, prioridade, created_at")
    .eq("criado_por", nomeUsuario)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    await enviarMensagem(
      telefone,
      `Erro ao consultar pedidos.

Detalhe: ${error.message}`
    );
    return;
  }

  if (!pedidos || pedidos.length === 0) {
    await enviarMensagem(
      telefone,
      `Não encontrei pedidos no seu nome.

Conversa encerrada. Para uma nova consulta, envie "menu".`
    );
    return;
  }

  const lista = pedidos
    .map(
      (p, index) =>
        `${index + 1}. ${p.titulo}
Status: ${p.status}
Prioridade: ${p.prioridade}`
    )
    .join("\n\n");

  await enviarMensagem(
    telefone,
    `📌 Seus últimos pedidos:

${lista}

Conversa encerrada. Para uma nova solicitação, envie "menu".`
  );
}
