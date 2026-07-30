import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/api";
import "./WhatsApp.css";

export default function WhatsApp({ user }) {
  const [mensagens, setMensagens] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [telefoneSelecionado, setTelefoneSelecionado] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aba, setAba] = useState(() => {
    const solicitada = new URLSearchParams(window.location.search).get("aba");
    return ["conversas", "hinos", "cultos"].includes(solicitada)
      ? solicitada
      : "conversas";
  });
  const [cultos, setCultos] = useState([]);
  const [hinos, setHinos] = useState([]);
  const [buscaHinos, setBuscaHinos] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [salvandoCulto, setSalvandoCulto] = useState(false);
  const [cultoEditando, setCultoEditando] = useState(null);
  const fimDasMensagensRef = useRef(null);
  const deveRolarAutomaticamenteRef = useRef(true);
  const [formCulto, setFormCulto] = useState({
    titulo: "",
    data_culto: "",
    prazo_envio: "",
    status: "aguardando",
    observacoes: "",
  });

  function formatarData(data) {
    if (!data) return "—";
    return new Date(data).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function paraInputData(data) {
    if (!data) return "";
    const valor = new Date(data);
    const local = new Date(valor.getTime() - valor.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function rotuloStatus(status) {
    const rotulos = {
      recebido: "Recebido",
      em_preparacao: "Em preparação",
      pronto: "Pronto",
      precisa_correcao: "Precisa de correção",
      cancelado: "Cancelado",
      aguardando: "Aguardando liberação",
      aberto: "Aberto",
      fechado: "Recebimento encerrado",
    };
    return rotulos[status] || status || "—";
  }

  function normalizar(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function podeVerConversa(conversa) {
    const role = normalizar(user?.role);
    const destino = normalizar(conversa.destino);

    if (role === "administrador" || role === "dirigente") return true;

    if (!destino || destino === "atendimento") {
      return ["administrador", "midia", "secretaria", "suporte", "ti"].includes(role);
    }

    if (destino === "midia") {
      return role === "midia";
    }

    if (destino === "secretaria") {
      return role === "secretaria";
    }

    if (destino === "suporte") {
      return role === "suporte" || role === "ti";
    }

    if (destino === "suporte ti") {
      return role === "suporte" || role === "ti" || role === "midia";
    }

    if (destino === "som/projecao" || destino === "som e projecao") {
      return role === "midia" || role === "sonoplastia" || role === "projecao";
    }

    if (destino === "ebd") {
      return role === "ebd" || role === "superintendente";
    }

    if (destino === "financeiro") {
      return role === "financeiro";
    }

    return false;
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

    const { data: cultosData, error: erroCultos } = await supabase
      .from("whatsapp_cultos")
      .select("*")
      .order("data_culto", { ascending: true });
    if (!erroCultos) setCultos(cultosData || []);

    const { data: hinosData, error: erroHinos } = await supabase
      .from("whatsapp_hinos_projecao")
      .select("*, whatsapp_cultos(titulo,data_culto,pasta_drive_link)")
      .order("criado_em", { ascending: false });
    if (!erroHinos) setHinos(hinosData || []);
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

    const canalCultos = supabase
      .channel("whatsapp_cultos_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_cultos" },
        () => carregarTudo()
      )
      .subscribe();

    const canalHinos = supabase
      .channel("whatsapp_hinos_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_hinos_projecao" },
        () => carregarTudo()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalMensagens);
      supabase.removeChannel(canalSessoes);
      supabase.removeChannel(canalCultos);
      supabase.removeChannel(canalHinos);
    };
  }, []);

  const conversas = useMemo(() => {
    const mapa = {};

    mensagens.forEach((msg) => {
      const sessao = sessoes.find((s) => s.telefone === msg.telefone);

      const destino =
        sessao?.destino ||
        sessao?.dados?.destino ||
        "Atendimento";

      mapa[msg.telefone] = {
        telefone: msg.telefone,
        ultimaMensagem: msg.mensagem,
        ultimaData: msg.criado_em,
        atendimento_humano: sessao?.atendimento_humano || false,
        atendente_nome: sessao?.atendente_nome || "",
        destino,
      };
    });

    return Object.values(mapa)
      .filter((conversa) => podeVerConversa(conversa))
      .sort((a, b) => new Date(b.ultimaData) - new Date(a.ultimaData));
  }, [mensagens, sessoes, user]);

  const conversaSelecionada = conversas.find(
    (c) => c.telefone === telefoneSelecionado
  );

  const mensagensDaConversa = mensagens.filter(
    (msg) => msg.telefone === telefoneSelecionado
  );
  const ultimaMensagemId =
    mensagensDaConversa[mensagensDaConversa.length - 1]?.id || null;

  function rolarParaUltimaMensagem(comportamento = "smooth") {
    requestAnimationFrame(() => {
      fimDasMensagensRef.current?.scrollIntoView({
        behavior: comportamento,
        block: "end",
      });
    });
  }

  function acompanharPosicaoDaConversa(evento) {
    const elemento = evento.currentTarget;
    const distanciaDoFim =
      elemento.scrollHeight - elemento.scrollTop - elemento.clientHeight;
    deveRolarAutomaticamenteRef.current = distanciaDoFim < 120;
  }

  useEffect(() => {
    if (!telefoneSelecionado) return;
    deveRolarAutomaticamenteRef.current = true;
    rolarParaUltimaMensagem("auto");
  }, [telefoneSelecionado]);

  useEffect(() => {
    if (!telefoneSelecionado || !ultimaMensagemId) return;
    if (deveRolarAutomaticamenteRef.current) {
      rolarParaUltimaMensagem();
    }
  }, [ultimaMensagemId, telefoneSelecionado]);

  useEffect(() => {
    if (
      telefoneSelecionado &&
      !conversas.some((c) => c.telefone === telefoneSelecionado)
    ) {
      setTelefoneSelecionado(null);
    }
  }, [conversas, telefoneSelecionado]);

  async function iniciarConversa() {
    if (!telefoneSelecionado) return;

    const resposta = await apiFetch("/api/whatsapp-atendimento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telefone: telefoneSelecionado,
        acao: "iniciar",
        atendente_nome: user?.nome || "Atendente",
        destino: conversaSelecionada?.destino || "Atendimento",
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

    const resposta = await apiFetch("/api/whatsapp-atendimento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telefone: telefoneSelecionado,
        acao: "finalizar",
        atendente_nome: user?.nome || "Atendente",
        destino: conversaSelecionada?.destino || "Atendimento",
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

    deveRolarAutomaticamenteRef.current = true;
    setEnviando(true);

    try {
      const resposta = await apiFetch("/api/whatsapp-send", {
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

  function limparCulto() {
    setCultoEditando(null);
    setFormCulto({
      titulo: "",
      data_culto: "",
      prazo_envio: "",
      status: "aguardando",
      observacoes: "",
    });
  }

  function editarCulto(culto) {
    setCultoEditando(culto.id);
    setFormCulto({
      titulo: culto.titulo || "",
      data_culto: paraInputData(culto.data_culto),
      prazo_envio: paraInputData(culto.prazo_envio),
      status: culto.status || "aguardando",
      observacoes: culto.observacoes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarCulto(evento) {
    evento.preventDefault();
    if (!formCulto.titulo.trim() || !formCulto.data_culto) return;
    setSalvandoCulto(true);

    const payload = {
      titulo: formCulto.titulo.trim(),
      data_culto: new Date(formCulto.data_culto).toISOString(),
      prazo_envio: formCulto.prazo_envio
        ? new Date(formCulto.prazo_envio).toISOString()
        : null,
      status: formCulto.status,
      observacoes: formCulto.observacoes.trim() || null,
    };

    const consulta = cultoEditando
      ? supabase.from("whatsapp_cultos").update(payload).eq("id", cultoEditando)
      : supabase.from("whatsapp_cultos").insert(payload);
    const { error } = await consulta;
    setSalvandoCulto(false);

    if (error) {
      alert(
        error.code === "23505"
          ? "Já existe um culto com esse nome, nessa mesma data e horário."
          : `Erro ao salvar culto: ${error.message}`
      );
      return;
    }
    limparCulto();
    carregarTudo();
  }

  async function alterarStatusCulto(culto, status) {
    const { error } = await supabase
      .from("whatsapp_cultos")
      .update({ status })
      .eq("id", culto.id);
    if (error) {
      alert(`Erro ao atualizar culto: ${error.message}`);
      return;
    }
    carregarTudo();
  }

  async function alterarStatusHino(hino, status) {
    const { error } = await supabase
      .from("whatsapp_hinos_projecao")
      .update({ status })
      .eq("id", hino.id);
    if (error) {
      alert(`Erro ao atualizar hino: ${error.message}`);
      return;
    }
    carregarTudo();
  }

  const hinosFiltrados = useMemo(() => {
    const termo = normalizar(buscaHinos);
    return hinos.filter((hino) => {
      const correspondeStatus = !filtroStatus || hino.status === filtroStatus;
      const conteudo = normalizar(
        [
          hino.protocolo,
          hino.telefone,
          hino.departamento,
          hino.nome_apresentacao,
          hino.nome_drive,
          hino.whatsapp_cultos?.titulo,
        ].join(" ")
      );
      return correspondeStatus && (!termo || conteudo.includes(termo));
    });
  }, [hinos, buscaHinos, filtroStatus]);

  const resumoHinos = useMemo(
    () => ({
      total: hinos.length,
      recebidos: hinos.filter((h) => h.status === "recebido").length,
      preparacao: hinos.filter((h) => h.status === "em_preparacao").length,
      prontos: hinos.filter((h) => h.status === "pronto").length,
      correcao: hinos.filter((h) => h.status === "precisa_correcao").length,
    }),
    [hinos]
  );

  return (
    <div
      className={`whatsapp-page ${
        aba === "conversas" && telefoneSelecionado ? "chat-mobile-aberto" : ""
      }`}
    >
      <div className="whatsapp-header">
        <h1>WhatsApp</h1>
        <p>
          Atendimento oficial, cultos e recebimento de hinos para projeção
          {user?.role ? ` • Acesso: ${user.role}` : ""}
        </p>
      </div>

      <nav className="whatsapp-tabs" aria-label="Áreas do WhatsApp">
        <button className={aba === "conversas" ? "ativo" : ""} onClick={() => setAba("conversas")}>
          Conversas
        </button>
        <button className={aba === "hinos" ? "ativo" : ""} onClick={() => setAba("hinos")}>
          Hinos recebidos <span>{resumoHinos.recebidos}</span>
        </button>
        <button className={aba === "cultos" ? "ativo" : ""} onClick={() => setAba("cultos")}>
          Cultos
        </button>
      </nav>

      {aba === "conversas" && (
        <div
          className={`whatsapp-container ${
            telefoneSelecionado ? "tem-conversa-selecionada" : ""
          }`}
        >
        <aside className="whatsapp-sidebar">
          <div className="whatsapp-sidebar-title">Conversas</div>

          {conversas.length === 0 && (
            <div className="whatsapp-empty">
              Nenhuma conversa disponível para sua função.
            </div>
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

              <small className="whatsapp-destino">
                {conversa.destino || "Atendimento"}
              </small>

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
                <button
                  type="button"
                  className="whatsapp-voltar-conversas"
                  onClick={() => setTelefoneSelecionado("")}
                  aria-label="Voltar para a lista de conversas"
                >
                  <span aria-hidden="true">←</span>
                </button>

                <div>
                  <strong>{telefoneSelecionado}</strong>

                  <p>
                    {conversaSelecionada?.destino || "Atendimento"} •{" "}
                    {conversaSelecionada?.atendimento_humano
                      ? "Atendimento humano ativo"
                      : "Bot ativo"}
                  </p>
                </div>

                <div className="whatsapp-acoes">
                  <button onClick={iniciarConversa}>Iniciar conversa</button>
                  <button onClick={finalizarConversa} className="finalizar">
                    Finalizar conversa
                  </button>
                </div>
              </div>

              <div
                className="whatsapp-mensagens"
                onScroll={acompanharPosicaoDaConversa}
              >
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
                <div
                  ref={fimDasMensagensRef}
                  className="whatsapp-fim-mensagens"
                  aria-hidden="true"
                />
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
      )}

      {aba === "hinos" && (
        <section className="whatsapp-admin">
          <div className="whatsapp-resumo">
            <article><span>Total</span><strong>{resumoHinos.total}</strong></article>
            <article><span>Recebidos</span><strong>{resumoHinos.recebidos}</strong></article>
            <article><span>Em preparação</span><strong>{resumoHinos.preparacao}</strong></article>
            <article><span>Prontos</span><strong>{resumoHinos.prontos}</strong></article>
            <article><span>Correção</span><strong>{resumoHinos.correcao}</strong></article>
          </div>

          <div className="whatsapp-painel-topo">
            <div>
              <h2>Hinos recebidos</h2>
              <p>Confira cada arquivo, acesse o Drive e atualize o andamento da projeção.</p>
            </div>
            <div className="whatsapp-filtros">
              <input
                value={buscaHinos}
                onChange={(e) => setBuscaHinos(e.target.value)}
                placeholder="Buscar protocolo, nome, culto ou telefone"
              />
              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                <option value="">Todos os status</option>
                <option value="recebido">Recebido</option>
                <option value="em_preparacao">Em preparação</option>
                <option value="pronto">Pronto</option>
                <option value="precisa_correcao">Precisa de correção</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {hinosFiltrados.length === 0 ? (
            <div className="whatsapp-vazio-grande">
              <strong>Nenhum hino encontrado</strong>
              <p>Os arquivos enviados pelo WhatsApp aparecerão aqui automaticamente.</p>
            </div>
          ) : (
            <div className="whatsapp-hinos-grid">
              {hinosFiltrados.map((hino) => (
                <article className="whatsapp-hino-card" key={hino.id}>
                  <header>
                    <div>
                      <small>{hino.protocolo}</small>
                      <h3>{hino.nome_apresentacao}</h3>
                    </div>
                    <span className={`status ${hino.status}`}>{rotuloStatus(hino.status)}</span>
                  </header>
                  <dl>
                    <div><dt>Culto</dt><dd>{hino.whatsapp_cultos?.titulo || "—"}</dd></div>
                    <div><dt>Data</dt><dd>{formatarData(hino.whatsapp_cultos?.data_culto)}</dd></div>
                    <div><dt>Departamento</dt><dd>{hino.departamento}</dd></div>
                    <div><dt>Arquivo</dt><dd>{hino.nome_drive}</dd></div>
                    <div><dt>WhatsApp</dt><dd>{hino.telefone}</dd></div>
                    <div><dt>Recebido</dt><dd>{formatarData(hino.criado_em)}</dd></div>
                  </dl>
                  <div className="whatsapp-hino-acoes">
                    <select value={hino.status} onChange={(e) => alterarStatusHino(hino, e.target.value)}>
                      <option value="recebido">Recebido</option>
                      <option value="em_preparacao">Em preparação</option>
                      <option value="pronto">Pronto</option>
                      <option value="precisa_correcao">Precisa de correção</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                    {hino.arquivo_drive_link && (
                      <a href={hino.arquivo_drive_link} target="_blank" rel="noreferrer">
                        Abrir arquivo no Drive
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {aba === "cultos" && (
        <section className="whatsapp-admin whatsapp-cultos-layout">
          <form className="whatsapp-culto-form" onSubmit={salvarCulto}>
            <div>
              <small>CONFIGURAÇÃO DO BOT</small>
              <h2>{cultoEditando ? "Editar culto" : "Novo culto"}</h2>
              <p>Cultos aguardando liberação não aparecem no WhatsApp. Libere o recebimento no início da semana.</p>
            </div>
            <label>
              Nome do culto
              <input
                value={formCulto.titulo}
                onChange={(e) => setFormCulto({ ...formCulto, titulo: e.target.value })}
                placeholder="Ex.: Culto de Santa Ceia"
                required
              />
            </label>
            <div className="whatsapp-culto-datas">
              <label>
                Data e horário do culto
                <input
                  type="datetime-local"
                  value={formCulto.data_culto}
                  onChange={(e) => setFormCulto({ ...formCulto, data_culto: e.target.value })}
                  required
                />
              </label>
              <label>
                Prazo para envio
                <input
                  type="datetime-local"
                  value={formCulto.prazo_envio}
                  onChange={(e) => setFormCulto({ ...formCulto, prazo_envio: e.target.value })}
                />
              </label>
            </div>
            <label>
              Situação
              <select
                value={formCulto.status}
                onChange={(e) => setFormCulto({ ...formCulto, status: e.target.value })}
              >
                <option value="aguardando">Aguardando liberação</option>
                <option value="aberto">Aberto para receber hinos</option>
                <option value="fechado">Recebimento encerrado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </label>
            <label>
              Observações internas
              <textarea
                value={formCulto.observacoes}
                onChange={(e) => setFormCulto({ ...formCulto, observacoes: e.target.value })}
                rows={3}
              />
            </label>
            <div className="whatsapp-culto-form-acoes">
              <button disabled={salvandoCulto}>
                {salvandoCulto ? "Salvando..." : cultoEditando ? "Salvar alterações" : "Cadastrar culto"}
              </button>
              {cultoEditando && <button type="button" className="secundario" onClick={limparCulto}>Cancelar edição</button>}
            </div>
          </form>

          <div className="whatsapp-cultos-lista">
            <div>
              <small>PRÓXIMOS CULTOS</small>
              <h2>Cultos cadastrados</h2>
              <p>A pasta no Drive será criada automaticamente no primeiro envio.</p>
            </div>
            {cultos.length === 0 && <div className="whatsapp-vazio-grande"><strong>Nenhum culto cadastrado</strong></div>}
            {cultos.map((culto) => (
              <article key={culto.id}>
                <div className="whatsapp-culto-info">
                  <span className={`status ${culto.status}`}>{rotuloStatus(culto.status)}</span>
                  <h3>{culto.titulo}</h3>
                  <p><strong>Culto:</strong> {formatarData(culto.data_culto)}</p>
                  <p><strong>Prazo:</strong> {formatarData(culto.prazo_envio)}</p>
                  {culto.observacoes && <p>{culto.observacoes}</p>}
                </div>
                <div className="whatsapp-culto-acoes">
                  <button onClick={() => editarCulto(culto)}>Editar</button>
                  {culto.status === "aguardando" && (
                    <button onClick={() => alterarStatusCulto(culto, "aberto")}>Liberar recebimento</button>
                  )}
                  {culto.status === "aberto" && (
                    <button className="fechar" onClick={() => alterarStatusCulto(culto, "fechado")}>Encerrar recebimento</button>
                  )}
                  {culto.status === "fechado" && (
                    <button onClick={() => alterarStatusCulto(culto, "aberto")}>Reabrir recebimento</button>
                  )}
                  {culto.status === "cancelado" && (
                    <button onClick={() => alterarStatusCulto(culto, "aguardando")}>Restaurar como aguardando</button>
                  )}
                  {culto.pasta_drive_link && (
                    <a href={culto.pasta_drive_link} target="_blank" rel="noreferrer">Abrir pasta no Drive</a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
