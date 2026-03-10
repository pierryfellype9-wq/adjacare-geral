export default function Solicitacoes(){

  const pedidos = [
    {
      titulo:"Arte Congresso Jovens",
      data:"12/05/2026",
      status:"Pendente"
    },
    {
      titulo:"Vídeo Culto Especial",
      data:"18/05/2026",
      status:"Em produção"
    }
  ]

  return(

    <main className="main">

      <h2>Solicitações enviadas</h2>

      {pedidos.map((p,i)=>(

        <div
          key={i}
          style={{
            background:"#f3f4f6",
            padding:"15px",
            borderRadius:"10px",
            marginTop:"15px"
          }}
        >

          <h3>{p.titulo}</h3>

          <p>Data: {p.data}</p>

          <strong>Status: {p.status}</strong>

        </div>

      ))}

    </main>

  )

}