import { useState } from "react"


export default function Agenda() {


 const [titulo,setTitulo] = useState("")
 const [descricao,setDescricao] = useState("")
 const [ministerio,setMinisterio] = useState("")
 const [solicitante,setSolicitante] = useState("")
 const [data,setData] = useState("")
 const [publico,setPublico] = useState(true)


 async function criarEvento(e){


  e.preventDefault()


  await fetch("/api/criarEventoAgenda",{
   method:"POST",
   headers:{
    "Content-Type":"application/json"
   },
   body:JSON.stringify({
    titulo,
    descricao,
    ministerio,
    solicitante,
    data,
    publico
   })
  })


  alert("Evento criado na agenda!")


  setTitulo("")
  setDescricao("")
  setMinisterio("")
  setSolicitante("")
  setData("")
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
     />


     <textarea
      placeholder="Descrição"
      value={descricao}
      onChange={e=>setDescricao(e.target.value)}
     />


     <select
      value={ministerio}
      onChange={e=>setMinisterio(e.target.value)}
     >


      <option value="">Ministério</option>
      <option value="Jovens">Jovens</option>
      <option value="Infantil">Infantil</option>
      <option value="Música">Música</option>
      <option value="Mídia">Mídia</option>
      <option value="Sonoplastia">Sonoplastia</option>


     </select>


     <input
      placeholder="Solicitado por"
      value={solicitante}
      onChange={e=>setSolicitante(e.target.value)}
     />


     <input
      type="datetime-local"
      value={data}
      onChange={e=>setData(e.target.value)}
     />


     <select
      value={publico}
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
