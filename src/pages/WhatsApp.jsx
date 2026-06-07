import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import "./WhatsApp.css";

export default function WhatsApp({ user }) {
  const [mensagens, setMensagens] = useState([]);
  const [telefoneSelecionado, setTelefoneSelecionado] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function carregarMensagens() {
    const { data, error } = await supabase
      .from("whatsapp_mensagens")
      .select("*")
      .order("criado_em", { ascending: true });

    if (!error) setMensagens(data || []);
  }

  useEffect(() => {
    carregarMensagens();

    const canal = supabase
      .channel("whatsapp_mensagens_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_mensagens" },
        () => carregarMensagens()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const conversas = useMemo(() => {
    const mapa = {};

    mensagens.forEach((msg) => {
      mapa[msg.telefone] = {
        telefone: msg.telefone,
        ultimaMensagem: msg.mensagem,
        ultimaData: msg.criado_em,
      };
    });

    return Object.values(mapa).sort(
      (a, b) => new Date(b.ultimaData) - new Date(a.ultimaData)
    );
  }, [mensagens]);

  const mensagensDaConversa = mensagens.filter(
    (msg) => msg.telefone === telefoneSelecionado
  );

  async function enviarResposta() {
    if (!telefoneSelecionado || !texto.trim()) return;

    setEnviando(true);

    try {
      const resposta = await fetch("/api/whatsapp-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  telefone: telefoneSelecionado,
  mensagem: texto.trim(),
  enviado_por: user?.nome || "Sistema",
  role: user?.role || "",
}),
      });

      if (!resposta.ok) {
        alert("Erro ao enviar mensagem.");
      }

      setTexto("");
      carregarMensagens();
    } catch (error) {
      alert("Erro ao enviar mensagem.");
    }

    setEnviando(false);
  }

  return (
    <div className="whatsapp-page">
      <div className="whatsapp-header">
        <h1>WhatsApp</h1>
        <p>Mensagens recebidas pelo número oficial da AD Jacaré</p>
      </div>

      <div className="whatsapp-container">
        <aside className="whatsapp-sidebar">
          <div className="whatsapp-sidebar-title">Conversas</div>

          {conversas.length === 0 && (
            <div className="whatsapp-empty">Nenhuma conversa encontrada.</div>
          )}

          {conversas.map((conversa) => (
            <button
              key={conversa.telefone}
              className={
                telefoneSelecionado === conversa.telefone
                  ? "whatsapp-conversa ativa"
                  : "whatsapp-conversa"
              }
              onClick={() => setTelefoneSelecionado(conversa.telefone)}
            >
              <strong>{conversa.telefone}</strong>
              <span>{conversa.ultimaMensagem}</span>
            </button>
          ))}
        </aside>

        <main className="whatsapp-chat">
          {!telefoneSelecionado ? (
            <div className="whatsapp-placeholder">
              Selecione uma conversa para visualizar.
            </div>
          ) : (
            <>
              <div className="whatsapp-chat-topo">
                <strong>{telefoneSelecionado}</strong>
              </div>

              <div className="whatsapp-mensagens">
                {mensagensDaConversa.map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      msg.direcao === "enviada"
                        ? "whatsapp-balao enviada"
                        : "whatsapp-balao recebida"
                    }
                  >
                    
                    {msg.direcao === "enviada" && msg.enviado_por && (
  <strong className="whatsapp-enviado-por">
    {msg.enviado_por} {msg.role ? `• ${msg.role}` : ""}
  </strong>
)}

<p>{msg.mensagem}
                    <p>{msg.mensagem}</p>
                    <small>
{new Date(msg.criado_em).toLocaleString("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})}
                    </small>
                  </div>
                ))}
              </div>

              <div className="whatsapp-form">
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Digite sua resposta..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      enviarResposta();
                    }
                  }}
                />

                <button onClick={enviarResposta} disabled={enviando}>
                  {enviando ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
