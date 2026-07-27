import { useEffect, useMemo, useState } from "react"
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd"
import { supabase } from "../lib/supabase"
import "./Pedidos.css"

const COLUNAS = [
  { id: "PENDENTE", status: "Pendente", titulo: "Aguardando", cor: "amarelo" },
  { id: "PRODUCAO", status: "Em produção", titulo: "Em produção", cor: "azul" },
  { id: "CONCLUIDO", status: "Concluído", titulo: "Concluídos", cor: "verde" },
]

const DESTINOS = ["Mídia", "Sonoplastia", "Secretaria"]
const EQUIPES_OPERACIONAIS = ["Mídia", "Sonoplastia", "Secretaria"]

function formatarData(data) {
  if (!data) return "Data não informada"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data)).replace(".", "")
}

function iniciais(nome = "") {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase() || "AD"
}

function classePrioridade(prioridade) {
  return `pedidos-prioridade pedidos-prioridade--${(prioridade || "normal").toLowerCase()}`
}

function classeStatus(status) {
  if (status === "Em produção") return "producao"
  if (status === "Concluído") return "concluido"
  return "pendente"
}

export default function Pedidos({ user }) {
  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [prioridade, setPrioridade] = useState("Normal")
  const [destino, setDestino] = useState("Mídia")
  const [pedidoAberto, setPedidoAberto] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [comentarios, setComentarios] = useState([])
  const [comentario, setComentario] = useState("")
  const [aba, setAba] = useState("lista")
  const [enviando, setEnviando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [mostrarArquivados, setMostrarArquivados] = useState(false)
  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("Todos")
  const [filtroDestino, setFiltroDestino] = useState("Todos")
  const [formularioAberto, setFormularioAberto] = useState(true)

  const role = user?.role || ""
  const podeVerTodos = ["Administrador", "Mídia", "Dirigente"].includes(role)
  const podeUsarKanban =
    role === "Administrador" || EQUIPES_OPERACIONAIS.includes(role)

  useEffect(() => {
    carregarPedidos()
    carregarComentarios()

    const canalPedidos = supabase
      .channel("pedidos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        carregarPedidos
      )
      .subscribe()

    const canalComentarios = supabase
      .channel("comentarios-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comentarios_pedidos" },
        carregarComentarios
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canalPedidos)
      supabase.removeChannel(canalComentarios)
    }
  }, [mostrarArquivados, role])

  async function carregarPedidos() {
    setCarregando(true)

    let query = supabase
      .from("pedidos")
      .select("*")
      .order("data", { ascending: false })

    query = mostrarArquivados
      ? query.eq("arquivado", true)
      : query.or("arquivado.is.null,arquivado.eq.false")

    if (!podeVerTodos) {
      if (EQUIPES_OPERACIONAIS.includes(role)) {
        query = query.or(`ministerio.eq.${role},destino.eq.${role}`)
      } else {
        query = query.eq("ministerio", role)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error("Erro ao carregar pedidos:", error)
      setPedidos([])
    } else {
      setPedidos(data || [])
    }

    setCarregando(false)
  }

  async function carregarComentarios() {
    const { data, error } = await supabase
      .from("comentarios_pedidos")
      .select("*")
      .order("data", { ascending: true })

    if (!error) setComentarios(data || [])
  }

  function podeEditarPedido(pedido) {
    if (role === "Administrador" || role === "Mídia") return true
    return EQUIPES_OPERACIONAIS.includes(role) && pedido?.destino === role
  }

  async function criarPedido(evento) {
    evento.preventDefault()
    if (enviando || !titulo.trim()) return
    setEnviando(true)

    try {
      const resposta = await fetch("/api/criarPedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          prioridade,
          destino,
          ministerio: role,
          criado_por: user?.nome,
          email: user?.email,
          telefone: user?.telefone || "",
        }),
      })

      const retorno = await resposta.json().catch(() => ({}))
      if (!resposta.ok) throw new Error(retorno?.error || "Erro ao criar pedido")

      fetch("/api/enviar-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assunto: `Novo pedido para ${destino} - ADJACARÉ`,
          mensagem: `
            <h2>Novo pedido enviado</h2>
            <p><b>Título:</b> ${titulo.trim()}</p>
            <p><b>Descrição:</b> ${descricao.trim() || "-"}</p>
            <p><b>Prioridade:</b> ${prioridade}</p>
            <p><b>Destino:</b> ${destino}</p>
            <hr>
            <p><b>Departamento:</b> ${role}</p>
            <p><b>Enviado por:</b> ${user?.nome}</p>
          `,
        }),
      }).catch((error) => console.error("E-mail não enviado:", error))

      setTitulo("")
      setDescricao("")
      setPrioridade("Normal")
      setDestino("Mídia")
      setFormularioAberto(false)
      await carregarPedidos()
      alert("Pedido enviado com sucesso!")
    } catch (error) {
      console.error("Erro ao criar pedido:", error)
      alert(error.message || "Erro ao enviar pedido")
    } finally {
      setEnviando(false)
    }
  }

  async function enviarComentario() {
    if (!pedidoAberto || !comentario.trim()) return

    const { error } = await supabase.from("comentarios_pedidos").insert([{
      pedido_id: String(pedidoAberto.id),
      usuario: user?.nome,
      mensagem: comentario.trim(),
      data: new Date().toISOString(),
    }])

    if (error) {
      alert("Não foi possível enviar o comentário.")
      return
    }

    setComentario("")
    await carregarComentarios()
  }

  function comentariosDoPedido(pedidoId) {
    return comentarios.filter(
      (item) => String(item.pedido_id) === String(pedidoId)
    )
  }

  async function atualizarStatusKanban(id, coluna) {
    const pedido = pedidos.find((item) => String(item.id) === String(id))
    if (!pedido || !podeEditarPedido(pedido)) return

    const novaColuna = COLUNAS.find((item) => item.id === coluna)
    if (!novaColuna || pedido.status === novaColuna.status) return

    const { error } = await supabase
      .from("pedidos")
      .update({ status: novaColuna.status })
      .eq("id", String(id))

    if (error) {
      alert("Não foi possível atualizar o pedido.")
      return
    }

    if (novaColuna.status === "Concluído") {
      fetch("/api/notificarConclusao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch((errorNotificacao) =>
        console.error("Notificação não enviada:", errorNotificacao)
      )
    }

    setPedidoAberto((atual) =>
      atual?.id === pedido.id ? { ...atual, status: novaColuna.status } : atual
    )
    await carregarPedidos()
  }

  async function onDragEnd(resultado) {
    if (!resultado.destination) return
    await atualizarStatusKanban(
      String(resultado.draggableId),
      resultado.destination.droppableId
    )
  }

  async function alternarArquivo(pedido) {
    if (!podeEditarPedido(pedido)) return

    const arquivar = !pedido.arquivado
    if (arquivar && !confirm(`Arquivar o pedido "${pedido.titulo}"?`)) return

    const { error } = await supabase
      .from("pedidos")
      .update({ arquivado: arquivar })
      .eq("id", String(pedido.id))

    if (error) {
      alert("Não foi possível atualizar o arquivamento.")
      return
    }

    setPedidoAberto(null)
    await carregarPedidos()
  }

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR")

    return pedidos.filter((pedido) => {
      const correspondeBusca =
        !termo ||
        [pedido.titulo, pedido.descricao, pedido.ministerio, pedido.destino, pedido.criado_por]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(termo)
      const correspondeStatus =
        filtroStatus === "Todos" || pedido.status === filtroStatus
      const correspondeDestino =
        filtroDestino === "Todos" || pedido.destino === filtroDestino

      return correspondeBusca && correspondeStatus && correspondeDestino
    })
  }, [pedidos, busca, filtroStatus, filtroDestino])

  const resumo = useMemo(() => ({
    total: pedidos.filter((pedido) => pedido.status !== "Concluído").length,
    pendentes: pedidos.filter((pedido) => pedido.status === "Pendente").length,
    producao: pedidos.filter((pedido) => pedido.status === "Em produção").length,
    urgentes: pedidos.filter(
      (pedido) => pedido.prioridade === "Urgente" && pedido.status !== "Concluído"
    ).length,
  }), [pedidos])

  return (
    <main className="pedidos-page">
      <section className="pedidos-hero">
        <div>
          <span>CENTRAL DE SOLICITAÇÕES</span>
          <h1>Pedidos</h1>
          <p>
            Solicite materiais, acompanhe cada etapa e converse com a equipe
            responsável em um só lugar.
          </p>
        </div>
        <button type="button" onClick={() => {
          setAba("lista")
          setMostrarArquivados(false)
          setFormularioAberto(true)
          window.scrollTo({ top: 0, behavior: "smooth" })
        }}>
          <b>＋</b> Novo pedido
        </button>
      </section>

      <section className="pedidos-resumo">
        <article>
          <span className="pedidos-resumo__icone azul">▤</span>
          <div><small>Pedidos abertos</small><strong>{resumo.total}</strong></div>
        </article>
        <article>
          <span className="pedidos-resumo__icone amarelo">◷</span>
          <div><small>Aguardando</small><strong>{resumo.pendentes}</strong></div>
        </article>
        <article>
          <span className="pedidos-resumo__icone ciano">◉</span>
          <div><small>Em produção</small><strong>{resumo.producao}</strong></div>
        </article>
        <article>
          <span className="pedidos-resumo__icone vermelho">!</span>
          <div><small>Urgentes</small><strong>{resumo.urgentes}</strong></div>
        </article>
      </section>

      <nav className="pedidos-tabs" aria-label="Visualização dos pedidos">
        <button
          type="button"
          className={aba === "lista" ? "ativo" : ""}
          onClick={() => setAba("lista")}
        >
          Lista de pedidos
        </button>
        {podeUsarKanban && (
          <button
            type="button"
            className={aba === "kanban" ? "ativo" : ""}
            onClick={() => setAba("kanban")}
          >
            Quadro de produção
          </button>
        )}
      </nav>

      {aba === "lista" && (
        <>
          <section className={`pedidos-formulario ${formularioAberto ? "aberto" : ""}`}>
            <button
              type="button"
              className="pedidos-formulario__titulo"
              onClick={() => setFormularioAberto((valor) => !valor)}
            >
              <span className="pedidos-formulario__icone">＋</span>
              <span>
                <strong>Criar novo pedido</strong>
                <small>Envie uma solicitação para Mídia, Sonoplastia ou Secretaria</small>
              </span>
              <b>{formularioAberto ? "−" : "+"}</b>
            </button>

            {formularioAberto && (
              <form onSubmit={criarPedido}>
                <div className="pedidos-campo pedidos-campo--largo">
                  <label htmlFor="pedido-titulo">O que você precisa?</label>
                  <input
                    id="pedido-titulo"
                    placeholder="Ex.: Arte para o culto de jovens"
                    value={titulo}
                    onChange={(evento) => setTitulo(evento.target.value)}
                    required
                  />
                </div>

                <div className="pedidos-campo pedidos-campo--largo">
                  <label htmlFor="pedido-descricao">Explique os detalhes</label>
                  <textarea
                    id="pedido-descricao"
                    placeholder="Informe data, tamanho, texto, referências e tudo o que pode ajudar a equipe."
                    value={descricao}
                    onChange={(evento) => setDescricao(evento.target.value)}
                  />
                </div>

                <div className="pedidos-campo">
                  <label htmlFor="pedido-destino">Enviar para</label>
                  <select
                    id="pedido-destino"
                    value={destino}
                    onChange={(evento) => setDestino(evento.target.value)}
                  >
                    {DESTINOS.map((item) => (
                      <option value={item} key={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className="pedidos-campo">
                  <label htmlFor="pedido-prioridade">Prioridade</label>
                  <select
                    id="pedido-prioridade"
                    value={prioridade}
                    onChange={(evento) => setPrioridade(evento.target.value)}
                  >
                    <option value="Urgente">Urgente</option>
                    <option value="Normal">Normal</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>

                <div className="pedidos-formulario__rodape pedidos-campo--largo">
                  <p>Enviado como <strong>{user?.nome}</strong> • {role}</p>
                  <button type="submit" disabled={enviando}>
                    {enviando ? "Enviando..." : "Enviar pedido"} <span>→</span>
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="pedidos-conteudo">
            <div className="pedidos-conteudo__topo">
              <div>
                <span>ACOMPANHAMENTO</span>
                <h2>{mostrarArquivados ? "Pedidos arquivados" : "Pedidos ativos"}</h2>
                <p>{pedidosFiltrados.length} {pedidosFiltrados.length === 1 ? "pedido encontrado" : "pedidos encontrados"}</p>
              </div>
              <div className="pedidos-arquivo-toggle">
                <button
                  type="button"
                  className={!mostrarArquivados ? "ativo" : ""}
                  onClick={() => setMostrarArquivados(false)}
                >
                  Ativos
                </button>
                <button
                  type="button"
                  className={mostrarArquivados ? "ativo" : ""}
                  onClick={() => setMostrarArquivados(true)}
                >
                  Arquivados
                </button>
              </div>
            </div>

            <div className="pedidos-filtros">
              <div className="pedidos-busca">
                <span>⌕</span>
                <input
                  placeholder="Buscar por título, departamento ou responsável..."
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                />
              </div>
              <select value={filtroStatus} onChange={(evento) => setFiltroStatus(evento.target.value)}>
                <option>Todos</option>
                <option>Pendente</option>
                <option>Em produção</option>
                <option>Concluído</option>
              </select>
              <select value={filtroDestino} onChange={(evento) => setFiltroDestino(evento.target.value)}>
                <option>Todos</option>
                {DESTINOS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>

            <div className="pedidos-lista">
              {carregando && (
                <div className="pedidos-vazio"><span>•••</span><h3>Carregando pedidos</h3></div>
              )}

              {!carregando && pedidosFiltrados.length === 0 && (
                <div className="pedidos-vazio">
                  <span>✓</span>
                  <h3>Nenhum pedido por aqui</h3>
                  <p>Altere os filtros ou crie uma nova solicitação.</p>
                </div>
              )}

              {pedidosFiltrados.map((pedido) => (
                <article className="pedido-item" key={pedido.id}>
                  <div className={`pedido-item__faixa ${classeStatus(pedido.status)}`} />
                  <div className="pedido-item__principal">
                    <div className="pedido-item__topo">
                      <div className="pedido-item__titulo">
                        <span className="pedido-item__avatar">{iniciais(pedido.ministerio)}</span>
                        <div>
                          <h3>{pedido.titulo}</h3>
                          <p>{pedido.ministerio} → {pedido.destino || "Não definido"}</p>
                        </div>
                      </div>
                      <div className="pedido-item__badges">
                        <span className={`pedidos-status pedidos-status--${classeStatus(pedido.status)}`}>
                          {pedido.status}
                        </span>
                        <span className={classePrioridade(pedido.prioridade)}>
                          {pedido.prioridade}
                        </span>
                      </div>
                    </div>

                    <p className="pedido-item__descricao">
                      {pedido.descricao || "Nenhuma descrição informada."}
                    </p>

                    <div className="pedido-item__rodape">
                      <div>
                        <span>◷ {formatarData(pedido.data)}</span>
                        <span>◌ {comentariosDoPedido(pedido.id).length} comentários</span>
                        {pedido.origem && <span>Origem: {pedido.origem}</span>}
                      </div>
                      <button type="button" onClick={() => setPedidoAberto(pedido)}>
                        Ver detalhes <span>→</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {aba === "kanban" && (
        <section className="pedidos-kanban-area">
          <div className="pedidos-conteudo__topo">
            <div>
              <span>FLUXO DE TRABALHO</span>
              <h2>Quadro de produção</h2>
              <p>Arraste os cartões para atualizar o andamento.</p>
            </div>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="pedidos-kanban">
              {COLUNAS.map((coluna) => {
                const itens = pedidosFiltrados.filter(
                  (pedido) => pedido.status === coluna.status
                )

                return (
                  <Droppable key={coluna.id} droppableId={coluna.id}>
                    {(provided, snapshot) => (
                      <div
                        className={`pedidos-kanban__coluna ${snapshot.isDraggingOver ? "recebendo" : ""}`}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        <header>
                          <span className={`pedidos-kanban__ponto ${coluna.cor}`} />
                          <strong>{coluna.titulo}</strong>
                          <b>{itens.length}</b>
                        </header>
                        <div className="pedidos-kanban__cards">
                          {itens.map((pedido, index) => (
                            <Draggable
                              key={pedido.id}
                              draggableId={String(pedido.id)}
                              index={index}
                              isDragDisabled={!podeEditarPedido(pedido)}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <article
                                  className={`pedido-kanban-card ${dragSnapshot.isDragging ? "arrastando" : ""}`}
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  style={{
                                    ...dragProvided.draggableProps.style,
                                    "--prioridade": pedido.prioridade === "Urgente"
                                      ? "#e53e3e"
                                      : pedido.prioridade === "Baixa"
                                        ? "#18a675"
                                        : "#e6a118",
                                  }}
                                  onClick={() => setPedidoAberto(pedido)}
                                >
                                  <div className="pedido-kanban-card__topo">
                                    <span className={classePrioridade(pedido.prioridade)}>
                                      {pedido.prioridade}
                                    </span>
                                    <small>{pedido.destino}</small>
                                  </div>
                                  <h3>{pedido.titulo}</h3>
                                  <p>{pedido.descricao || "Sem descrição"}</p>
                                  <footer>
                                    <span className="pedido-item__avatar">{iniciais(pedido.ministerio)}</span>
                                    <span>{pedido.ministerio}</span>
                                    <b>◌ {comentariosDoPedido(pedido.id).length}</b>
                                  </footer>
                                </article>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {!itens.length && <div className="pedidos-kanban__vazio">Nenhum pedido</div>}
                        </div>
                      </div>
                    )}
                  </Droppable>
                )
              })}
            </div>
          </DragDropContext>
        </section>
      )}

      {pedidoAberto && (
        <div className="pedido-modal-overlay" onMouseDown={() => setPedidoAberto(null)}>
          <section className="pedido-modal" onMouseDown={(evento) => evento.stopPropagation()}>
            <header>
              <div>
                <span>DETALHES DO PEDIDO</span>
                <h2>{pedidoAberto.titulo}</h2>
              </div>
              <button type="button" onClick={() => setPedidoAberto(null)} aria-label="Fechar">×</button>
            </header>

            <div className="pedido-modal__badges">
              <span className={`pedidos-status pedidos-status--${classeStatus(pedidoAberto.status)}`}>
                {pedidoAberto.status}
              </span>
              <span className={classePrioridade(pedidoAberto.prioridade)}>
                {pedidoAberto.prioridade}
              </span>
            </div>

            <div className="pedido-modal__descricao">
              <span>DESCRIÇÃO</span>
              <p>{pedidoAberto.descricao || "Nenhuma descrição informada."}</p>
            </div>

            <dl className="pedido-modal__dados">
              <div><dt>Departamento</dt><dd>{pedidoAberto.ministerio}</dd></div>
              <div><dt>Destino</dt><dd>{pedidoAberto.destino || "-"}</dd></div>
              <div><dt>Solicitado por</dt><dd>{pedidoAberto.criado_por || user?.nome}</dd></div>
              <div><dt>Enviado em</dt><dd>{formatarData(pedidoAberto.data)}</dd></div>
            </dl>

            {pedidoAberto.link_drive && (
              <a className="pedido-modal__drive" href={pedidoAberto.link_drive} target="_blank" rel="noreferrer">
                <span>▰</span> Abrir pasta no Google Drive <b>↗</b>
              </a>
            )}

            {podeEditarPedido(pedidoAberto) && !mostrarArquivados && (
              <div className="pedido-modal__status">
                <span>ATUALIZAR ETAPA</span>
                <div>
                  {COLUNAS.map((coluna) => (
                    <button
                      type="button"
                      key={coluna.id}
                      className={pedidoAberto.status === coluna.status ? "ativo" : ""}
                      onClick={() => atualizarStatusKanban(pedidoAberto.id, coluna.id)}
                    >
                      {coluna.titulo}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pedido-modal__comentarios">
              <div className="pedido-modal__secao-titulo">
                <span>CONVERSA</span>
                <b>{comentariosDoPedido(pedidoAberto.id).length}</b>
              </div>

              <div className="pedido-comentarios__lista">
                {!comentariosDoPedido(pedidoAberto.id).length && (
                  <p className="pedido-comentarios__vazio">Nenhum comentário ainda. Inicie a conversa.</p>
                )}
                {comentariosDoPedido(pedidoAberto.id).map((item) => (
                  <article key={item.id}>
                    <span className="pedido-item__avatar">{iniciais(item.usuario)}</span>
                    <div>
                      <strong>{item.usuario}</strong>
                      <small>{formatarData(item.data)}</small>
                      <p>{item.mensagem}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="pedido-comentarios__novo">
                <input
                  placeholder="Escreva um comentário..."
                  value={comentario}
                  onChange={(evento) => setComentario(evento.target.value)}
                  onKeyDown={(evento) => {
                    if (evento.key === "Enter") {
                      evento.preventDefault()
                      enviarComentario()
                    }
                  }}
                />
                <button type="button" onClick={enviarComentario}>Enviar</button>
              </div>
            </div>

            {podeEditarPedido(pedidoAberto) && (
              <footer className="pedido-modal__rodape">
                <button type="button" onClick={() => alternarArquivo(pedidoAberto)}>
                  {mostrarArquivados ? "Restaurar pedido" : "Arquivar pedido"}
                </button>
              </footer>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
