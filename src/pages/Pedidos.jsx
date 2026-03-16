import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

export default function Pedidos({ user }) {
  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [prioridade, setPrioridade] = useState("Normal")
  const [destino, setDestino] = useState("Mídia")
  const [pedidoAberto, setPedidoAberto] = useState(null)

  const [pedidos, setPedidos] = useState([])
  const [comentarios, setComentarios] = useState([])
  const [comentariosInput, setComentariosInput] = useState({})
  const [aba, setAba] = useState("lista")
  const [enviando, setEnviando] = useState(false)

  const podeEditar =
    user?.role === "Mídia" ||
    user?.role === "Administrador"

  useEffect(() => {
    carregarPedidos()
    carregarComentarios()

    const channelPedidos = supabase
      .channel("pedidos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => carregarPedidos()
      )
      .subscribe()

    const channelComentarios = supabase
      .channel("comentarios-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comentarios_pedidos" },
        () => carregarComentarios()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelPedidos)
      supabase.removeChannel(channelComentarios)
    }
  }, [])

  async function carregarPedidos() {
    let query = supabase
      .from("pedidos")
      .select("*")
      .order("data", { ascending: false })

    if (
      user?.role !== "Administrador" &&
      user?.role !== "Mídia" &&
      user?.role !== "Dirigente"
    ) {
      query = query.eq("ministerio", user?.role)
    }

    const { data, error } = await query

    if (error) {
      console.log("Erro ao carregar pedidos:", error)
      return
    }

    setPedidos(data || [])
  }

  async function carregarComentarios() {
    const { data, error } = await supabase
      .from("comentarios_pedidos")
      .select("*")
      .order("data", { ascending: true })

    if (error) {
      console.log("Erro ao carregar comentários:", error)
      return
    }

    setComentarios(data || [])
  }

  async function criarPedido(e) {
    e.preventDefault()

    console.log(user)
    
    if (enviando) return

    if (!titulo.trim()) {
      alert("Digite um título")
      return
    }

    setEnviando(true)

    try {
      const resposta = await fetch("/api/criarPedido", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          titulo,
          descricao,
          prioridade,
          destino,
          ministerio: user.role,
          criado_por: user.nome,
          email: user.email,
          telefone: user.telefone || ""
        })
      })

      const data = await resposta.json()

      if (!resposta.ok) {
        console.log("Erro ao criar pedido:", data)
        alert("Erro ao criar pedido")
        return
      }

      const respostaEmail = await fetch("/api/enviar-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          assunto: "Novo pedido de mídia - ADJACARÉ",
          mensagem: `
            <h2>Novo pedido enviado</h2>
            <p><b>Título:</b> ${titulo}</p>
            <p><b>Descrição:</b> ${descricao || "-"}</p>
            <p><b>Prioridade:</b> ${prioridade}</p>
            <p><b>Destino:</b> ${destino}</p>
            <hr>
            <p><b>Ministério:</b> ${user.role}</p>
            <p><b>Enviado por:</b> ${user.nome}</p>
            <p><b>Email:</b> ${user.email || "-"}</p>
          `
        })
      })

      if (!respostaEmail.ok) {
        const erroEmail = await respostaEmail.json().catch(() => ({}))
        console.log("Erro ao enviar e-mail:", erroEmail)
      }

      setTitulo("")
      setDescricao("")
      setPrioridade("Normal")
      setDestino("Mídia")

      await carregarPedidos()

      alert("Pedido enviado com sucesso!")
    } catch (error) {
      console.log("Erro ao criar pedido:", error)
      alert("Erro ao enviar pedido")
    } finally {
      setEnviando(false)
    }
  }

  async function enviarComentario(pedidoId) {
    const mensagem = comentariosInput[pedidoId] || ""

    if (!mensagem.trim()) return

    const payload = {
      pedido_id: String(pedidoId),
      usuario: user.nome,
      mensagem: mensagem.trim(),
      data: new Date().toISOString()
    }

    const { error } = await supabase
      .from("comentarios_pedidos")
      .insert([payload])

    if (error) {
      console.log("Erro ao enviar comentário:", error)
      return
    }

    setComentariosInput(prev => ({
      ...prev,
      [pedidoId]: ""
    }))

    await carregarComentarios()
  }

  function comentariosDoPedido(pedidoId) {
    return comentarios.filter(c => String(c.pedido_id) === String(pedidoId))
  }

  function separar(status) {
    return pedidos.filter(p => p.status === status)
  }

 async function atualizarStatusKanban(id, coluna) {
  if (!podeEditar) return


  let status = ""


  if (coluna === "PENDENTE") status = "Pendente"
  if (coluna === "PRODUCAO") status = "Em produção"
  if (coluna === "CONCLUIDO") status = "Concluído"


  await supabase
    .from("pedidos")
    .update({ status })
    .eq("id", String(id))


  // ENVIA EMAIL SE CONCLUÍDO
  if (status === "Concluído") {
    await fetch("/api/notificarConclusao", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id
      })
    })
  }


  await carregarPedidos()
  }

  async function onDragEnd(result) {
    if (!podeEditar) return
    if (!result.destination) return

    const pedidoId = String(result.draggableId)
    const coluna = result.destination.droppableId

    await atualizarStatusKanban(pedidoId, coluna)
  }

  function corPrioridade(p) {
    if (p === "Urgente") return "#ef4444"
    if (p === "Normal") return "#f59e0b"
    if (p === "Baixa") return "#10b981"
    return "#999"
  }

  function corCardPrioridade(p) {
    if (p === "Urgente") return "#fee2e2"
    if (p === "Normal") return "#fef3c7"
    if (p === "Baixa") return "#d1fae5"
    return "#f3f4f6"
  }

  function renderStatusBadge(status) {
    let bg = "#f3f4f6"
    let color = "#374151"

    if (status === "Pendente") {
      bg = "#fef3c7"
      color = "#92400e"
    }

    if (status === "Em produção") {
      bg = "#dbeafe"
      color = "#1d4ed8"
    }

    if (status === "Concluído") {
      bg = "#dcfce7"
      color = "#166534"
    }

    return (
      <span
        style={{
          display: "inline-block",
          padding: "6px 10px",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: "600",
          background: bg,
          color: color
        }}
      >
        {status}
      </span>
    )
  }

  return (
    <div className="main">
      <div className="card">
        <div style={{ display: "flex", gap: "10px", marginBottom: "25px" }}>
          <button
            onClick={() => setAba("lista")}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: aba === "lista" ? "#2563eb" : "#e5e7eb",
              color: aba === "lista" ? "white" : "#333",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            Pedidos
          </button>

          {(user.role === "Mídia" || user.role === "Administrador") && (
            <button
              onClick={() => setAba("kanban")}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "none",
                background: aba === "kanban" ? "#2563eb" : "#e5e7eb",
                color: aba === "kanban" ? "white" : "#333",
                cursor: "pointer",
                fontWeight: "600"
              }}
            >
              Kanban
            </button>
          )}
        </div>

        {aba === "lista" && (
          <>
            <h2 className="subtitle">Novo Pedido</h2>

            <form onSubmit={criarPedido} style={{ maxWidth: "500px" }}>
              <input
                placeholder="Título do pedido"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
              />

              <textarea
                placeholder="Descrição"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  minHeight: "110px"
                }}
              />

              <select
                value={prioridade}
                onChange={e => setPrioridade(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #ddd"
                }}
              >
                <option value="Urgente">🔴 Urgente</option>
                <option value="Normal">🟡 Normal</option>
                <option value="Baixa">🟢 Baixa</option>
              </select>

              <select
                value={destino}
                onChange={e => setDestino(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #ddd"
                }}
              >
                <option value="Mídia">Mídia</option>
                <option value="Sonoplastia">Sonoplastia</option>
              </select>

              <button
                className="login-btn"
                type="submit"
                disabled={enviando}
                style={{
                  marginTop: "12px",
                  width: "auto",
                  opacity: enviando ? 0.7 : 1,
                  cursor: enviando ? "not-allowed" : "pointer"
                }}
              >
                {enviando ? "Enviando..." : "Criar pedido"}
              </button>
            </form>

            <h2 className="subtitle" style={{ marginTop: "35px" }}>
              Pedidos
            </h2>

            <div style={{ marginTop: "20px", display: "grid", gap: "16px" }}>
              {pedidos.map(p => (
                <div
                  key={p.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "16px",
                    background: "white"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                      <h3 style={{ margin: "0 0 8px 0" }}>{p.titulo}</h3>

                      <p style={{ margin: "0 0 8px 0", color: "#555" }}>
                        {p.descricao}
                      </p>

                      <small style={{ display: "block", color: "#666" }}>
                        Ministério: {p.ministerio}
                      </small>

                      <small style={{ display: "block", color: "#666" }}>
                        Destino: {p.destino || "-"}
                      </small>

                      <small style={{ display: "block", color: "#666" }}>
                        Origem: {p.origem || "site"}
                      </small>

                      {p.link_drive && (
                        <small style={{ display: "block", marginTop: "6px" }}>
                          📁 <a href={p.link_drive} target="_blank" rel="noreferrer">
                            Abrir pasta da arte
                          </a>
                        </small>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                      {renderStatusBadge(p.status)}

                      <span
                        style={{
                          background: corPrioridade(p.prioridade),
                          color: "white",
                          padding: "5px 9px",
                          borderRadius: "6px",
                          fontSize: "12px"
                        }}
                      >
                        {p.prioridade}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: "16px" }}>
                    <h4 style={{ margin: "0 0 10px 0", fontSize: "15px" }}>
                      Comentários
                    </h4>

                    <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
                      {comentariosDoPedido(p.id).length === 0 && (
                        <small style={{ color: "#777" }}>
                          Nenhum comentário ainda.
                        </small>
                      )}

                      {comentariosDoPedido(p.id).map(c => (
                        <div
                          key={c.id}
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "10px"
                          }}
                        >
                          <strong style={{ fontSize: "13px" }}>
                            {c.usuario}
                          </strong>

                          <p style={{ margin: "6px 0 0 0", fontSize: "14px" }}>
                            {c.mensagem}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        placeholder="Escrever comentário..."
                        value={comentariosInput[p.id] ?? ""}
                        onChange={e =>
                          setComentariosInput(prev => ({
                            ...prev,
                            [p.id]: e.target.value
                          }))
                        }
                      />

                      <button
                        type="button"
                        onClick={() => enviarComentario(p.id)}
                        style={{
                          border: "none",
                          background: "#2563eb",
                          color: "white",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          cursor: "pointer"
                        }}
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {aba === "kanban" && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="kanban-board">
              {["PENDENTE", "PRODUCAO", "CONCLUIDO"].map(coluna => {
                const statusReal =
                  coluna === "PENDENTE"
                    ? "Pendente"
                    : coluna === "PRODUCAO"
                    ? "Em produção"
                    : "Concluído"

                const itens = separar(statusReal)

                return (
                  <Droppable key={coluna} droppableId={coluna}>
                    {provided => (
                      <div
                        className="kanban-column"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        <div className="kanban-column-header">
                          <span>{statusReal.toUpperCase()}</span>

                          <span className="kanban-count">
                            {itens.length}
                          </span>
                        </div>

                        <div className="kanban-cards">
                          {itens.map((p, index) => (
                            <Draggable
                              key={p.id}
                              draggableId={String(p.id)}
                              index={index}
                              isDragDisabled={!podeEditar}
                            >
                              {provided => (
                               <div
  <div
  className="kanban-card"
  ref={provided.innerRef}
  {...provided.draggableProps}
  {...provided.dragHandleProps}
  onClick={() => setPedidoAberto(p)}

                                  style={{
                                    ...provided.draggableProps.style,
                                    background: corCardPrioridade(p.prioridade),
                                    padding: "12px",
                                    borderRadius: "8px"
                                  }}
                                >
                                  <h4>{p.titulo}</h4>
                                  <p>{p.descricao}</p>
                                  <small>{p.ministerio}</small>
                                  {p.link_drive && (
                                    <>
                                      <br />
                                      <small>
                                        📁 <a href={p.link_drive} target="_blank" rel="noreferrer">
                                          Abrir pasta
                                        </a>
                                      </small>
                                    </>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}

                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                )
              })}
            </div>
          </DragDropContext>
        )}
      </div>
      {pedidoAberto && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000
    }}
    onClick={() => setPedidoAberto(null)}
  >
    <div
      style={{
        background: "white",
        padding: "30px",
        borderRadius: "12px",
        width: "600px",
        maxWidth: "90%"
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h2>{pedidoAberto.titulo}</h2>

      <p>{pedidoAberto.descricao}</p>

      <p><b>Ministério:</b> {pedidoAberto.ministerio}</p>
      <p><b>Prioridade:</b> {pedidoAberto.prioridade}</p>
      <p><b>Status:</b> {pedidoAberto.status}</p>

      {pedidoAberto.link_drive && (
        <p>
          <a href={pedidoAberto.link_drive} target="_blank">
            📁 Abrir pasta no Drive
          </a>
        </p>
      )}

      <button
        className="login-btn"
        onClick={() => setPedidoAberto(null)}
        style={{ marginTop: "20px", width: "auto" }}
      >
        Fechar
      </button>
    </div>
  </div>
)}
    </div>
  )
}
