import { notificar } from "../lib/feedback"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"
import { apiFetch } from "../lib/api"
import { podePublicarComunicacao } from "../lib/permissions"
import "./Avisos.css"

function formatarData(valor) {
  if (!valor) return "Publicado recentemente"

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor))
}

export default function Avisos({ user }) {
  const [titulo, setTitulo] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [destino, setDestino] = useState("Todos")
  const [fixado, setFixado] = useState(false)
  const [urgente, setUrgente] = useState(false)
  const [expira, setExpira] = useState("")
  const [avisos, setAvisos] = useState([])
  const [ministerios, setMinisterios] = useState([])
  const [avisoAberto, setAvisoAberto] = useState(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const podeEditar = podePublicarComunicacao(user)

  useEffect(() => {
    carregarAvisos()
    if (podeEditar) carregarMinisterios()
  }, [podeEditar])

  const resumo = useMemo(() => ({
    ativos: avisos.length,
    urgentes: avisos.filter((aviso) => aviso.urgente).length,
    fixados: avisos.filter((aviso) => aviso.fixado).length,
  }), [avisos])

  async function carregarAvisos() {
    const { data, error } = await supabase
      .from("avisos")
      .select("*")
      .order("fixado", { ascending: false })
      .order("data", { ascending: false })

    if (error) {
      console.error("Erro avisos:", error)
      return
    }

    const agora = new Date()
    const filtrados = (data || []).filter((aviso) => (
      !aviso.expira_em || new Date(aviso.expira_em) > agora
    ))
    setAvisos(filtrados)
  }

  async function carregarMinisterios() {
    const { data, error } = await supabase.from("users").select("role")

    if (error) {
      console.error("Erro ministérios:", error)
      return
    }

    const lista = [...new Set((data || []).map((usuario) => usuario.role).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
    setMinisterios(lista)
  }

  async function criarAviso(evento) {
    evento.preventDefault()
    if (salvando || !podeEditar) return

    if (!titulo.trim() || !mensagem.trim()) {
      notificar("Preencha título e mensagem")
      return
    }

    setSalvando(true)

    try {
      const resposta = await apiFetch("/api/criarAviso", {
        method: "POST",
        body: JSON.stringify({
          titulo: titulo.trim(),
          mensagem: mensagem.trim(),
          destino,
          fixado,
          urgente,
          expira_em: expira || null,
        }),
      })

      if (!resposta.ok) throw new Error("Erro ao publicar aviso")

      setTitulo("")
      setMensagem("")
      setDestino("Todos")
      setFixado(false)
      setUrgente(false)
      setExpira("")
      setFormularioAberto(false)
      await carregarAvisos()
      notificar("Aviso enviado")
    } catch (error) {
      console.error(error)
      notificar("Não foi possível publicar o aviso.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <main className="avisos-page">
      <section className="avisos-hero">
        <div className="avisos-hero__conteudo">
          <span className="avisos-kicker">MURAL DA IGREJA</span>
          <h1>Avisos e comunicados</h1>
          <p>
            Compartilhe orientações, lembretes e informações importantes com
            toda a igreja ou com um departamento específico.
          </p>
          {podeEditar ? (
            <button type="button" onClick={() => setFormularioAberto(true)}>
              <span>＋</span> Publicar novo aviso
            </button>
          ) : (
            <div className="avisos-hero__consulta">
              <b>✓</b>
              <span>
                <strong>Mural para consulta</strong>
                Acompanhe os comunicados destinados à sua equipe.
              </span>
            </div>
          )}
        </div>

        <div className="avisos-hero__sino" aria-hidden="true">
          <span>●</span>
          <b>♢</b>
        </div>
        <i className="avisos-hero__circulo um" />
        <i className="avisos-hero__circulo dois" />
      </section>

      <section className="avisos-resumo">
        <article>
          <span className="azul">▤</span>
          <div><small>Comunicados ativos</small><strong>{resumo.ativos}</strong></div>
        </article>
        <article>
          <span className="vermelho">!</span>
          <div><small>Precisam de atenção</small><strong>{resumo.urgentes}</strong></div>
        </article>
        <article>
          <span className="dourado">◆</span>
          <div><small>Fixados no mural</small><strong>{resumo.fixados}</strong></div>
        </article>
      </section>

      {podeEditar && formularioAberto && (
        <section className="avisos-formulario">
          <header>
            <div>
              <span>NOVO COMUNICADO</span>
              <h2>O que todos precisam saber?</h2>
              <p>Escreva de forma clara e escolha quem deve receber este aviso.</p>
            </div>
            <button type="button" aria-label="Fechar" onClick={() => setFormularioAberto(false)}>
              ×
            </button>
          </header>

          <form onSubmit={criarAviso}>
            <label className="avisos-campo avisos-campo--largo">
              <span>Título do aviso</span>
              <input
                placeholder="Ex.: Reunião com todos os líderes"
                value={titulo}
                onChange={(evento) => setTitulo(evento.target.value)}
                required
              />
            </label>

            <label className="avisos-campo avisos-campo--largo">
              <span>Mensagem</span>
              <textarea
                placeholder="Digite aqui todas as informações do comunicado..."
                value={mensagem}
                onChange={(evento) => setMensagem(evento.target.value)}
                required
              />
            </label>

            <label className="avisos-campo">
              <span>Quem deve receber?</span>
              <select value={destino} onChange={(evento) => setDestino(evento.target.value)}>
                <option value="Todos">Todos os departamentos</option>
                {ministerios.map((ministerio) => (
                  <option key={ministerio} value={ministerio}>{ministerio}</option>
                ))}
              </select>
            </label>

            <label className="avisos-campo">
              <span>Expiração do aviso</span>
              <input
                type="datetime-local"
                value={expira}
                onChange={(evento) => setExpira(evento.target.value)}
              />
              <small>Deixe vazio para manter o aviso ativo.</small>
            </label>

            <div className="avisos-opcoes avisos-campo--largo">
              <button
                type="button"
                className={fixado ? "ativo fixado" : ""}
                onClick={() => setFixado(!fixado)}
              >
                <span>◆</span>
                <div><strong>Fixar no topo</strong><small>Deixa o aviso em destaque</small></div>
                <i>{fixado ? "✓" : ""}</i>
              </button>
              <button
                type="button"
                className={urgente ? "ativo urgente" : ""}
                onClick={() => setUrgente(!urgente)}
              >
                <span>!</span>
                <div><strong>Marcar como urgente</strong><small>Indica atenção imediata</small></div>
                <i>{urgente ? "✓" : ""}</i>
              </button>
            </div>

            <footer className="avisos-campo--largo">
              <button type="button" className="secundario" onClick={() => setFormularioAberto(false)}>
                Cancelar
              </button>
              <button type="submit" disabled={salvando}>
                {salvando ? "Publicando..." : "Publicar comunicado"} <span>→</span>
              </button>
            </footer>
          </form>
        </section>
      )}

      <section className="avisos-mural">
        <header>
          <div>
            <span>COMUNICADOS ATIVOS</span>
            <h2>O que está acontecendo</h2>
            <p>Clique em um aviso para abrir e ler todos os detalhes.</p>
          </div>
          <b>{avisos.length} {avisos.length === 1 ? "aviso" : "avisos"}</b>
        </header>

        <div className="avisos-lista">
          {avisos.length === 0 && (
            <div className="avisos-vazio">
              <span>✓</span>
              <h3>Nenhum aviso ativo</h3>
              <p>Quando um novo comunicado for publicado, ele aparecerá aqui.</p>
            </div>
          )}

          {avisos.map((aviso) => (
            <article
              key={aviso.id}
              className={[
                aviso.urgente ? "urgente" : "",
                aviso.fixado ? "fixado" : "",
              ].join(" ")}
              onClick={() => setAvisoAberto(aviso)}
            >
              <div className="aviso-card__faixa" />
              <div className="aviso-card__topo">
                <div className="aviso-card__etiquetas">
                  {aviso.urgente && <span className="urgente">! URGENTE</span>}
                  {aviso.fixado && <span className="fixado">◆ FIXADO</span>}
                  {!aviso.urgente && !aviso.fixado && <span className="comunicado">COMUNICADO</span>}
                </div>
                <span className="aviso-card__seta">↗</span>
              </div>
              <h3>{aviso.titulo}</h3>
              <p>{aviso.mensagem}</p>
              <footer>
                <span><b>◎</b> {aviso.destino || "Todos"}</span>
                <time>{formatarData(aviso.data)}</time>
              </footer>
            </article>
          ))}
        </div>
      </section>

      {avisoAberto && (
        <div className="aviso-modal" onClick={() => setAvisoAberto(null)}>
          <article onClick={(evento) => evento.stopPropagation()}>
            <button type="button" aria-label="Fechar aviso" onClick={() => setAvisoAberto(null)}>
              ×
            </button>
            <div className={`aviso-modal__icone ${avisoAberto.urgente ? "urgente" : ""}`}>
              {avisoAberto.urgente ? "!" : "◆"}
            </div>
            <div className="aviso-card__etiquetas">
              {avisoAberto.urgente && <span className="urgente">! URGENTE</span>}
              {avisoAberto.fixado && <span className="fixado">◆ FIXADO</span>}
            </div>
            <h2>{avisoAberto.titulo}</h2>
            <p>{avisoAberto.mensagem}</p>
            <footer>
              <span>Destinado a <strong>{avisoAberto.destino || "Todos"}</strong></span>
              <time>{formatarData(avisoAberto.data)}</time>
            </footer>
          </article>
        </div>
      )}
    </main>
  )
}
