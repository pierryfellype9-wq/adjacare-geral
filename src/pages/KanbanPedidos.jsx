import { useEffect, useState } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { supabase } from "../lib/supabase"

export default function KanbanPedidos({ user }) {

  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  const podeEditar = user?.role === "Mídia"

  useEffect(() => {
    buscarPedidos()

    const channel = supabase
      .channel("realtime-pedidos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          buscarPedidos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }

  }, [])

  async function buscarPedidos() {

    setLoading(true)

    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .order("data", { ascending: false })

    if (error) {
      console.log(error)
    }

    setPedidos(data || [])

    setLoading(false)
  }

  function agrupar() {
    return {
      PENDENTE: pedidos.filter(p => p.status === "Pendente"),
      PRODUCAO: pedidos.filter(p => p.status === "Em produção"),
      CONCLUIDO: pedidos.filter(p => p.status === "Concluído")
    }
  }

  async function atualizarStatus(id, status) {

    if (!podeEditar) return

    let novoStatus = ""

    if (status === "PENDENTE") novoStatus = "Pendente"
    if (status === "PRODUCAO") novoStatus = "Em produção"
    if (status === "CONCLUIDO") novoStatus = "Concluído"

    const { error } = await supabase
      .from("pedidos")
      .update({ status: novoStatus })
      .eq("id", id)

    if (error) {
      console.log(error)
    }
  }

  async function onDragEnd(result) {

    if (!podeEditar) return

    const { source, destination } = result

    if (!destination) return

    const origem = source.droppableId
    const destino = destination.droppableId

    if (origem === destino) return

    const grupos = agrupar()

    const pedido = grupos[origem][source.index]

    await atualizarStatus(pedido.id, destino)
  }

  const grupos = agrupar()

  if (loading) {
    return (
      <div className="main">
        <div className="card">
          Carregando pedidos...
        </div>
      </div>
    )
  }

  return (
    <div className="main">

      <div className="card">

        <h1 className="title">Kanban de Pedidos</h1>

        {!podeEditar && (
          <p style={{ marginBottom: "20px", color: "#666" }}>
            Apenas o departamento de mídia pode alterar status.
          </p>
        )}

        <DragDropContext onDragEnd={onDragEnd}>

          <div className="kanban-board">

            {/* PENDENTE */}
            <Droppable droppableId="PENDENTE">
              {(provided) => (
                <div
                  className="kanban-column"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >

                  <div className="kanban-column-header">
                    <span>PENDENTE</span>
                    <span className="kanban-count">{grupos.PENDENTE.length}</span>
                  </div>

                  <div className="kanban-cards">

                    {grupos.PENDENTE.map((pedido, index) => (

                      <Draggable
                        key={pedido.id}
                        draggableId={pedido.id.toString()}
                        index={index}
                        isDragDisabled={!podeEditar}
                      >

                        {(provided) => (
                          <div
                            className="kanban-card"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <h4>{pedido.titulo}</h4>
                            <p>{pedido.descricao}</p>
                            <small>Ministério: {pedido.ministerio}</small>
                          </div>
                        )}

                      </Draggable>

                    ))}

                    {provided.placeholder}

                  </div>

                </div>
              )}
            </Droppable>


            {/* PRODUÇÃO */}
            <Droppable droppableId="PRODUCAO">
              {(provided) => (
                <div
                  className="kanban-column"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >

                  <div className="kanban-column-header">
                    <span>EM PRODUÇÃO</span>
                    <span className="kanban-count">{grupos.PRODUCAO.length}</span>
                  </div>

                  <div className="kanban-cards">

                    {grupos.PRODUCAO.map((pedido, index) => (

                      <Draggable
                        key={pedido.id}
                        draggableId={pedido.id.toString()}
                        index={index}
                        isDragDisabled={!podeEditar}
                      >

                        {(provided) => (
                          <div
                            className="kanban-card"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <h4>{pedido.titulo}</h4>
                            <p>{pedido.descricao}</p>
                            <small>Ministério: {pedido.ministerio}</small>
                          </div>
                        )}

                      </Draggable>

                    ))}

                    {provided.placeholder}

                  </div>

                </div>
              )}
            </Droppable>


            {/* CONCLUÍDO */}
            <Droppable droppableId="CONCLUIDO">
              {(provided) => (
                <div
                  className="kanban-column"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >

                  <div className="kanban-column-header">
                    <span>CONCLUÍDO</span>
                    <span className="kanban-count">{grupos.CONCLUIDO.length}</span>
                  </div>

                  <div className="kanban-cards">

                    {grupos.CONCLUIDO.map((pedido, index) => (

                      <Draggable
                        key={pedido.id}
                        draggableId={pedido.id.toString()}
                        index={index}
                        isDragDisabled={!podeEditar}
                      >

                        {(provided) => (
                          <div
                            className="kanban-card"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <h4>{pedido.titulo}</h4>
                            <p>{pedido.descricao}</p>
                            <small>Ministério: {pedido.ministerio}</small>
                          </div>
                        )}

                      </Draggable>

                    ))}

                    {provided.placeholder}

                  </div>

                </div>
              )}
            </Droppable>

          </div>

        </DragDropContext>

      </div>

    </div>
  )
}