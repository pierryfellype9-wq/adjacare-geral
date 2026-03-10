import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

export default function Pedidos({ user }) {

  const [titulo,setTitulo] = useState("")
  const [descricao,setDescricao] = useState("")
  const [prioridade,setPrioridade] = useState("Normal")
  const [responsavel,setResponsavel] = useState("")

  const [usuarios,setUsuarios] = useState([])
  const [pedidos,setPedidos] = useState([])
  const [aba,setAba] = useState("lista")

  const podeEditar =
    user?.role === "Mídia" ||
    user?.role === "Administrador"

  useEffect(()=>{

    carregarPedidos()
    carregarUsuarios()

    const channel = supabase
      .channel("realtime-pedidos")
      .on(
        "postgres_changes",
        { event:"*", schema:"public", table:"pedidos" },
        () => carregarPedidos()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }

  },[])


  async function carregarUsuarios(){

    const { data, error } = await supabase
      .from("users")
      .select("id,nome,role")
      .eq("role","Mídia")

    if(error){
      console.log(error)
      return
    }

    setUsuarios(data || [])

  }


  async function carregarPedidos(){

    let query = supabase
      .from("pedidos")
      .select("*")
      .order("data",{ascending:false})

    if(user.role !== "Administrador" && user.role !== "Mídia"){
      query = query.eq("ministerio", user.role)
    }

    const { data, error } = await query

    if(error){
      console.log(error)
      return
    }

    setPedidos(data || [])

  }


  async function criarPedido(e){

    e.preventDefault()

    if(!titulo.trim()){
      alert("Digite um título")
      return
    }

    const { error } = await supabase
      .from("pedidos")
      .insert([{
        titulo,
        descricao,
        prioridade,
        responsavel_id: responsavel || null,
        ministerio:user.role,
        criado_por:user.nome,
        status:"Pendente",
        data:new Date().toISOString()
      }])

    if(error){
      alert("Erro: "+error.message)
      return
    }

    setTitulo("")
    setDescricao("")
    setPrioridade("Normal")
    setResponsavel("")

  }


  function separar(status){
    return pedidos.filter(p=>p.status===status)
  }


  async function atualizarStatusKanban(id,coluna){

    if(!podeEditar) return

    let status=""

    if(coluna==="PENDENTE") status="Pendente"
    if(coluna==="PRODUCAO") status="Em produção"
    if(coluna==="CONCLUIDO") status="Concluído"

    const { error } = await supabase
      .from("pedidos")
      .update({status})
      .eq("id",id)

    if(error){
      console.log(error)
    }

  }


  async function onDragEnd(result){

    if(!podeEditar) return
    if(!result.destination) return

    const id = result.draggableId
    const destino = result.destination.droppableId

    await atualizarStatusKanban(id,destino)

  }


  function corPrioridade(p){

    if(p==="Urgente") return "#ef4444"
    if(p==="Normal") return "#f59e0b"
    if(p==="Baixa") return "#10b981"

    return "#999"

  }


  function corCardPrioridade(p){

    if(p==="Urgente") return "#fee2e2"
    if(p==="Normal") return "#fef3c7"
    if(p==="Baixa") return "#d1fae5"

    return "#f3f4f6"

  }


  function renderStatusBadge(status){

    let bg="#f3f4f6"
    let color="#374151"

    if(status==="Pendente"){
      bg="#fef3c7"
      color="#92400e"
    }

    if(status==="Em produção"){
      bg="#dbeafe"
      color="#1d4ed8"
    }

    if(status==="Concluído"){
      bg="#dcfce7"
      color="#166534"
    }

    return(
      <span
        style={{
          display:"inline-block",
          padding:"6px 10px",
          borderRadius:"999px",
          fontSize:"12px",
          fontWeight:"600",
          background:bg,
          color:color
        }}
      >
        {status}
      </span>
    )
  }


  return(

    <div className="main">

      <div className="card">

        <div style={{display:"flex",gap:"10px",marginBottom:"25px"}}>

          <button
            onClick={()=>setAba("lista")}
            style={{
              padding:"10px 16px",
              borderRadius:"8px",
              border:"none",
              background:aba==="lista"?"#2563eb":"#e5e7eb",
              color:aba==="lista"?"white":"#333",
              cursor:"pointer",
              fontWeight:"600"
            }}
          >
            Pedidos
          </button>

          {(user.role === "Mídia" || user.role === "Administrador") && (

          <button
            onClick={()=>setAba("kanban")}
            style={{
              padding:"10px 16px",
              borderRadius:"8px",
              border:"none",
              background:aba==="kanban"?"#2563eb":"#e5e7eb",
              color:aba==="kanban"?"white":"#333",
              cursor:"pointer",
              fontWeight:"600"
            }}
          >
            Kanban
          </button>

          )}

        </div>


        {aba==="lista" && (

          <>

          <h2 className="subtitle">Novo Pedido</h2>

          <form onSubmit={criarPedido} style={{maxWidth:"500px"}}>

            <input
              placeholder="Título do pedido"
              value={titulo}
              onChange={e=>setTitulo(e.target.value)}
            />

            <textarea
              placeholder="Descrição"
              value={descricao}
              onChange={e=>setDescricao(e.target.value)}
              style={{
                width:"100%",
                marginTop:"12px",
                padding:"12px",
                borderRadius:"8px",
                border:"1px solid #ddd",
                minHeight:"110px"
              }}
            />

            <select
              value={prioridade}
              onChange={e=>setPrioridade(e.target.value)}
              style={{
                width:"100%",
                marginTop:"12px",
                padding:"10px",
                borderRadius:"8px",
                border:"1px solid #ddd"
              }}
            >

              <option value="Urgente">🔴 Urgente</option>
              <option value="Normal">🟡 Normal</option>
              <option value="Baixa">🟢 Baixa</option>

            </select>

            <select
              value={responsavel}
              onChange={e=>setResponsavel(e.target.value)}
              style={{
                width:"100%",
                marginTop:"12px",
                padding:"10px",
                borderRadius:"8px",
                border:"1px solid #ddd"
              }}
            >

              <option value="">Responsável da mídia</option>

              {usuarios.map(u=>(
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}

            </select>

            <button
              className="login-btn"
              style={{marginTop:"12px",width:"auto"}}
            >
              Criar pedido
            </button>

          </form>


          <h2 className="subtitle" style={{marginTop:"35px"}}>
            Pedidos
          </h2>

          <table style={{width:"100%",marginTop:"20px"}}>

            <thead>
              <tr>
                <th style={{textAlign:"left"}}>Título</th>
                <th style={{textAlign:"left"}}>Ministério</th>
                <th style={{textAlign:"left"}}>Status</th>
                <th style={{textAlign:"left"}}>Prioridade</th>
              </tr>
            </thead>

            <tbody>

              {pedidos.map(p=>(

                <tr key={p.id}>

                  <td>{p.titulo}</td>
                  <td>{p.ministerio}</td>
                  <td>{renderStatusBadge(p.status)}</td>

                  <td>

                    <span
                      style={{
                        background:corPrioridade(p.prioridade),
                        color:"white",
                        padding:"5px 9px",
                        borderRadius:"6px",
                        fontSize:"12px"
                      }}
                    >
                      {p.prioridade}
                    </span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          </>

        )}

        {aba==="kanban" && (

          <DragDropContext onDragEnd={onDragEnd}>

            <div className="kanban-board">

              {["PENDENTE","PRODUCAO","CONCLUIDO"].map(coluna=>{

                const statusReal =
                  coluna==="PENDENTE"?"Pendente":
                  coluna==="PRODUCAO"?"Em produção":
                  "Concluído"

                const itens = separar(statusReal)

                return(

                  <Droppable key={coluna} droppableId={coluna}>

                    {(provided)=>(

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

                          {itens.map((p,index)=>(

                            <Draggable
                              key={p.id}
                              draggableId={p.id.toString()}
                              index={index}
                              isDragDisabled={!podeEditar}
                            >

                              {(provided)=>(

                                <div
                                  className="kanban-card"
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    background:corCardPrioridade(p.prioridade),
                                    padding:"12px",
                                    borderRadius:"8px"
                                  }}
                                >

                                  <h4>{p.titulo}</h4>

                                  <p>{p.descricao}</p>

                                  <small>
                                    {p.ministerio}
                                  </small>

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

    </div>

  )

}