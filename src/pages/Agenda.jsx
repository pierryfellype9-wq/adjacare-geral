import { notificar } from "../lib/feedback"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { apiFetch } from "../lib/api"
import { podePublicarComunicacao } from "../lib/permissions"
import "./Agenda.css"

function informacoesHoje() {
  const hoje = new Date()
  return {
    dia: new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(hoje),
    mes: new Intl.DateTimeFormat("pt-BR", { month: "short" })
      .format(hoje)
      .replace(".", "")
      .toUpperCase(),
    semana: new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(hoje),
    completa: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(hoje),
  }
}

export default function Agenda({ user }) {
  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [ministerio, setMinisterio] = useState("")
  const [solicitante, setSolicitante] = useState("")
  const [inicio, setInicio] = useState("")
  const [fim, setFim] = useState("")
  const [publico, setPublico] = useState(true)
  const [ministerios, setMinisterios] = useState([])
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const hoje = informacoesHoje()
  const podeEditar = podePublicarComunicacao(user)

  useEffect(() => {
    if (podeEditar) carregarMinisterios()
  }, [podeEditar])

  async function carregarMinisterios() {
    const { data } = await supabase.from("users").select("role")
    if (!data) return

    const lista = [...new Set(data.map((usuario) => usuario.role).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
    setMinisterios(lista)
  }

  async function criarEvento(evento) {
    evento.preventDefault()
    if (salvando || !podeEditar) return
    setSalvando(true)

    try {
      const resposta = await apiFetch("/api/criarEventoAgenda", {
        method: "POST",
        body: JSON.stringify({
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          ministerio,
          solicitante: solicitante.trim(),
          inicio,
          fim,
          publico,
        }),
      })

      if (!resposta.ok) throw new Error("Erro ao criar evento")

      setTitulo("")
      setDescricao("")
      setMinisterio("")
      setSolicitante("")
      setInicio("")
      setFim("")
      setPublico(true)
      setFormularioAberto(false)
      notificar("Evento criado na agenda!")
    } catch (error) {
      console.error(error)
      notificar("Não foi possível criar o evento.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <main className="agenda-page">
      <section className="agenda-hero">
        <div className="agenda-hero__texto">
          <span>PROGRAMAÇÃO DA IGREJA</span>
          <h1>Agenda ADJACARÉ</h1>
          <p>
            Cultos, ensaios, reuniões e eventos organizados para todos
            caminharem na mesma direção.
          </p>
          {podeEditar ? (
            <button type="button" onClick={() => setFormularioAberto(true)}>
              <b>＋</b> Adicionar evento
            </button>
          ) : (
            <div className="agenda-hero__consulta">
              <b>✓</b>
              <span><strong>Agenda para consulta</strong>Visualize as programações da igreja.</span>
            </div>
          )}
        </div>

        <div className="agenda-hero__hoje">
          <span>HOJE</span>
          <strong>{hoje.dia}</strong>
          <b>{hoje.mes}</b>
          <small>{hoje.semana}</small>
        </div>

        <div className="agenda-hero__decoracao" aria-hidden="true">
          <span /><span /><span />
        </div>
      </section>

      <section className="agenda-informacoes">
        <article>
          <span className="agenda-info__icone azul">▦</span>
          <div><small>Data de hoje</small><strong>{hoje.completa}</strong></div>
        </article>
        <article>
          <span className="agenda-info__icone dourado">◷</span>
          <div><small>Fuso horário</small><strong>Horário de Brasília</strong></div>
        </article>
        <article>
          <span className="agenda-info__icone verde">✓</span>
          <div><small>Calendário</small><strong>Sincronizado com Google</strong></div>
        </article>
      </section>

      {podeEditar && formularioAberto && (
        <section className="agenda-formulario">
          <header>
            <div>
              <span>NOVO COMPROMISSO</span>
              <h2>Adicionar à agenda da igreja</h2>
              <p>Preencha as informações para que todos saibam quando e onde participar.</p>
            </div>
            <button
              type="button"
              aria-label="Fechar formulário"
              onClick={() => setFormularioAberto(false)}
            >
              ×
            </button>
          </header>

          <form onSubmit={criarEvento}>
            <label className="agenda-campo agenda-campo--largo">
              <span>Nome do evento</span>
              <input
                placeholder="Ex.: Culto de ensino"
                value={titulo}
                onChange={(evento) => setTitulo(evento.target.value)}
                required
              />
            </label>

            <label className="agenda-campo agenda-campo--largo">
              <span>Descrição</span>
              <textarea
                placeholder="Informações importantes, local, orientações..."
                value={descricao}
                onChange={(evento) => setDescricao(evento.target.value)}
              />
            </label>

            <label className="agenda-campo">
              <span>Departamento responsável</span>
              <select
                value={ministerio}
                onChange={(evento) => setMinisterio(evento.target.value)}
                required
              >
                <option value="">Selecione o departamento</option>
                {ministerios.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="agenda-campo">
              <span>Solicitado por</span>
              <input
                placeholder="Nome do responsável"
                value={solicitante}
                onChange={(evento) => setSolicitante(evento.target.value)}
                required
              />
            </label>

            <label className="agenda-campo">
              <span>Início</span>
              <input
                type="datetime-local"
                value={inicio}
                onChange={(evento) => setInicio(evento.target.value)}
                required
              />
            </label>

            <label className="agenda-campo">
              <span>Término</span>
              <input
                type="datetime-local"
                value={fim}
                onChange={(evento) => setFim(evento.target.value)}
                required
              />
            </label>

            <div className="agenda-visibilidade agenda-campo--largo">
              <div>
                <span className={`agenda-visibilidade__icone ${publico ? "publico" : "interno"}`}>
                  {publico ? "◎" : "●"}
                </span>
                <div>
                  <strong>Visibilidade do evento</strong>
                  <small>
                    {publico
                      ? "Será exibido no calendário público da igreja."
                      : "Compromisso interno para organização das equipes."}
                  </small>
                </div>
              </div>
              <div className="agenda-visibilidade__opcoes">
                <button
                  type="button"
                  className={publico ? "ativo" : ""}
                  onClick={() => setPublico(true)}
                >
                  Público
                </button>
                <button
                  type="button"
                  className={!publico ? "ativo" : ""}
                  onClick={() => setPublico(false)}
                >
                  Interno
                </button>
              </div>
            </div>

            <footer className="agenda-campo--largo">
              <button type="button" className="secundario" onClick={() => setFormularioAberto(false)}>
                Cancelar
              </button>
              <button type="submit" disabled={salvando}>
                {salvando ? "Adicionando..." : "Adicionar à agenda"} <span>→</span>
              </button>
            </footer>
          </form>
        </section>
      )}

      <section className="agenda-calendario">
        <header>
          <div>
            <span>CALENDÁRIO GERAL</span>
            <h2>Próximas programações</h2>
            <p>Visualize todos os compromissos cadastrados na agenda oficial.</p>
          </div>
          <div className="agenda-calendario__legenda">
            <span><b className="publico" /> Evento público</span>
            <span><b className="interno" /> Organização interna</span>
          </div>
        </header>

        <div className="agenda-calendario__moldura">
          <iframe
            src="https://calendar.google.com/calendar/embed?src=midia%40adjacare.org&ctz=America%2FSao_Paulo"
            width="100%"
            height="680"
            loading="lazy"
            title="Agenda ADJACARÉ"
          />
        </div>
      </section>
    </main>
  )
}
