import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"
import "./EscalaMidia.css"

const FUNCOES = [
  { campo: "projecao", nome: "Projeção", icone: "▣", classe: "projecao" },
  { campo: "video", nome: "Vídeo", icone: "▶", classe: "video" },
  { campo: "story", nome: "Stories", icone: "◫", classe: "story" },
  { campo: "fotos", nome: "Fotografia", icone: "●", classe: "fotos" },
]

function formatarData(data) {
  if (!data) return { dia: "--", mes: "---", semana: "" }
  const valor = new Date(`${data}T12:00:00`)
  return {
    dia: new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(valor),
    mes: new Intl.DateTimeFormat("pt-BR", { month: "short" })
      .format(valor)
      .replace(".", "")
      .toUpperCase(),
    semana: new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(valor),
    completa: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(valor),
  }
}

function hojeISO() {
  const agora = new Date()
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export default function EscalaMidia({ user }) {
  const [data, setData] = useState("")
  const [evento, setEvento] = useState("")
  const [projecao, setProjecao] = useState("")
  const [video, setVideo] = useState("")
  const [story, setStory] = useState("")
  const [fotos, setFotos] = useState("")
  const [observacao, setObservacao] = useState("")
  const [editandoId, setEditandoId] = useState(null)
  const [escalas, setEscalas] = useState([])
  const [aba, setAba] = useState("ativas")
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [busca, setBusca] = useState("")

  useEffect(() => {
    carregarEscalas()
  }, [aba])

  async function carregarEscalas() {
    setCarregando(true)
    const arquivado = aba === "arquivadas"
    const { data: registros, error } = await supabase
      .from("escala_midia")
      .select("*")
      .eq("arquivado", arquivado)
      .order("data", { ascending: aba !== "arquivadas" })

    if (error) {
      console.error("Erro ao carregar escalas:", error)
      setEscalas([])
    } else {
      setEscalas(registros || [])
    }
    setCarregando(false)
  }

  async function enviarEmailEscala() {
    try {
      await fetch("/api/enviar-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assunto: "Atualização de escala da mídia - ADJACARÉ",
          mensagem: `
            <h2>Escala da mídia atualizada</h2>
            <p><b>Data:</b> ${data}</p>
            <p><b>Evento:</b> ${evento || "Culto"}</p>
            <hr>
            <p><b>Projeção:</b> ${projecao || "-"}</p>
            <p><b>Vídeo:</b> ${video || "-"}</p>
            <p><b>Stories:</b> ${story || "-"}</p>
            <p><b>Fotografia:</b> ${fotos || "-"}</p>
            ${observacao ? `<p><b>Observação:</b> ${observacao}</p>` : ""}
            <br>
            <p>Atualizado por: ${user?.nome}</p>
          `,
        }),
      })
    } catch (error) {
      console.error("Erro ao enviar e-mail da escala:", error)
    }
  }

  function limparFormulario() {
    setData("")
    setEvento("")
    setProjecao("")
    setVideo("")
    setStory("")
    setFotos("")
    setObservacao("")
    setEditandoId(null)
  }

  async function salvarEscala(eventoForm) {
    eventoForm.preventDefault()
    if (!data || salvando) return
    setSalvando(true)

    try {
      const payload = {
        data,
        evento: evento.trim(),
        projecao: projecao.trim(),
        video: video.trim(),
        story: story.trim(),
        fotos: fotos.trim(),
        observacao: observacao.trim(),
      }

      if (editandoId) {
        const { error } = await supabase
          .from("escala_midia")
          .update(payload)
          .eq("id", editandoId)
        if (error) throw error
      } else {
        const { data: existente } = await supabase
          .from("escala_midia")
          .select("id")
          .eq("data", data)
          .maybeSingle()

        if (existente) {
          alert("Já existe uma escala cadastrada para essa data.")
          return
        }

        const { error } = await supabase.from("escala_midia").insert([{
          ...payload,
          criado_por: user?.nome,
          departamento: user?.role,
          arquivado: false,
        }])
        if (error) throw error
      }

      await enviarEmailEscala()
      const mensagem = editandoId ? "Escala atualizada!" : "Escala salva com sucesso!"
      limparFormulario()
      setFormularioAberto(false)
      await carregarEscalas()
      alert(mensagem)
    } catch (error) {
      console.error("Erro ao salvar escala:", error)
      alert("Não foi possível salvar a escala.")
    } finally {
      setSalvando(false)
    }
  }

  function editar(escala) {
    setEditandoId(escala.id)
    setData(escala.data)
    setEvento(escala.evento || "")
    setProjecao(escala.projecao || "")
    setVideo(escala.video || "")
    setStory(escala.story || "")
    setFotos(escala.fotos || "")
    setObservacao(escala.observacao || "")
    setFormularioAberto(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function arquivar(id) {
    if (!confirm("Arquivar esta escala?")) return
    const { error } = await supabase
      .from("escala_midia")
      .update({ arquivado: true })
      .eq("id", id)

    if (error) {
      alert("Não foi possível arquivar a escala.")
      return
    }
    await carregarEscalas()
  }

  async function restaurar(id) {
    const { error } = await supabase
      .from("escala_midia")
      .update({ arquivado: false })
      .eq("id", id)

    if (error) {
      alert("Não foi possível restaurar a escala.")
      return
    }
    await carregarEscalas()
  }

  const escalasFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR")
    if (!termo) return escalas
    return escalas.filter((escala) =>
      [
        escala.evento,
        escala.projecao,
        escala.video,
        escala.story,
        escala.fotos,
        escala.observacao,
      ].join(" ").toLocaleLowerCase("pt-BR").includes(termo)
    )
  }, [escalas, busca])

  const resumo = useMemo(() => {
    const hoje = hojeISO()
    const futuras = escalas.filter((escala) => escala.data >= hoje)
    const proxima = futuras[0] || null
    const pessoas = new Set(
      escalas.flatMap((escala) =>
        [escala.projecao, escala.video, escala.story, escala.fotos]
          .filter(Boolean)
          .map((nome) => nome.trim().toLocaleLowerCase("pt-BR"))
      )
    )
    const vagas = escalas.reduce(
      (total, escala) =>
        total + FUNCOES.filter((funcao) => !escala[funcao.campo]?.trim()).length,
      0
    )
    return { futuras: futuras.length, proxima, pessoas: pessoas.size, vagas }
  }, [escalas])

  return (
    <main className="escala-page">
      <section className="escala-hero">
        <div className="escala-hero__texto">
          <span>ORGANIZAÇÃO DA EQUIPE</span>
          <h1>Escala da Mídia</h1>
          <p>
            Prepare cada culto com antecedência e deixe toda a equipe sabendo
            exatamente onde precisa estar.
          </p>
        </div>
        <div className="escala-hero__acoes">
          <button
            type="button"
            onClick={() => {
              limparFormulario()
              setFormularioAberto(true)
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
          >
            <b>＋</b> Nova escala
          </button>
        </div>
        <div className="escala-hero__decoracao" aria-hidden="true">
          <span>●</span><span>▶</span><span>▣</span>
        </div>
      </section>

      <section className="escala-resumo">
        <article>
          <span className="escala-resumo__icone calendario">▦</span>
          <div><small>Próximas escalas</small><strong>{resumo.futuras}</strong></div>
        </article>
        <article>
          <span className="escala-resumo__icone proxima">→</span>
          <div>
            <small>Próximo culto</small>
            <strong>{resumo.proxima ? formatarData(resumo.proxima.data).dia : "—"}</strong>
            <p>{resumo.proxima ? formatarData(resumo.proxima.data).mes : "Sem escala"}</p>
          </div>
        </article>
        <article>
          <span className="escala-resumo__icone equipe">♟</span>
          <div><small>Pessoas escaladas</small><strong>{resumo.pessoas}</strong></div>
        </article>
        <article>
          <span className="escala-resumo__icone vagas">!</span>
          <div><small>Funções em aberto</small><strong>{resumo.vagas}</strong></div>
        </article>
      </section>

      {formularioAberto && (
        <section className="escala-formulario">
          <header>
            <div>
              <span>{editandoId ? "EDITANDO ESCALA" : "NOVA ESCALA"}</span>
              <h2>{editandoId ? "Atualize a equipe deste culto" : "Monte a equipe do culto"}</h2>
              <p>Preencha os responsáveis. Campos ainda indefinidos podem ficar em branco.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                limparFormulario()
                setFormularioAberto(false)
              }}
              aria-label="Fechar formulário"
            >
              ×
            </button>
          </header>

          <form onSubmit={salvarEscala}>
            <div className="escala-formulario__base">
              <label>
                <span>Data do culto</span>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
              </label>
              <label>
                <span>Evento</span>
                <input placeholder="Ex.: Culto de domingo" value={evento} onChange={(e) => setEvento(e.target.value)} />
              </label>
            </div>

            <div className="escala-formulario__funcoes">
              <label className="projecao">
                <b>▣</b><span>Projeção</span>
                <input placeholder="Nome do responsável" value={projecao} onChange={(e) => setProjecao(e.target.value)} />
              </label>
              <label className="video">
                <b>▶</b><span>Vídeo</span>
                <input placeholder="Nome do responsável" value={video} onChange={(e) => setVideo(e.target.value)} />
              </label>
              <label className="story">
                <b>◫</b><span>Stories</span>
                <input placeholder="Nome do responsável" value={story} onChange={(e) => setStory(e.target.value)} />
              </label>
              <label className="fotos">
                <b>●</b><span>Fotografia</span>
                <input placeholder="Nome do responsável" value={fotos} onChange={(e) => setFotos(e.target.value)} />
              </label>
            </div>

            <label className="escala-formulario__observacao">
              <span>Observações para a equipe</span>
              <textarea
                placeholder="Horário de chegada, orientações especiais, troca de equipamento..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </label>

            <footer>
              <p>Responsável pela atualização: <strong>{user?.nome}</strong></p>
              <div>
                <button type="button" className="secundario" onClick={() => {
                  limparFormulario()
                  setFormularioAberto(false)
                }}>
                  Cancelar
                </button>
                <button type="submit" disabled={salvando}>
                  {salvando ? "Salvando..." : editandoId ? "Atualizar escala" : "Salvar escala"}
                </button>
              </div>
            </footer>
          </form>
        </section>
      )}

      <section className="escala-conteudo">
        <header className="escala-conteudo__topo">
          <div>
            <span>PROGRAMAÇÃO</span>
            <h2>{aba === "ativas" ? "Próximas escalas" : "Escalas arquivadas"}</h2>
            <p>
              {escalasFiltradas.length} {escalasFiltradas.length === 1 ? "escala encontrada" : "escalas encontradas"}
            </p>
          </div>
          <div className="escala-tabs">
            <button type="button" className={aba === "ativas" ? "ativo" : ""} onClick={() => setAba("ativas")}>
              Ativas
            </button>
            <button type="button" className={aba === "arquivadas" ? "ativo" : ""} onClick={() => setAba("arquivadas")}>
              Arquivadas
            </button>
          </div>
        </header>

        <div className="escala-busca">
          <span>⌕</span>
          <input
            placeholder="Buscar por evento, pessoa ou observação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="escala-lista">
          {carregando && (
            <div className="escala-vazia"><span>•••</span><h3>Carregando escalas</h3></div>
          )}

          {!carregando && !escalasFiltradas.length && (
            <div className="escala-vazia">
              <span>▦</span>
              <h3>{aba === "ativas" ? "Nenhuma escala cadastrada" : "Nenhuma escala arquivada"}</h3>
              <p>{aba === "ativas" ? "Crie a próxima escala da equipe para começar." : "As escalas arquivadas aparecerão aqui."}</p>
            </div>
          )}

          {escalasFiltradas.map((escala, indice) => {
            const dataEscala = formatarData(escala.data)
            const proxima = aba === "ativas" && indice === 0 && escala.data >= hojeISO()

            return (
              <article className={`escala-card ${proxima ? "escala-card--proxima" : ""}`} key={escala.id}>
                <div className="escala-card__data">
                  <span>{dataEscala.mes}</span>
                  <strong>{dataEscala.dia}</strong>
                  <small>{dataEscala.semana}</small>
                </div>

                <div className="escala-card__conteudo">
                  <header>
                    <div>
                      {proxima && <span className="escala-card__destaque">PRÓXIMA ESCALA</span>}
                      <h3>{escala.evento || "Culto"}</h3>
                      <p>{dataEscala.completa}</p>
                    </div>
                    <div className="escala-card__acoes">
                      {aba === "ativas" ? (
                        <>
                          <button type="button" onClick={() => editar(escala)}>Editar</button>
                          <button type="button" className="secundario" onClick={() => arquivar(escala.id)}>Arquivar</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => restaurar(escala.id)}>Restaurar</button>
                      )}
                    </div>
                  </header>

                  <div className="escala-card__equipe">
                    {FUNCOES.map((funcao) => (
                      <div className={funcao.classe} key={funcao.campo}>
                        <span>{funcao.icone}</span>
                        <p><small>{funcao.nome}</small><strong>{escala[funcao.campo] || "A definir"}</strong></p>
                      </div>
                    ))}
                  </div>

                  {escala.observacao && (
                    <div className="escala-card__observacao">
                      <span>i</span>
                      <p>{escala.observacao}</p>
                    </div>
                  )}

                  <footer>
                    Atualizada por <strong>{escala.criado_por || "Equipe da mídia"}</strong>
                    {escala.departamento && <> • {escala.departamento}</>}
                  </footer>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
