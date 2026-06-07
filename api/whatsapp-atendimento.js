import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { telefone, acao, atendente_nome } = req.body;

  if (!telefone || !acao) {
    return res.status(400).json({ error: "Dados incompletos." });
  }

  const ativo = acao === "iniciar";

  const { error } = await supabase
    .from("whatsapp_sessoes")
    .upsert(
      {
        telefone,
        etapa: ativo ? "atendimento_humano" : "menu",
        atendimento_humano: ativo,
        atendente_nome: ativo ? atendente_nome || "Atendente" : null,
        autenticado: false,
        dados: {},
      },
      { onConflict: "telefone" }
    );

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
