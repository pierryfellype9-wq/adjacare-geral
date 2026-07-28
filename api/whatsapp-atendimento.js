import { createClient } from "@supabase/supabase-js";
import { authorizeRequest, rejectUnauthorized } from "../server/authorize.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function salvarMensagem(telefone, mensagem, atendente) {
  await supabase.from("whatsapp_mensagens").insert({
    telefone,
    direcao: "enviada",
    mensagem,
    enviado_por: atendente,
    criado_em: new Date().toISOString(),
  });
}

async function enviarMensagemWhatsApp(telefone, texto) {
  const response = await fetch(
    `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telefone,
        type: "text",
        text: {
          body: texto,
          preview_url: false,
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Erro Meta atendimento:", data);
    throw new Error(data?.error?.message || "Erro ao enviar mensagem");
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const authorization = await authorizeRequest(req, [
    "Administrador",
    "Dirigente",
    "Mídia",
    "Secretaria",
    "Suporte",
    "TI",
    "Sonoplastia",
    "Projeção",
  ]);
  if (authorization.error) return rejectUnauthorized(res, authorization);

  const { telefone, acao, atendente_nome } = req.body || {};

  if (!telefone || !acao) {
    return res.status(400).json({ error: "Telefone e ação são obrigatórios." });
  }

  const nome = atendente_nome || "Atendente";
  const iniciar = acao === "iniciar";
  const finalizar = acao === "finalizar";

  if (!iniciar && !finalizar) {
    return res.status(400).json({ error: "Ação inválida." });
  }

  const mensagemSistema = iniciar
    ? `👋 *${nome}* iniciou seu atendimento. Pode enviar sua mensagem por aqui.`
    : `✅ *${nome}* encerrou o atendimento. Se precisar de ajuda novamente, envie "menu".`;

  try {
    const { error } = await supabase
      .from("whatsapp_sessoes")
      .upsert(
        {
          telefone,
          etapa: iniciar ? "atendimento_humano" : "menu",
          atendimento_humano: iniciar,
          atendente_nome: iniciar ? nome : null,
          autenticado: false,
          dados: {},
        },
        { onConflict: "telefone" }
      );

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    await enviarMensagemWhatsApp(telefone, mensagemSistema);
    await salvarMensagem(telefone, mensagemSistema, nome);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Erro atendimento:", error);
    return res.status(500).json({
      error: error.message || "Erro interno ao alterar atendimento.",
    });
  }
}
