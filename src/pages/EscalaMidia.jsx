import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export default function EscalaMidia({ user }) {

  const [data,setData] = useState("")
  const [evento,setEvento] = useState("")

  const [projecao,setProjecao] = useState("")
  const [video,setVideo] = useState("")
  const [story,setStory] = useState("")
  const [fotos,setFotos] = useState("")

  const [observacao,setObservacao] = useState("")

  const [editandoId,setEditandoId] = useState(null)

  const [escalas,setEscalas] = useState([])
  const [aba,setAba] = useState("ativas")

  useEffect(()=>{
    carregarEscalas()
  },[aba])

  async function carregarEscalas(){

    const arquivado = aba === "arquivadas"

    const { data } = await supabase
      .from("escala_midia")
      .select("*")
      .eq("arquivado",arquivado)
      .order("data",{ascending:true})

    setEscalas(data || [])

  }

  async function enviarEmailEscala(){

    try{

      await fetch("/api/enviar-email",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          assunto:"Atualização de escala da mídia - ADJACARÉ",
          mensagem:`
            <h2>Escala da mídia atualizada</h2>

            <p><b>Data:</b> ${data}</p>
            <p><b>Evento:</b> ${evento || "Culto"}</p>

            <hr>

            <p><b>Projeção:</b> ${projecao || "-"}</p>
            <p><b>Vídeo:</b> ${video || "-"}</p>
            <p><b>Story Making:</b> ${story || "-"}</p>
            <p><b>Fotos:</b> ${fotos || "-"}</p>

            ${observacao ? `<p><b>Observação:</b> ${observacao}</p>` : ""}

            <br>

            <p>Atualizado por: ${user.nome}</p>
          `
        })
      })

    }catch(err){
      console.log("Erro envio email:",err)
    }

  }

  async function salvarEscala(e){

    e.preventDefault()

    if(!data){
      alert("Selecione a data")
      return
    }

    if(editandoId){

      await supabase
        .from("escala_midia")
        .update({
          data,
          evento,
          projecao,
          video,
          story,
          fotos,
          observacao
        })
        .eq("id",editandoId)

      setEditandoId(null)

      await enviarEmailEscala()

      alert("Escala atualizada!")

    }else{

      const { data:existente } = await supabase
        .from("escala_midia")
        .select("id")
        .eq("data",data)
        .single()

      if(existente){
        alert("Já existe uma escala para essa data.")
        return
      }

      await supabase
        .from("escala_midia")
        .insert([{

          data,
          evento,
          projecao,
          video,
          story,
          fotos,
          observacao,
          criado_por:user.nome,
          departamento:user.role

        }])

      await enviarEmailEscala()

      alert("Escala salva com sucesso!")

    }

    setData("")
    setEvento("")
    setProjecao("")
    setVideo("")
    setStory("")
    setFotos("")
    setObservacao("")

    carregarEscalas()

  }

  function editar(e){

    setEditandoId(e.id)

    setData(e.data)
    setEvento(e.evento || "")
    setProjecao(e.projecao || "")
    setVideo(e.video || "")
    setStory(e.story || "")
    setFotos(e.fotos || "")
    setObservacao(e.observacao || "")

    window.scrollTo({top:0,behavior:"smooth"})

  }

  async function arquivar(id){

    if(!confirm("Arquivar esta escala?")) return

    await supabase
      .from("escala_midia")
      .update({arquivado:true})
      .eq("id",id)

    carregarEscalas()

  }

  async function restaurar(id){

    await supabase
      .from("escala_midia")
      .update({arquivado:false})
      .eq("id",id)

    carregarEscalas()

  }

  return(

    <div className="main">
      <div className="card">

        <h2 className="subtitle">
          Escala da Mídia
        </h2>

        <form onSubmit={salvarEscala} style={{maxWidth:"500px"}}>

          <input
            type="date"
            value={data}
            onChange={e=>setData(e.target.value)}
            required
          />

          <input
            placeholder="Evento"
            value={evento}
            onChange={e=>setEvento(e.target.value)}
          />

          <input
            placeholder="Projeção"
            value={projecao}
            onChange={e=>setProjecao(e.target.value)}
          />

          <input
            placeholder="Vídeo"
            value={video}
            onChange={e=>setVideo(e.target.value)}
          />

          <input
            placeholder="Story Making"
            value={story}
            onChange={e=>setStory(e.target.value)}
          />

          <input
            placeholder="Fotos"
            value={fotos}
            onChange={e=>setFotos(e.target.value)}
          />

          <textarea
            placeholder="Observação"
            value={observacao}
            onChange={e=>setObservacao(e.target.value)}
            style={{
              width:"100%",
              marginTop:"12px",
              padding:"12px",
              borderRadius:"8px",
              border:"1px solid #ddd"
            }}
          />

          <button
            className="login-btn"
            style={{marginTop:"12px",width:"auto"}}
          >
            {editandoId ? "Atualizar escala" : "Salvar escala"}
          </button>

        </form>


        <h2 className="subtitle" style={{marginTop:"40px"}}>
          Escalas cadastradas
        </h2>

        <div style={{marginTop:"20px",display:"grid",gap:"16px"}}>

          {escalas.map(e=>{

            const dataFormatada = e.data.split("-").reverse().join("/")

            return(

              <div
                key={e.id}
                style={{
                  border:"1px solid #e5e7eb",
                  borderRadius:"12px",
                  padding:"16px",
                  background:"white"
                }}
              >

                <h3>
                  {dataFormatada} • {e.evento || "Culto"}
                </h3>

                <p>🖥 <strong>Projeção:</strong> {e.projecao || "-"}</p>

                <p>🎥 <strong>Vídeo:</strong> {e.video || "-"}</p>

                <p>📱 <strong>Story Making:</strong> {e.story || "-"}</p>

                <p>📷 <strong>Fotos:</strong> {e.fotos || "-"}</p>

                {e.observacao && (
                  <p><strong>Obs:</strong> {e.observacao}</p>
                )}

                <small style={{color:"#6b7280"}}>
                  Criado por: {e.criado_por} • {e.departamento}
                </small>

                <div style={{marginTop:"12px",display:"flex",gap:"10px"}}>

                  <button
                    onClick={()=>editar(e)}
                    style={{
                      border:"none",
                      background:"#2563eb",
                      color:"white",
                      padding:"8px 12px",
                      borderRadius:"6px",
                      cursor:"pointer"
                    }}
                  >
                    Editar
                  </button>

                  <button
                    onClick={()=>arquivar(e.id)}
                    style={{
                      border:"none",
                      background:"#6b7280",
                      color:"white",
                      padding:"8px 12px",
                      borderRadius:"6px",
                      cursor:"pointer"
                    }}
                  >
                    Arquivar
                  </button>

                </div>

              </div>

            )

          })}

        </div>

      </div>
    </div>

  )

}
