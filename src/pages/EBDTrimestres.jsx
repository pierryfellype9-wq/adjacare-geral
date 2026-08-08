import { notificar, confirmarAcao } from "../lib/feedback"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import "./EBDInternas.css"

export default function EBDTrimestres({ user }) {
  const navigate = useNavigate()
  const usuario = user || JSON.parse(localStorage.getItem("user") || "{}")

  const [turmas, setTurmas] = useState([])
  const [trimestres, setTrimestres] = useState([])
  const [trimestreAberto, setTrimestreAberto] = useState(null)
  const [licoes, setLicoes] = useState([])

  const [turmaId, setTurmaId] = useState("")
  const [nome, setNome] = useState("")
  const [ano, setAno] = useState("2026")
  const [numero, setNumero] = useState("3")
  const [dataInicio, setDataInicio] = useState("2026-07-05")
  const [dataFim, setDataFim] = useState("2026-09-27")
  const [revista, setRevista] = useState("")
  const [observacao, setObservacao] = useState("")
  const [status, setStatus] = useState("ativo")
  const [editandoTrimestreId, setEditandoTrimestreId] = useState(null)

  const podeVerTudo =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    usuario?.turma_ebd === "Superintendente"

  const turmasPermitidas = Array.isArray(usuario?.turmas_ebd)
    ? usuario.turmas_ebd
    : []

  const temAcessoEBD = podeVerTudo || turmasPermitidas.length > 0
  const podeEscolherTurma = podeVerTudo || turmasPermitidas.length > 1

  useEffect(() => {
    if (temAcessoEBD) carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaId) {
      carregarTrimestres()
      setTrimestreAberto(null)
      setLicoes([])
    }
  }, [turmaId])

  function usuarioPodeAcessarTurma(idTurma) {
    if (podeVerTudo) return true
    return turmasPermitidas.includes(idTurma)
  }

  async function carregarTurmas() {
    const { data, error } = await supabase
      .from("ebd_turmas")
      .select("*")
      .order("idade_min", { ascending: true })

    if (error) {
      notificar("Erro ao carregar turmas.")
      console.log(error)
      return
    }

    if (podeVerTudo) {
      setTurmas(data || [])
      return
    }

    const minhasTurmas = (data || []).filter((turma) =>
      turmasPermitidas.includes(turma.id)
    )

    setTurmas(minhasTurmas)

    if (minhasTurmas.length === 1) {
      setTurmaId(minhasTurmas[0].id)
    }
  }

  async function carregarTrimestres() {
    if (!usuarioPodeAcessarTurma(turmaId)) {
      notificar("Você não possui acesso a essa turma.")
      setTurmaId("")
      return
    }

    const { data, error } = await supabase
      .from("ebd_trimestres")
      .select("*")
      .eq("turma_id", turmaId)
      .order("ano", { ascending: false })
      .order("numero", { ascending: false })

    if (error) {
      notificar("Erro ao carregar trimestres.")
      console.log(error)
      return
    }

    setTrimestres(data || [])
  }

  async function salvarTrimestre(e) {
    e.preventDefault()

    if (!turmaId) {
      notificar("Selecione uma turma.")
      return
    }

    if (!usuarioPodeAcessarTurma(turmaId)) {
      notificar("Você não possui acesso a essa turma.")
      return
    }

    if (!nome || !ano || !numero || !dataInicio || !dataFim) {
      notificar("Preencha os campos obrigatórios.")
      return
    }

    const dados = {
      turma_id: turmaId,
      nome,
      ano: Number(ano),
      numero: Number(numero),
      data_inicio: dataInicio,
      data_fim: dataFim,
      status,
      revista: revista || null,
      observacao: observacao || null,
    }

    let error

    if (editandoTrimestreId) {
      const resposta = await supabase
        .from("ebd_trimestres")
        .update(dados)
        .eq("id", editandoTrimestreId)

      error = resposta.error
    } else {
      const resposta = await supabase.from("ebd_trimestres").insert(dados)
      error = resposta.error
    }

    if (error) {
      notificar(editandoTrimestreId ? "Erro ao editar trimestre." : "Erro ao criar trimestre.")
      console.log(error)
      return
    }

    limparFormulario()
    carregarTrimestres()
  }

  function iniciarEdicaoTrimestre(trimestre) {
    if (!usuarioPodeAcessarTurma(trimestre.turma_id)) {
      notificar("Você não possui acesso a essa turma.")
      return
    }

    setEditandoTrimestreId(trimestre.id)
    setTurmaId(trimestre.turma_id)
    setNome(trimestre.nome || "")
    setAno(String(trimestre.ano || "2026"))
    setNumero(String(trimestre.numero || "3"))
    setDataInicio(trimestre.data_inicio || "")
    setDataFim(trimestre.data_fim || "")
    setRevista(trimestre.revista || "")
    setObservacao(trimestre.observacao || "")
    setStatus(trimestre.status || "ativo")

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function limparFormulario() {
    setNome("")
    setAno("2026")
    setNumero("3")
    setDataInicio("2026-07-05")
    setDataFim("2026-09-27")
    setRevista("")
    setObservacao("")
    setStatus("ativo")
    setEditandoTrimestreId(null)
  }

  async function excluirTrimestre(trimestre) {
    if (!usuarioPodeAcessarTurma(trimestre.turma_id)) {
      notificar("Você não possui acesso a essa turma.")
      return
    }

    if (
      !await confirmarAcao(
        "Deseja excluir este trimestre? As lições dele também serão removidas."
      )
    ) {
      return
    }

    const { error } = await supabase
      .from("ebd_trimestres")
      .delete()
      .eq("id", trimestre.id)

    if (error) {
      notificar("Erro ao excluir trimestre.")
      console.log(error)
      return
    }

    if (editandoTrimestreId === trimestre.id) limparFormulario()

    setTrimestreAberto(null)
    setLicoes([])
    carregarTrimestres()
  }

  async function abrirTrimestre(trimestre) {
    if (!usuarioPodeAcessarTurma(trimestre.turma_id)) {
      notificar("Você não possui acesso a essa turma.")
      return
    }

    setTrimestreAberto(trimestre)

    const { data, error } = await supabase
      .from("ebd_aulas")
      .select("*")
      .eq("trimestre_id", trimestre.id)
      .order("numero_licao", { ascending: true })

    if (error) {
      notificar("Erro ao carregar lições.")
      console.log(error)
      return
    }

    setLicoes(data || [])

    setTimeout(() => {
      const bloco = document.getElementById("licoes-trimestre")
      if (bloco) {
        bloco.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }, 100)
  }

  async function gerarLicoesPadrao(trimestre) {
    if (!usuarioPodeAcessarTurma(trimestre.turma_id)) {
      notificar("Você não possui acesso a essa turma.")
      return
    }

    const datas3Tri2026 = [
      "2026-07-05",
      "2026-07-12",
      "2026-07-19",
      "2026-07-26",
      "2026-08-02",
      "2026-08-09",
      "2026-08-16",
      "2026-08-23",
      "2026-08-30",
      "2026-09-06",
      "2026-09-13",
      "2026-09-20",
      "2026-09-27",
    ]

    const registros = datas3Tri2026.map((data, index) => ({
      turma_id: trimestre.turma_id,
      trimestre_id: trimestre.id,
      numero_licao: index + 1,
      data,
      tema: "",
      revista: trimestre.revista || null,
    }))

    const { error } = await supabase.from("ebd_aulas").insert(registros)

    if (error) {
      notificar("Erro ao gerar lições. Talvez elas já existam.")
      console.log(error)
      return
    }

    abrirTrimestre(trimestre)
  }

  async function atualizarLicao(id, campo, valor) {
    setLicoes((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [campo]: valor } : l))
    )
  }

  async function salvarLicao(licao) {
    if (trimestreAberto && !usuarioPodeAcessarTurma(trimestreAberto.turma_id)) {
      notificar("Você não possui acesso a essa turma.")
      return
    }

    const { error } = await supabase
      .from("ebd_aulas")
      .update({
        data: licao.data,
        tema: licao.tema || null,
        versiculo_chave: licao.versiculo_chave || null,
        leitura_biblica: licao.leitura_biblica || null,
        revista: licao.revista || null,
        observacao: licao.observacao || null,
      })
      .eq("id", licao.id)

    if (error) {
      notificar("Erro ao salvar lição.")
      console.log(error)
      return
    }

    notificar("Lição salva com sucesso!")
  }

  function formatarData(data) {
    if (!data) return ""
    const [ano, mes, dia] = data.split("-")
    return `${dia}/${mes}/${ano}`
  }

  if (!temAcessoEBD) {
    return (
      <div className="page ebd-subpage">
        <button className="btn-voltar" onClick={() => navigate("/ebd")}>
          ← Voltar
        </button>

        <div className="form-card">
          <h2>Acesso não permitido</h2>
          <p>Você não possui permissão para acessar os trimestres da EBD.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page ebd-subpage ebd-subpage--trimestres">
      <button className="btn-voltar" onClick={() => navigate("/ebd")}>
        ← Voltar
      </button>

      <h1>Trimestres da EBD</h1>

      <div className="form-card">
        <h2>{editandoTrimestreId ? "Editar trimestre" : "Novo trimestre"}</h2>

        <form onSubmit={salvarTrimestre}>
          <label>Turma</label>
          <select
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            disabled={!podeEscolherTurma || !!editandoTrimestreId}
          >
            <option value="">Selecione</option>
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome}
              </option>
            ))}
          </select>

          {!podeVerTudo && (
            <small
              style={{
                color: "#6b7280",
                display: "block",
                marginTop: 6,
                marginBottom: 10,
              }}
            >
              Você possui acesso a {turmasPermitidas.length} turma
              {turmasPermitidas.length > 1 ? "s" : ""}.
            </small>
          )}

          <label>Nome do trimestre</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: 3º Trimestre de 2026"
          />

          <label>Ano</label>
          <input
            type="number"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
          />

          <label>Número do trimestre</label>
          <select value={numero} onChange={(e) => setNumero(e.target.value)}>
            <option value="1">1º Trimestre</option>
            <option value="2">2º Trimestre</option>
            <option value="3">3º Trimestre</option>
            <option value="4">4º Trimestre</option>
          </select>

          <label>Data inicial</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />

          <label>Data final</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />

          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ativo">Ativo</option>
            <option value="encerrado">Encerrado</option>
          </select>

          <label>Revista utilizada</label>
          <input
            value={revista}
            onChange={(e) => setRevista(e.target.value)}
            placeholder="Ex: O Tempo dos Juízes"
          />

          <label>Observação</label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Observações internas"
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button>{editandoTrimestreId ? "Salvar alterações" : "Criar trimestre"}</button>

            {editandoTrimestreId && (
              <button
                type="button"
                onClick={limparFormulario}
                style={{ background: "#6b7280" }}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="list-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Trimestres cadastrados</h2>
            <p style={{ margin: "6px 0 0", color: "#64748b" }}>
              Gerencie os trimestres e as lições da turma selecionada.
            </p>
          </div>

          <span
            style={{
              background: "#eff6ff",
              color: "#1d4ed8",
              padding: "7px 12px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: "700",
            }}
          >
            {trimestres.length} trimestre{trimestres.length !== 1 ? "s" : ""}
          </span>
        </div>

        {!turmaId && (
          <div
            style={{
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: "16px",
              padding: "24px",
              color: "#64748b",
            }}
          >
            Selecione uma turma para visualizar os trimestres.
          </div>
        )}

        {turmaId && trimestres.length === 0 && (
          <div
            style={{
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: "16px",
              padding: "24px",
              color: "#64748b",
            }}
          >
            Nenhum trimestre cadastrado.
          </div>
        )}

        <div style={{ display: "grid", gap: "14px" }}>
          {trimestres.map((tri) => (
            <div
              key={tri.id}
              style={{
                background: "#f8fafc",
                border: "1px solid #e5e7eb",
                borderRadius: "18px",
                padding: "18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "18px",
                flexWrap: "wrap",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div style={{ minWidth: "260px", flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginBottom: "10px",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      color: "#111827",
                      fontSize: "20px",
                      fontWeight: "800",
                    }}
                  >
                    {tri.nome}
                  </h3>

                  <span
                    style={{
                      padding: "5px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: "800",
                      background:
                        tri.status === "ativo" ? "#dcfce7" : "#fee2e2",
                      color: tri.status === "ativo" ? "#166534" : "#991b1b",
                    }}
                  >
                    {tri.status === "ativo" ? "Ativo" : "Encerrado"}
                  </span>
                </div>

                <p style={{ margin: "0 0 6px", color: "#64748b" }}>
                  📅 {formatarData(tri.data_inicio)} até{" "}
                  {formatarData(tri.data_fim)}
                </p>

                <p style={{ margin: "0 0 6px", color: "#64748b" }}>
                  📖 Revista: {tri.revista || "Não informada"}
                </p>

                {tri.observacao && (
                  <p style={{ margin: 0, color: "#64748b" }}>
                    📝 {tri.observacao}
                  </p>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <button onClick={() => abrirTrimestre(tri)}>
                  Abrir lições
                </button>

                <button
                  type="button"
                  onClick={() => iniciarEdicaoTrimestre(tri)}
                  style={{ background: "#2563eb" }}
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => excluirTrimestre(tri)}
                  style={{ background: "#ef4444" }}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {trimestreAberto && (
        <div className="list-card" id="licoes-trimestre">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>{trimestreAberto.nome}</h2>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                Gerencie as lições, datas e temas deste trimestre.
              </p>
            </div>

            <span
              style={{
                background: "#fef3c7",
                color: "#92400e",
                padding: "7px 12px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: "700",
              }}
            >
              {licoes.length} lição{licoes.length !== 1 ? "ões" : ""}
            </span>
          </div>

          {licoes.length === 0 && (
            <div
              style={{
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: "16px",
                padding: "24px",
              }}
            >
              <p style={{ marginTop: 0, color: "#64748b" }}>
                Nenhuma lição cadastrada ainda.
              </p>

              <button onClick={() => gerarLicoesPadrao(trimestreAberto)}>
                Gerar 13 lições do 3º trimestre de 2026
              </button>
            </div>
          )}

          {licoes.length > 0 && (
            <div style={{ display: "grid", gap: "14px" }}>
              {licoes.map((licao) => (
                <div
                  key={licao.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "18px",
                    padding: "18px",
                    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>
                    Lição {String(licao.numero_licao).padStart(2, "0")}
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <label>Data</label>
                      <input
                        type="date"
                        value={licao.data || ""}
                        onChange={(e) =>
                          atualizarLicao(licao.id, "data", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label>Tema</label>
                      <input
                        value={licao.tema || ""}
                        onChange={(e) =>
                          atualizarLicao(licao.id, "tema", e.target.value)
                        }
                        placeholder="Tema da lição"
                      />
                    </div>

                    <div>
                      <label>Versículo-chave</label>
                      <input
                        value={licao.versiculo_chave || ""}
                        onChange={(e) =>
                          atualizarLicao(
                            licao.id,
                            "versiculo_chave",
                            e.target.value
                          )
                        }
                        placeholder="Opcional"
                      />
                    </div>

                    <div>
                      <label>Leitura bíblica</label>
                      <input
                        value={licao.leitura_biblica || ""}
                        onChange={(e) =>
                          atualizarLicao(
                            licao.id,
                            "leitura_biblica",
                            e.target.value
                          )
                        }
                        placeholder="Opcional"
                      />
                    </div>

                    <div>
                      <label>Revista</label>
                      <input
                        value={licao.revista || ""}
                        onChange={(e) =>
                          atualizarLicao(licao.id, "revista", e.target.value)
                        }
                        placeholder="Opcional"
                      />
                    </div>

                    <div>
                      <label>Observação</label>
                      <input
                        value={licao.observacao || ""}
                        onChange={(e) =>
                          atualizarLicao(
                            licao.id,
                            "observacao",
                            e.target.value
                          )
                        }
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: "14px" }}>
                    <button onClick={() => salvarLicao(licao)}>
                      Salvar lição
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
