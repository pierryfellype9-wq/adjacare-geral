import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

export default function Pedidos({ user }) {

const [titulo,setTitulo] = useState("")
const [descricao,setDescricao] = useState("")
const [prioridade,setPrioridade] = useState("Normal")
const [destino,setDestino] = useState("Mídia")

const [pedidos,setPedidos] = useState([])
const [comentarios,setComentarios] = useState([])
const [comentariosInput,setComentariosInput] = useState({})
const [aba,setAba] = useState("lista")

/* PERMISSÃO PARA MOVER NO KANBAN */
const podeEditar =
user?.role === "Administrador" ||
user?.role === "Mídia"

useEffect(()=>{

carregarPedidos()
carregarComentarios()

const channelPedidos = supabase
.channel("pedidos-changes")
.on(
"postgres_changes",
{ event:"*", schema:"public", table:"pedidos" },
()=> carregarPedidos()
)
.subscribe()

const channelComentarios = supabase
.channel("comentarios-changes")
.on(
"postgres_changes",
{ event:"*", schema:"public", table:"comentarios_pedidos" },
()=> carregarComentarios()
)
.subscribe()

return ()=>{
supabase.removeChannel(channelPedidos)
supabase.removeChannel(channelComentarios)
}

},[])

async function carregarPedidos(){

let query = supabase
.from("pedidos")
.select("*")
.order("data",{ascending:false})

/* DIRIGENTE TAMBÉM VÊ TODOS */
if(
user?.role !== "Administrador" &&
user?.role !== "Mídia" &&
user?.role !== "Dirigente"
){
query = query.eq("ministerio",user?.role)
}

const { data,error } = await query

if(error){
console.log("Erro ao carregar pedidos:",error)
return
}

setPedidos(data || [])

}

async function carregarComentarios(){

const { data,error } = await supabase
.from("comentarios_pedidos")
.select("*")
.order("data",{ascending:true})

if(error){
console.log("Erro ao carregar comentários:",error)
return
}

setComentarios(data || [])

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
destino,
ministerio:user.role,
criado_por:user.nome,
status:"Pendente",
data:new Date().toISOString()
}])

if(error){
console.log("Erro ao criar pedido:",error)
alert("Erro: "+error.message)
return
}

setTitulo("")
setDescricao("")
setPrioridade("Normal")
setDestino("Mídia")

await carregarPedidos()

}

async function enviarComentario(pedidoId){

const mensagem = comentariosInput[pedidoId] || ""

if(!mensagem.trim()) return

const payload = {
pedido_id:String(pedidoId),
usuario:user.nome,
mensagem:mensagem.trim(),
data:new Date().toISOString()
}

const { data,error } = await supabase
.from("comentarios_pedidos")
.insert([payload])
.select()

if(error){
console.log("Erro ao enviar comentário:",error)
alert("Erro ao enviar comentário: "+error.message)
return
}

setComentariosInput(prev=>({
...prev,
[pedidoId]:""
}))

await carregarComentarios()

}

function comentariosDoPedido(pedidoId){
return comentarios.filter(c=>String(c.pedido_id)===String(pedidoId))
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
.update({ status })
.eq("id",String(id))

if(error){
console.log("Erro ao mover pedido:",error)
alert("Erro ao mover pedido")
return
}

await carregarPedidos()

}

async function onDragEnd(result){

if(!podeEditar) return
if(!result.destination) return

const pedidoId = String(result.draggableId)
const coluna = result.destination.droppableId

await atualizarStatusKanban(pedidoId,coluna)

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

{(user.role==="Mídia" || user.role==="Administrador") && (

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

<div style={{marginTop:"20px",display:"grid",gap:"16px"}}>

{pedidos.map(p=>(
<div
key={p.id}
style={{
border:"1px solid #e5e7eb",
borderRadius:"12px",
padding:"16px",
background:"white"
}}
>

<div style={{display:"flex",justifyContent:"space-between",gap:"12px",flexWrap:"wrap"}}>

<div>
<h3 style={{margin:"0 0 8px 0"}}>{p.titulo}</h3>
<p style={{margin:"0 0 8px 0",color:"#555"}}>{p.descricao}</p>

<small style={{display:"block",color:"#666"}}>
Ministério: {p.ministerio}
</small>

<small style={{display:"block",color:"#666"}}>
Destino: {p.destino || "-"}
</small>

</div>

<div style={{display:"flex",flexDirection:"column",gap:"8px",alignItems:"flex-start"}}>

{renderStatusBadge(p.status)}

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

</div>

</div>

<div style={{marginTop:"16px"}}>

<h4 style={{margin:"0 0 10px 0",fontSize:"15px"}}>
Comentários
</h4>

<div style={{display:"grid",gap:"8px",marginBottom:"12px"}}>

{comentariosDoPedido(p.id).length===0 && (
<small style={{color:"#777"}}>
Nenhum comentário ainda.
</small>
)}

{comentariosDoPedido(p.id).map(c=>(
<div
key={c.id}
style={{
background:"#f8fafc",
border:"1px solid #e5e7eb",
borderRadius:"8px",
padding:"10px"
}}
>
<strong style={{fontSize:"13px"}}>
{c.usuario}
</strong>

<p style={{margin:"6px 0 0 0",fontSize:"14px"}}>
{c.mensagem}
</p>

</div>
))}

</div>

<div style={{display:"flex",gap:"8px"}}>

<input
key={"comentario-"+p.id}
placeholder="Escrever comentário..."
value={comentariosInput[p.id] ?? ""}
onChange={e =>
setComentariosInput(prev=>({
...prev,
[p.id]:e.target.value
}))
}
style={{marginTop:0}}
/>

<button
type="button"
onClick={()=>enviarComentario(p.id)}
style={{
border:"none",
background:"#2563eb",
color:"white",
padding:"10px 14px",
borderRadius:"8px",
cursor:"pointer"
}}
>
Enviar
</button>

</div>

</div>

</div>
))}

</div>

)}

</div>
</div>

)

}
