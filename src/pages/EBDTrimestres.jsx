import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

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

  const podeVerTudo =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    (usuario?.role === "EBD" && usuario?.turma_ebd === "Superintendente")

  const temAcessoEBD =
    podeVerTudo ||
    (usuario?.turma_ebd &&
      usuario?.turma_ebd !== "Não permitido" &&
      usuario?.turma_ebd !== "Superintendente")

  useEffect(() => {
    if (temAcessoEBD) carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaId) carregarTrimestres()
  }, [turmaId])

  async function carregarTurmas() {
    const { data, error } = await supabase
      .from("ebd_turmas")
      .select("*")
      .order("idade_min", { ascending: true })

    if (error) {
      alert("Erro ao carregar turmas.")
      console.log(error)
      return
    }

    setTurmas(data || [])

    if (!podeVerTudo && usuario?.turma_ebd) {
      const turmaDoProfessor = data?.find((t) => t.nome === usuario.turma_ebd)
      if (turmaDoProfessor) {
        setTurmaId(turmaDoProfessor.id)
      }
    }
  }

  async function carregarTrimestres() {
    const { data, error } = await supabase
      .from("ebd_trimestres")
      .select("*")
      .eq("turma_id", turmaId)
      .order("ano", { ascending: false })
      .order("numero", { ascending: false })

    if (error) {
      alert("Erro ao carregar trimestres.")
      console.log(error)
      return
    }

    setTrimestres(data || [])
  }

  async function salvarTrimestre(e) {
    e.preventDefault()

    if (!turmaId) {
      alert("Selecione uma turma.")
      return
    }

    if (!nome || !ano || !numero || !dataInicio || !dataFim) {
      alert("Preencha os campos obrigatórios.")
      return
    }

    const { error } = await supabase.from("ebd_trimestres").insert({
      turma_id: turmaId,
      nome,
      ano: Number(ano),
      numero: Number(numero),
      data_inicio: dataInicio,
      data_fim: dataFim,
      status,
      revista: revista || null,
      observacao: observacao || null,
    })

    if (error) {
      alert("Erro ao criar trimestre.")
      console.log(error)
      return
    }

    limparFormulario()
    carregarTrimestres()
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
  }

  async function excluirTrimestre(id) {
    if (!confirm("Deseja excluir este trimestre? As lições dele também serão removidas.")) {
      return
    }

    const { error } = await supabase
      .from("ebd_trimestres")
      .delete()
      .eq("id", id)

    if (error) {
      alert("Erro ao excluir trimestre.")
      console.log(error)
      return
    }

    setTrimestreAberto(null)
    setLicoes([])
    carregarTrimestres()
  }

  async function abrirTrimestre(trimestre) {
    setTrimestreAberto(trimestre)

    const { data, error } = await supabase
      .from("ebd_aulas")
      .select("*")
      .eq("trimestre_id", trimestre.id)
      .order("numero_licao", { ascending: true })

    if (error) {
      alert("Erro ao carregar lições.")
      console.log(error)
      return
    }

    setLicoes(data || [])
  }

  async function gerarLicoesPadrao(trimestre) {
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
      alert("Erro ao gerar lições. Talvez elas já existam.")
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
      alert("Erro ao salvar lição.")
      console.log(error)
      return
    }

    alert("Lição salva com sucesso!")
  }

  if (!temAcessoEBD) {
    return (
      <div className="page">
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
    <div className="page">
      <button className="btn-voltar" onClick={() => navigate("/ebd")}>
        ← Voltar
      </button>

      <h1>Trimestres da EBD</h1>

      <div className="form-card">
        <h2>Novo trimestre</h2>

        <form onSubmit={salvarTrimestre}>
          <label>Turma</label>
          <select
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            disabled={!podeVerTudo}
          >
            <option value="">Selecione</option>
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome}
              </option>
            ))}
          </select>

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
            placeholder="Ex: Juniores - 3º Trimestre de 2026"
          />

          <label>Observação</label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Observações internas"
          />

          <button>Criar trimestre</button>
        </form>
      </div>

      <div className="list-card">
        <h2>Trimestres cadastrados</h2>

        {trimestres.length === 0 && <p>Nenhum trimestre cadastrado.</p>}

        {trimestres.map((tri) => (
          <div key={tri.id} className="chamada-item">
            <div>
              <strong>{tri.nome}</strong>
              <p style={{ margin: "6px 0", color: "#6b7280" }}>
                {tri.data_inicio} até {tri.data_fim} • {tri.status}
              </p>
              {tri.revista && (
                <p style={{ margin: 0, color: "#6b7280" }}>
                  Revista: {tri.revista}
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={() => abrirTrimestre(tri)}>Abrir</button>

              <button
                type="button"
                onClick={() => excluirTrimestre(tri.id)}
                style={{ background: "#ef4444" }}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {trimestreAberto && (
        <div className="list-card">
          <h2>{trimestreAberto.nome}</h2>

          <p style={{ color: "#6b7280" }}>
            Gerencie as lições deste trimestre.
          </p>

          {licoes.length === 0 && (
            <>
              <p>Nenhuma lição cadastrada ainda.</p>

              <button onClick={() => gerarLicoesPadrao(trimestreAberto)}>
                Gerar 13 lições do 3º trimestre de 2026
              </button>
            </>
          )}

          {licoes.map((licao) => (
            <div key={licao.id} className="form-card" style={{ marginTop: "16px" }}>
              <h3>
                Lição {String(licao.numero_licao).padStart(2, "0")}
              </h3>

              <label>Data</label>
              <input
                type="date"
                value={licao.data || ""}
                onChange={(e) =>
                  atualizarLicao(licao.id, "data", e.target.value)
                }
              />

              <label>Tema</label>
              <input
                value={licao.tema || ""}
                onChange={(e) =>
                  atualizarLicao(licao.id, "tema", e.target.value)
                }
                placeholder="Tema da lição"
              />

              <label>Versículo-chave</label>
              <input
                value={licao.versiculo_chave || ""}
                onChange={(e) =>
                  atualizarLicao(licao.id, "versiculo_chave", e.target.value)
                }
                placeholder="Opcional"
              />

              <label>Leitura bíblica</label>
              <input
                value={licao.leitura_biblica || ""}
                onChange={(e) =>
                  atualizarLicao(licao.id, "leitura_biblica", e.target.value)
                }
                placeholder="Opcional"
              />

              <label>Revista</label>
              <input
                value={licao.revista || ""}
                onChange={(e) =>
                  atualizarLicao(licao.id, "revista", e.target.value)
                }
                placeholder="Opcional"
              />

              <label>Observação</label>
              <textarea
                value={licao.observacao || ""}
                onChange={(e) =>
                  atualizarLicao(licao.id, "observacao", e.target.value)
                }
                placeholder="Opcional"
              />

              <button onClick={() => salvarLicao(licao)}>
                Salvar lição
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
