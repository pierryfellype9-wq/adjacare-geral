import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export default function Avisos({ user }) {

const [titulo,setTitulo] = useState("")
const [mensagem,setMensagem] = useState("")
const [destino,setDestino] = useState("Todos")
const [avisos,setAvisos] = useState([])

const podeCriar =
["administrador","secretaria","secretária","dirigente"]
.includes(user?.role?.toLowerCase())

useEffect(()=>{
carregarAvisos()
},[])

async function carregarAvisos(){

const { data } = await supabase
.from("avisos")
.select("*")
.order("data",{ascending:false})

setAvisos(data || [])

}

async function criarAviso(e){

e.preventDefault()

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

<div className="page-header">
<h2>Avisos da Igreja</h2>
<p>Comunicados internos dos ministérios</p>
</div>

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

<option value="Todos">Todos os ministérios</option>
<option value="Mídia">Mídia</option>
<option value="Música">Música</option>
<option value="Infantil">Infantil</option>
<option value="Jovens">Jovens</option>
<option value="Adolescentes">Adolescentes</option>
<option value="Sonoplastia">Sonoplastia</option>

</select>

<button className="login-btn">
Enviar aviso
</button>

</form>

</div>

)}

<div className="pedidos-list">

{avisos.map(a=>(

<div key={a.id} className="pedido-card">

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
