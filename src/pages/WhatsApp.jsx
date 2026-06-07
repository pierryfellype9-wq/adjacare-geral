import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import "./WhatsApp.css";

export default function WhatsApp({ user }) {
  const [mensagens, setMensagens] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [telefoneSelecionado, setTelefoneSelecionado] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  function formatarData(data) {
    return new Date(data).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function carregarTudo() {
    const { data: msgs, error: erroMsgs } = await supabase
      .from("whatsapp_mensagens")
      .select("*")
      .order("criado_em", { ascending: true });

    if (!erroMsgs) setMensagens(msgs || []);

    const { data: sessoesData, error: erroSessoes } = await supabase
      .from("whatsapp_sessoes")
      .select("*");

    if (!erroSessoes) setSessoes(sessoesData || []);
  }

  useEffect(() => {
    carregarTudo();

    const canalMensagens = supabase
      .channel("whatsapp_mensagens_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_mensagens" },
        () => carregarTudo()
      )
      .subscribe();

    const canalSessoes = supabase
      .channel("whatsapp_sessoes_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_sessoes" },
        () => carregarTudo()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalMensagens);
      supabase.removeChannel(canalSessoes);
    };
  }, []);

  const conversas = useMemo(() => {
    const mapa = {};

    mensagens.forEach((msg) => {
      const sessao = sessoes.find((s) => s.telefone === msg.telefone);

      mapa[msg.telefone] = {
        telefone: msg.telefone,
        ultimaMensagem: msg.mensagem,
        ultimaData: msg.criado_em,
        atendimento_humano: sessao?.atendimento_humano || false,
        atendente_nome: sessao?.atendente_nome || "",
      };
    });

    return Object.values(mapa).sort(
      (a, b) => new Date(b.ultimaData) - new Date(a.ultimaData)
    );
  }, [mensagens, sessoes]);

  const conversaSelecionada = conversas.find(
    (c) => c.telefone === telefoneSelecionado
  );

  const mensagensDaConversa = mensagens.filter(
    (msg) => msg.telefone === telefoneSelecionado
  );

  async function iniciarConversa() {
    if (!telefoneSelecionado) return;

    const resposta = await fetch("/api/whatsapp-atendimento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telefone: telefoneSelecionado,
        acao: "iniciar",
        atendente_nome: user?.nome || "Atendente",
      }),
    });

    if (!resposta.ok) {
      alert("Erro ao iniciar atendimento.");
      return;
    }

    carregarTudo();
  }

  async function finalizarConversa() {
    if (!telefoneSelecionado) return;

    const resposta = await fetch("/api/whatsapp-atendimento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telefone: telefoneSelecionado,
        acao: "finalizar",
        atendente_nome: user?.nome || "Atendente",
      }),
    });

    if (!resposta.ok) {
      alert("Erro ao finalizar atendimento.");
      return;
    }

    carregarTudo();
  }

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
        setEnviando(false);
        return;
      }

      setTexto("");
      carregarTudo();
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

              {conversa.atendimento_humano && (
                <em>Atendimento com {conversa.atendente_nome}</em>
              )}

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
                <div>
                  <strong>{telefoneSelecionado}</strong>
                  {conversaSelecionada?.atendimento_humano ? (
                    <p>Atendimento humano ativo</p>
                  ) : (
                    <p>Bot ativo</p>
                  )}
                </div>

                <div className="whatsapp-acoes">
                  <button onClick={iniciarConversa}>Iniciar conversa</button>
                  <button onClick={finalizarConversa} className="finalizar">
                    Finalizar conversa
                  </button>
                </div>
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
                        {msg.enviado_por}
                      </strong>
                    )}

                    <p>{msg.mensagem}</p>

                    <small>{formatarData(msg.criado_em)}</small>
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
