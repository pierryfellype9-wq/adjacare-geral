import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export default function Avisos({ user }) {

const [titulo,setTitulo] = useState("")
const [mensagem,setMensagem] = useState("")
const [destino,setDestino] = useState("Todos")
const [avisos,setAvisos] = useState([])

/* PERMISSÃO */

const role = (user?.role ?? "").toLowerCase().trim()

const podeCriar = [
"administrador",
"secretaria",
"secretária",
"dirigente"
].includes(role)

/* CARREGAR AVISOS */

useEffect(() => {
carregarAvisos()
}, [])

async function carregarAvisos(){

const { data, error } = await supabase
.from("avisos")
.select("*")
.order("data",{ascending:false})

if(error){
console.log("Erro avisos:",error)
return
}

setAvisos(data || [])

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
destino
})
})

setTitulo("")
setMensagem("")
setDestino("Todos")

await carregarAvisos()

alert("Aviso enviado")

}

return(

<main className="main">

<h2>Avisos da Igreja</h2>

{/* FORMULÁRIO */}

{podeCriar && (

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

<button className="login-btn">
Enviar aviso
</button>

</form>

</div>

)}

{/* LISTA */}

<div>

{avisos.length === 0 && (
<p>Nenhum aviso publicado.</p>
)}

{avisos.map(a => (

<div key={a.id} className="card">

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
