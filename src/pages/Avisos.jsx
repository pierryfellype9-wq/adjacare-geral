import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export default function Avisos() {

const [titulo,setTitulo] = useState("")
const [mensagem,setMensagem] = useState("")
const [destino,setDestino] = useState("Todos")

const [fixado,setFixado] = useState(false)
const [urgente,setUrgente] = useState(false)
const [expira,setExpira] = useState("")

const [avisos,setAvisos] = useState([])

useEffect(() => {
carregarAvisos()
}, [])

async function carregarAvisos(){

const { data, error } = await supabase
.from("avisos")
.select("*")
.order("fixado",{ascending:false})
.order("data",{ascending:false})

if(error){
console.log("Erro avisos:", error)
return
}

const agora = new Date()

const filtrados = (data || []).filter(a=>{
if(!a.expira_em) return true
return new Date(a.expira_em) > agora
})

setAvisos(filtrados)

}

async function criarAviso(e){

e.preventDefault()

if(!titulo.trim() || !mensagem.trim()){
alert("Preencha título e mensagem")
return
}

await fetch("/api/criarAviso",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
titulo,
mensagem,
destino,
fixado,
urgente,
expira_em: expira || null
})
})

setTitulo("")
setMensagem("")
setDestino("Todos")
setFixado(false)
setUrgente(false)
setExpira("")

await carregarAvisos()

alert("Aviso enviado")

}

return(

<main className="main">

<h1 style={{marginBottom:"10px"}}>
Avisos da Igreja
</h1>

<p style={{marginBottom:"25px",color:"#6b7280"}}>
Aqui você pode publicar comunicados importantes para os ministérios da igreja.
</p>

{/* FORMULÁRIO */}

<div className="card" style={{marginBottom:"35px"}}>

<h2 style={{marginBottom:"15px"}}>
Novo Aviso
</h2>

<form onSubmit={criarAviso} style={{display:"grid",gap:"12px"}}>

<input
placeholder="Título do aviso"
value={titulo}
onChange={e=>setTitulo(e.target.value)}
/>

<textarea
placeholder="Mensagem do aviso"
value={mensagem}
onChange={e=>setMensagem(e.target.value)}
style={{minHeight:"100px"}}
/>

<select
value={destino}
onChange={e=>setDestino(e.target.value)}
>
<option value="Todos">Todos os ministérios</option>
<option value="Mídia">Mídia</option>
<option value="Música">Música</option>
<option value="Infantil">Infantil</option>
<option value="Jovens">Jovens</option>
</select>

{/* OPÇÕES */}

<div style={{
background:"#f9fafb",
padding:"15px",
borderRadius:"10px",
border:"1px solid #e5e7eb"
}}>

<strong style={{display:"block",marginBottom:"10px"}}>
Opções do aviso
</strong>

<label style={{display:"block",marginBottom:"6px"}}>
<input
type="checkbox"
checked={fixado}
onChange={e=>setFixado(e.target.checked)}
/>
 Fixar aviso no topo
</label>

<label style={{display:"block"}}>
<input
type="checkbox"
checked={urgente}
onChange={e=>setUrgente(e.target.checked)}
/>
 Marcar como aviso urgente
</label>

</div>

{/* EXPIRAÇÃO */}

<div>

<label style={{fontWeight:"600"}}>
Data de expiração do aviso
</label>

<p style={{
fontSize:"13px",
color:"#6b7280",
marginBottom:"6px"
}}>
Defina uma data para que o aviso seja removido automaticamente após esse período.
</p>

<input
type="datetime-local"
value={expira}
onChange={e=>setExpira(e.target.value)}
/>

</div>

<button className="login-btn" style={{marginTop:"10px"}}>
Publicar aviso
</button>

</form>

</div>

{/* LISTA DE AVISOS */}

<h2 style={{marginBottom:"15px"}}>
Avisos publicados
</h2>

<div style={{display:"grid",gap:"16px"}}>

{avisos.length === 0 && (
<div className="card">
Nenhum aviso publicado no momento.
</div>
)}

{avisos.map(a => (

<div key={a.id} className="card">

<div style={{display:"flex",gap:"8px",marginBottom:"8px"}}>

{a.fixado && (
<span style={{
background:"#2563eb",
color:"white",
padding:"4px 8px",
borderRadius:"6px",
fontSize:"12px"
}}>
📌 Fixado
</span>
)}

{a.urgente && (
<span style={{
background:"#ef4444",
color:"white",
padding:"4px 8px",
borderRadius:"6px",
fontSize:"12px"
}}>
🔴 Urgente
</span>
)}

</div>

<h3 style={{marginBottom:"5px"}}>
{a.titulo}
</h3>

<p style={{marginBottom:"8px"}}>
{a.mensagem}
</p>

<small style={{color:"#6b7280"}}>
Destino: {a.destino}
</small>

</div>

))}

</div>

</main>

)

}
