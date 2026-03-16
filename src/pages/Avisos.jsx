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

<h2>Avisos da Igreja</h2>

{/* FORMULÁRIO */}

<div className="card" style={{marginBottom:"25px"}}>

<h3>Novo Aviso</h3>

<form onSubmit={criarAviso}>

<input
placeholder="Título"
value={titulo}
onChange={e=>setTitulo(e.target.value)}
/>

<textarea
placeholder="Mensagem"
value={mensagem}
onChange={e=>setMensagem(e.target.value)}
/>

<select
value={destino}
onChange={e=>setDestino(e.target.value)}
>

<option value="Todos">Todos</option>
<option value="Mídia">Mídia</option>
<option value="Música">Música</option>
<option value="Infantil">Infantil</option>
<option value="Jovens">Jovens</option>

</select>

<label style={{display:"block",marginTop:"10px"}}>
<input
type="checkbox"
checked={fixado}
onChange={e=>setFixado(e.target.checked)}
/>
 Fixar aviso
</label>

<label style={{display:"block"}}>
<input
type="checkbox"
checked={urgente}
onChange={e=>setUrgente(e.target.checked)}
/>
 Aviso urgente
</label>

<input
type="datetime-local"
value={expira}
onChange={e=>setExpira(e.target.value)}
style={{marginTop:"10px"}}
/>

<button className="login-btn">
Enviar aviso
</button>

</form>

</div>

{/* LISTA DE AVISOS */}

<div>

{avisos.length === 0 && (
<p>Nenhum aviso publicado.</p>
)}

{avisos.map(a => (

<div key={a.id} className="card">

<div style={{display:"flex",gap:"10px",marginBottom:"8px"}}>

{a.fixado && (
<span style={{
background:"#2563eb",
color:"white",
padding:"3px 8px",
borderRadius:"6px",
fontSize:"12px"
}}>
📌 FIXADO
</span>
)}

{a.urgente && (
<span style={{
background:"#ef4444",
color:"white",
padding:"3px 8px",
borderRadius:"6px",
fontSize:"12px"
}}>
🔴 URGENTE
</span>
)}

</div>

<h3>{a.titulo}</h3>

<p>{a.mensagem}</p>

<small>
Destino: {a.destino}
</small>

</div>

))}

</div>

</main>

)

}
