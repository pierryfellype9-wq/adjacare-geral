import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { telefone, mensagem, enviado_por, role } = req.body;

  if (!telefone || !mensagem) {
    return res.status(400).json({
      error: "Telefone e mensagem são obrigatórios.",
    });
  }

  try {
    const mensagemCompleta = `👤*${enviado_por || "Sistema"}*

${mensagem}`;

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
            body: mensagemCompleta,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return res.status(400).json(data);
    }

    await supabase.from("whatsapp_mensagens").insert({
      telefone,
      direcao: "enviada",
      mensagem,
      enviado_por: enviado_por || "Sistema",
      role: role || "",
      criado_em: new Date().toISOString(),
    });

    return res.status(200).json({
      ok: true,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro interno ao enviar mensagem.",
    });
  }
}
