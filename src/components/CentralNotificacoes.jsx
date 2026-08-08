import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

function dataCurta(valor) {
  return valor ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(valor)) : "Agora"
}

export default function CentralNotificacoes({ user }) {
  const navigate = useNavigate()
  const area = useRef(null)
  const [aberta, setAberta] = useState(false)
  const [avisos, setAvisos] = useState([])

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const { data } = await supabase.from("avisos").select("id,titulo,mensagem,destino,urgente,fixado,data,expira_em").order("fixado", { ascending: false }).order("data", { ascending: false }).limit(12)
      if (!ativo) return
      const agora = new Date()
      setAvisos((data || []).filter((aviso) => (!aviso.expira_em || new Date(aviso.expira_em) > agora) && (!aviso.destino || aviso.destino === "Todos" || aviso.destino === user?.role)).slice(0, 6))
    }
    carregar()
    const intervalo = setInterval(carregar, 120000)
    return () => { ativo = false; clearInterval(intervalo) }
  }, [user?.role])

  useEffect(() => {
    function fechar(evento) { if (!area.current?.contains(evento.target)) setAberta(false) }
    document.addEventListener("pointerdown", fechar)
    return () => document.removeEventListener("pointerdown", fechar)
  }, [])

  return <div className="notificacoes" ref={area}>
    <button type="button" className="app-topbar__icone" onClick={() => setAberta((valor) => !valor)} aria-label="Abrir notificações">♢{avisos.length > 0 && <b>{avisos.length}</b>}</button>
    {aberta && <section className="notificacoes__painel">
      <header><div><small>CENTRAL</small><h2>Notificações</h2></div><button type="button" onClick={() => setAberta(false)}>×</button></header>
      <div className="notificacoes__lista">
        {avisos.length ? avisos.map((aviso) => <button type="button" key={aviso.id} onClick={() => { navigate("/avisos"); setAberta(false) }}><i className={aviso.urgente ? "urgente" : ""}>!</i><div><strong>{aviso.titulo}</strong><p>{aviso.mensagem}</p><small>{dataCurta(aviso.data)} · {aviso.destino || "Todos"}</small></div></button>) : <div className="notificacoes__vazio"><span>✓</span><strong>Tudo em dia</strong><p>Não há avisos ativos para o seu perfil.</p></div>}
      </div>
      <footer><button type="button" onClick={() => { navigate("/avisos"); setAberta(false) }}>Ver todos os avisos →</button></footer>
    </section>}
  </div>
}
