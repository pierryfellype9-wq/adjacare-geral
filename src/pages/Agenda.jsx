export default function Agenda() {

  return (

    <main className="main">

      <div className="page-header">
        <h2>Agenda da Igreja</h2>
        <p>Eventos e programações da ADJACARÉ</p>
      </div>

      <div className="agenda-card">

        <iframe 
          src="https://calendar.google.com/calendar/embed?src=midia%40adjacare.org&ctz=America%2FSao_Paulo">
          width="100%"
          height="650"
          style={{ border: 0 }}
          loading="lazy"
          title="Agenda ADJACARÉ"
        />

      </div>

    </main>

  )
}
