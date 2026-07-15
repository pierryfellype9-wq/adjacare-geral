import { useEffect, useMemo, useState } from "react"

function calcular(target) {
  if (!target) return null
  const distancia = new Date(target).getTime() - Date.now()
  if (Number.isNaN(distancia) || distancia <= 0) return null
  return {
    days: Math.floor(distancia / 86400000),
    hours: Math.floor((distancia / 3600000) % 24),
    minutes: Math.floor((distancia / 60000) % 60),
    seconds: Math.floor((distancia / 1000) % 60),
  }
}

export default function ComingSoon({ lancamento }) {
  const inicial = useMemo(() => calcular(lancamento), [lancamento])
  const [tempo, setTempo] = useState(inicial)

  useEffect(() => {
    setTempo(calcular(lancamento))
    if (!lancamento) return
    const timer = window.setInterval(() => setTempo(calcular(lancamento)), 1000)
    return () => window.clearInterval(timer)
  }, [lancamento])

  return <main className="coming-soon">
    <div className="coming-orbit coming-orbit-one" aria-hidden="true" />
    <div className="coming-orbit coming-orbit-two" aria-hidden="true" />
    <section className="coming-content" aria-label="Congresso Tetelestai 2026">
      <div className="coming-logo-frame"><img className="coming-logo" src="/logo-tetelestai-provisoria.svg" alt="Sistema AD Jacaré" /></div>
      <p className="coming-eyebrow">Uma experiência está sendo preparada</p>
      <div className="coming-countdown-panel">
        {tempo ? <div className="coming-countdown" aria-label="Contagem regressiva para o lançamento">
          {[[tempo.days,"dias"],[tempo.hours,"horas"],[tempo.minutes,"minutos"],[tempo.seconds,"segundos"]].map(([valor,rotulo]) => <div className="coming-time-unit" key={rotulo}><strong>{String(valor).padStart(2,"0")}</strong><span>{rotulo}</span></div>)}
        </div> : <div className="coming-date-pending"><span>Lançamento oficial</span><strong>Em breve</strong><p>A data e o horário serão anunciados.</p></div>}
        <p className="coming-verse"><q>Está consumado.</q><span>João 19:30</span></p>
      </div>
      <a className="coming-instagram" href="https://instagram.com/adjacare" target="_blank" rel="noreferrer">@adjacare</a>
    </section>
    <footer><span>30 de agosto</span><i /> <span>4 a 6 de setembro</span></footer>
  </main>
}
