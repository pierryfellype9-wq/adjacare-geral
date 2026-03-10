export default function Impressoes(){

  function imprimir(){
    window.print()
  }

  return(

    <main className="main">

      <h2>Impressões</h2>

      <p>Área para gerar certificados ou documentos.</p>

      <button onClick={imprimir}>
        Imprimir documento
      </button>

    </main>

  )

}