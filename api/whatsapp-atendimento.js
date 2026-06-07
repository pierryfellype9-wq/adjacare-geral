import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function salvarMensagem(telefone, direcao, mensagem, enviado_por = null) {
  await supabase.from("whatsapp_mensagens").insert({
    telefone,
    direcao,
    mensagem,
    enviado_por,
    criado_em: new Date().toISOString(),
  });
}

async function enviarMensagemWhatsApp(telefone, texto) {
  await fetch(
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
        text: { body: texto },
      }),
    }
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { telefone, acao, atendente_nome } = req.body;

  if (!telefone || !acao) {
    return res.status(400).json({ error: "Dados incompletos." });
  }

  const nome = atendente_nome || "Um atendente";
  const ativo = acao === "iniciar";

  const mensagemSistema = ativo
    ? `👋 Olá! ${nome} iniciou seu atendimento. Pode enviar sua mensagem por aqui.`
    : `✅ Atendimento encerrado por ${nome}. Se precisar de ajuda novamente, envie uma nova mensagem por aqui.`;

  const { error } = await supabase
    .from("whatsapp_sessoes")
    .upsert(
      {
        telefone,
        etapa: ativo ? "atendimento_humano" : "menu",
        atendimento_humano: ativo,
        atendente_nome: ativo ? nome : null,
        autenticado: false,
        dados: {},
      },
      { onConflict: "telefone" }
    );

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await enviarMensagemWhatsApp(telefone, mensagemSistema);
  await salvarMensagem(telefone, "enviada", mensagemSistema, nome);

  return res.status(200).json({ ok: true });
}
