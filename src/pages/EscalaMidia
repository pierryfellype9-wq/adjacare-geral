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

  const [escalas,setEscalas] = useState([])

  useEffect(()=>{
    carregarEscalas()
  },[])

  async function carregarEscalas(){

    const { data } = await supabase
      .from("escala_midia")
      .select("*")
      .order("data",{ascending:true})

    setEscalas(data || [])

  }

  async function salvarEscala(e){

    e.preventDefault()

    if(!data){
      alert("Selecione a data")
      return
    }

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

    setData("")
    setEvento("")
    setProjecao("")
    setVideo("")
    setStory("")
    setFotos("")
    setObservacao("")

    carregarEscalas()

  }

  async function excluir(id){

    if(!confirm("Deseja excluir esta escala?")) return

    await supabase
      .from("escala_midia")
      .delete()
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
            placeholder="Evento (Culto noite, Jovens, Santa Ceia...)"
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
            Salvar escala
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

                <div style={{marginTop:"10px"}}>

                  <button
                    onClick={()=>excluir(e.id)}
                    style={{
                      border:"none",
                      background:"#ef4444",
                      color:"white",
                      padding:"8px 12px",
                      borderRadius:"6px",
                      cursor:"pointer"
                    }}
                  >
                    Excluir
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
