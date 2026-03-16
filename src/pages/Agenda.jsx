import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"


export default function Agenda() {


 const [titulo,setTitulo] = useState("")
 const [descricao,setDescricao] = useState("")
 const [ministerio,setMinisterio] = useState("")
 const [solicitante,setSolicitante] = useState("")
 const [inicio,setInicio] = useState("")
 const [fim,setFim] = useState("")
 const [publico,setPublico] = useState(true)


 const [ministerios,setMinisterios] = useState([])


 useEffect(()=>{
  carregarMinisterios()
 },[])


 async function carregarMinisterios(){


  const { data } = await supabase
   .from("users")
   .select("role")


  if(!data) return


  const lista = [...new Set(data.map(u => u.role))]
  setMinisterios(lista)


 }


 async function criarEvento(e){


  e.preventDefault()


  try{


   const resposta = await fetch("/api/criarEventoAgenda",{
    method:"POST",
    headers:{
     "Content-Type":"application/json"
    },
    body:JSON.stringify({
     titulo,
     descricao,
     ministerio,
     solicitante,
     inicio,
     fim,
     publico
    })
   })


   if(!resposta.ok){
    alert("Erro ao criar evento")
    return
   }


   alert("Evento criado na agenda!")


   setTitulo("")
   setDescricao("")
   setMinisterio("")
   setSolicitante("")
   setInicio("")
   setFim("")


  }catch(err){


   console.log(err)
   alert("Erro no servidor")


  }


 }


 return (


  <main className="main">


   <div className="page-header">
    <h2>Agenda da Igreja</h2>
    <p>Eventos e programações da ADJACARÉ</p>
   </div>


   <div className="card" style={{marginBottom:"25px"}}>


    <h3>Criar Evento</h3>


    <form onSubmit={criarEvento}>


     <input
      placeholder="Título do evento"
      value={titulo}
      onChange={e=>setTitulo(e.target.value)}
      required
     />


     <textarea
      placeholder="Descrição"
      value={descricao}
      onChange={e=>setDescricao(e.target.value)}
     />


     <select
      value={ministerio}
      onChange={e=>setMinisterio(e.target.value)}
      required
     >


      <option value="">Selecione o ministério</option>


      {ministerios.map(m => (
       <option key={m} value={m}>{m}</option>
      ))}


     </select>


     <input
      placeholder="Solicitado por"
      value={solicitante}
      onChange={e=>setSolicitante(e.target.value)}
      required
     />


     <label>Início do evento</label>


     <input
      type="datetime-local"
      value={inicio}
      onChange={e=>setInicio(e.target.value)}
      required
     />


     <label>Fim do evento</label>


     <input
      type="datetime-local"
      value={fim}
      onChange={e=>setFim(e.target.value)}
      required
     />


     <select
      value={publico ? "true":"false"}
      onChange={e=>setPublico(e.target.value === "true")}
     >
      <option value="true">Evento público</option>
      <option value="false">Evento interno</option>
     </select>


     <button className="login-btn">
      Criar evento
     </button>


    </form>


   </div>


   <div className="agenda-card">


    <iframe
     src="https://calendar.google.com/calendar/embed?src=midia%40adjacare.org&ctz=America%2FSao_Paulo"
     width="100%"
     height="650"
     style={{border:0}}
     loading="lazy"
     title="Agenda ADJACARÉ"
    />


   </div>


  </main>


 )


}
