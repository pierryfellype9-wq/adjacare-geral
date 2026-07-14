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
    <section className="content" aria-label="Congresso Tetelestai 2026">
      <img className="logo" src="/logo-tetelestai-provisoria.svg" alt="Congresso Tetelestai 2026" />
      <p className="eyebrow">Uma experiência está sendo preparada</p>
      <div className="countdown-panel">
        <div className="countdown" aria-label="Contagem regressiva para o lançamento">
          {[[tempo?.days,"dias"],[tempo?.hours,"horas"],[tempo?.minutes,"minutos"],[tempo?.seconds,"segundos"]].map(([valor,rotulo]) => <div className="time-unit" key={rotulo}><strong>{valor === undefined ? "--" : String(valor).padStart(2,"0")}</strong><span>{rotulo}</span></div>)}
        </div>
        <p className="verse"><q>Está consumado.</q><span>João 19:30</span></p>
      </div>
      <a className="instagram" href="https://instagram.com/adjacare" target="_blank" rel="noreferrer">@adjacare</a>
    </section>
    <footer>30 de agosto • 4 a 6 de setembro</footer>
  </main>
}
