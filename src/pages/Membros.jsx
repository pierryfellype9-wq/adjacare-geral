import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function Membros({ user }) {
  const navigate = useNavigate()

  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtroSituacao, setFiltroSituacao] = useState("Ativo")
  const [editandoId, setEditandoId] = useState(null)
  const [pesquisa, setPesquisa] = useState("")
  const [limite, setLimite] = useState(12)

  const formLimpo = {
    nome: "",
    data_nascimento: "",
    telefone: "",
    sexo: "",
    estado_civil: "",
    batizado_aguas: false,
    situacao_cadastral: "Ativo",
    observacao: "",
  }

  const [form, setForm] = useState(formLimpo)

  async function buscarMembros() {
    setLoading(true)

    const { data, error } = await supabase
      .from("membros")
      .select("*")
      .order("nome")

    if (!error) setMembros(data || [])

    setLoading(false)
  }

  useEffect(() => {
    buscarMembros()
  }, [])

  function limparFormulario() {
    setForm(formLimpo)
    setEditandoId(null)
  }

  async function salvarMembro(e) {
    e.preventDefault()

    if (editandoId) {
      const { error } = await supabase
        .from("membros")
        .update(form)
        .eq("id", editandoId)

      if (error) {
        alert("Erro ao atualizar membro")
        return
      }

      alert("Membro atualizado!")
    } else {
      const { error } = await supabase
        .from("membros")
        .insert([
          {
            ...form,
            criado_por: user?.nome || user?.email
          }
        ])

      if (error) {
        alert("Erro ao salvar membro")
        return
      }

      alert("Membro cadastrado!")
    }

    limparFormulario()
    buscarMembros()
  }

  function editarMembro(membro) {
    setEditandoId(membro.id)

    setForm({
      nome: membro.nome || "",
      data_nascimento: membro.data_nascimento || "",
      telefone: membro.telefone || "",
      sexo: membro.sexo || "",
      estado_civil: membro.estado_civil || "",
      batizado_aguas: membro.batizado_aguas || false,
      situacao_cadastral: membro.situacao_cadastral || "Ativo",
      observacao: membro.observacao || "",
    })

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function criarAcesso(membro) {
    localStorage.setItem("membroSelecionado", JSON.stringify(membro))
    navigate("/usuarios")
  }

  function formatarData(data) {
    if (!data) return "Não informado"
    return data.split("-").reverse().join("/")
  }

  const membrosDaSituacao = membros.filter(
    (membro) => membro.situacao_cadastral === filtroSituacao
  )

  const membrosFiltrados = membrosDaSituacao
    .filter((membro) =>
      membro.nome?.toLowerCase().includes(pesquisa.toLowerCase())
    )
    .slice(0, limite)

  return (
    <div className="page">
      <div className="ebd-header">
        <div>
          <h1>Membros</h1>
          <p>Cadastro geral dos membros da igreja.</p>
        </div>
      </div>

      <form onSubmit={salvarMembro} className="form-card">
        <div className="form-title-row">
          <h2>{editandoId ? "Editar membro" : "Novo membro"}</h2>
          <p>Preencha os dados principais do cadastro.</p>
        </div>

        <div className="form-grid-ebd">
          <input
            type="text"
            placeholder="Nome"
            value={form.nome}
            onChange={(e) =>
              setForm({ ...form, nome: e.target.value.toUpperCase() })
            }
            required
          />

          <input
            type="date"
            value={form.data_nascimento}
            onChange={(e) =>
              setForm({ ...form, data_nascimento: e.target.value })
            }
          />

          <input
            type="text"
            placeholder="Telefone"
            value={form.telefone}
            onChange={(e) =>
              setForm({ ...form, telefone: e.target.value })
            }
          />

          <select
            value={form.sexo}
            onChange={(e) =>
              setForm({ ...form, sexo: e.target.value })
            }
          >
            <option value="">Sexo</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
          </select>

          <select
            value={form.estado_civil}
            onChange={(e) =>
              setForm({ ...form, estado_civil: e.target.value })
            }
          >
            <option value="">Estado civil</option>
            <option value="Solteiro">Solteiro</option>
            <option value="Casado">Casado</option>
            <option value="Divorciado">Divorciado</option>
          </select>

          <select
            value={form.situacao_cadastral}
            onChange={(e) =>
              setForm({ ...form, situacao_cadastral: e.target.value })
            }
          >
            <option value="Ativo">Ativo</option>
            <option value="Desativado">Desativado</option>
            <option value="Bloqueado">Bloqueado</option>
          </select>

          <select
            value={form.batizado_aguas ? "Sim" : "Não"}
            onChange={(e) =>
              setForm({
                ...form,
                batizado_aguas: e.target.value === "Sim"
              })
            }
          >
            <option value="Não">Batizado nas águas? Não</option>
            <option value="Sim">Batizado nas águas? Sim</option>
          </select>

          <textarea
            placeholder="Observação"
            value={form.observacao}
            onChange={(e) =>
              setForm({ ...form, observacao: e.target.value })
            }
          />
        </div>

        <div className="form-actions">
          <button type="submit">
            {editandoId ? "Salvar alterações" : "Salvar membro"}
          </button>

          {editandoId && (
            <button
              type="button"
              className="btn-secundario"
              onClick={limparFormulario}
            >
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      <div className="list-card">
        <div className="list-header">
          <div>
            <h2>Lista de membros</h2>
            <p>
              Total geral: <strong>{membros.length}</strong> membros •{" "}
              Exibindo: <strong>{membrosFiltrados.length}</strong> de{" "}
              <strong>{membrosDaSituacao.length}</strong>
            </p>
          </div>
        </div>

        <div className="form-actions" style={{ marginBottom: "18px" }}>
          <button
            type="button"
            onClick={() => setFiltroSituacao("Ativo")}
            className={filtroSituacao === "Ativo" ? "" : "btn-secundario"}
          >
            Ativos
          </button>

          <button
            type="button"
            onClick={() => setFiltroSituacao("Desativado")}
            className={filtroSituacao === "Desativado" ? "" : "btn-secundario"}
          >
            Desativados
          </button>

          <button
            type="button"
            onClick={() => setFiltroSituacao("Bloqueado")}
            className={filtroSituacao === "Bloqueado" ? "" : "btn-secundario"}
          >
            Bloqueados
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "20px"
          }}
        >
          <input
            type="text"
            placeholder="Pesquisar membro..."
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            style={{ maxWidth: "320px" }}
          />

          <select
            value={limite}
            onChange={(e) => setLimite(Number(e.target.value))}
            style={{ maxWidth: "150px" }}
          >
            <option value={12}>12 membros</option>
            <option value={24}>24 membros</option>
            <option value={50}>50 membros</option>
            <option value={100}>100 membros</option>
            <option value={99999}>Todos</option>
          </select>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className="membros-grid">
            {membrosFiltrados.map((membro) => (
              <div key={membro.id} className="membro-card">
                <div className="membro-card-top">
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "58px",
                        height: "58px",
                        borderRadius: "50%",
                        background: "#dbeafe",
                        color: "#1d4ed8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "800"
                      }}
                    >
                      {membro.nome?.charAt(0)}
                    </div>

                    <div>
                      <h3>{membro.nome}</h3>
                      <span className="badge-turma">
                        {membro.situacao_cadastral}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="membro-info">
                  <p><strong>Nascimento:</strong> {formatarData(membro.data_nascimento)}</p>
                  <p><strong>Telefone:</strong> {membro.telefone || "Não informado"}</p>
                  <p><strong>Sexo:</strong> {membro.sexo || "Não informado"}</p>
                  <p><strong>Estado civil:</strong> {membro.estado_civil || "Não informado"}</p>
                  <p><strong>Batizado:</strong> {membro.batizado_aguas ? "Sim" : "Não"}</p>
                  <p><strong>Criado por:</strong> {membro.criado_por || "Não informado"}</p>
                </div>

                <div className="form-actions" style={{ marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => editarMembro(membro)}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    className="btn-secundario"
                    onClick={() => criarAcesso(membro)}
                  >
                    Criar acesso
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
