import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getAuth() {
  return new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/calendar"]
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const {
      id,
      titulo,
      descricao,
      data_inicio,
      data_fim,
      local
    } = req.body;

    if (!id || !titulo || !data_inicio || !data_fim) {
      return res.status(400).json({ error: "Dados obrigatórios ausentes" });
    }

    const auth = getAuth();
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: {
        summary: titulo,
        description: descricao || "",
        location: local || "",
        start: {
          dateTime: data_inicio,
          timeZone: "America/Sao_Paulo"
        },
        end: {
          dateTime: data_fim,
          timeZone: "America/Sao_Paulo"
        }
      }
    });

    const eventId = response.data.id;
    const htmlLink = response.data.htmlLink;

    const { error: updateError } = await supabase
      .from("escalas_midia")
      .update({
        google_event_id: eventId,
        google_event_link: htmlLink,
        google_sync: true
      })
      .eq("id", id);

    if (updateError) {
      console.error("Erro ao atualizar Supabase:", updateError);
      return res.status(500).json({
        error: "Evento criado no Google, mas falhou ao salvar no banco"
      });
    }

    return res.status(200).json({
      ok: true,
      eventId,
      htmlLink
    });
  } catch (error) {
    console.error("Erro ao criar evento:", error?.response?.data || error);
    return res.status(500).json({
      error: "Erro ao criar evento no Google Calendar"
    });
  }
}
