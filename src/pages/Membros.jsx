import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function Membros({ user }) {
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtroSituacao, setFiltroSituacao] = useState("Ativo")

  const [form, setForm] = useState({
    nome: "",
    data_nascimento: "",
    telefone: "",
    sexo: "",
    estado_civil: "",
    batizado_aguas: false,
    situacao_cadastral: "Ativo",
    observacao: ""
  })

  async function buscarMembros() {
    setLoading(true)

    const { data, error } = await supabase
      .from("membros")
      .select("*")
      .order("nome")

    if (!error) {
      setMembros(data)
    }

    setLoading(false)
  }

  useEffect(() => {
    buscarMembros()
  }, [])

  async function salvarMembro(e) {
    e.preventDefault()

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

    setForm({
      nome: "",
      data_nascimento: "",
      telefone: "",
      sexo: "",
      estado_civil: "",
      batizado_aguas: false,
      situacao_cadastral: "Ativo",
      observacao: ""
    })

    buscarMembros()
  }

  const membrosFiltrados = membros.filter(
    (membro) => membro.situacao_cadastral === filtroSituacao
  )

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
          <h2>Novo membro</h2>
          <p>Preencha os dados principais do cadastro.</p>
        </div>

        <div className="form-grid-ebd">
          <input
            type="text"
            placeholder="Nome"
            value={form.nome}
            onChange={(e) =>
              setForm({
                ...form,
                nome: e.target.value.toUpperCase()
              })
            }
            required
          />

          <input
            type="date"
            value={form.data_nascimento}
            onChange={(e) =>
              setForm({
                ...form,
                data_nascimento: e.target.value
              })
            }
          />

          <input
            type="text"
            placeholder="Telefone"
            value={form.telefone}
            onChange={(e) =>
              setForm({
                ...form,
                telefone: e.target.value
              })
            }
          />

          <select
            value={form.sexo}
            onChange={(e) =>
              setForm({
                ...form,
                sexo: e.target.value
              })
            }
          >
            <option value="">Sexo</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
          </select>

          <select
            value={form.estado_civil}
            onChange={(e) =>
              setForm({
                ...form,
                estado_civil: e.target.value
              })
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
              setForm({
                ...form,
                situacao_cadastral: e.target.value
              })
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
              setForm({
                ...form,
                observacao: e.target.value
              })
            }
          />
        </div>

        <div className="form-actions">
          <button type="submit">
            Salvar membro
          </button>
        </div>
      </form>

      <div className="list-card">
        <div className="list-header">
          <div>
            <h2>Lista de membros</h2>
            <p>Membros cadastrados no sistema.</p>
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

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className="alunos-grid">
            {membrosFiltrados.map((membro) => (
              <div key={membro.id} className="aluno-card">
                <div className="aluno-card-top">
                  <div>
                    <h3>{membro.nome}</h3>

                    <span className="badge-turma">
                      {membro.situacao_cadastral}
                    </span>
                  </div>
                </div>

                <div className="aluno-info">
                  <p>
                    <strong>Telefone:</strong>{" "}
                    {membro.telefone || "Não informado"}
                  </p>

                  <p>
                    <strong>Sexo:</strong>{" "}
                    {membro.sexo || "Não informado"}
                  </p>

                  <p>
                    <strong>Estado civil:</strong>{" "}
                    {membro.estado_civil || "Não informado"}
                  </p>

                  <p>
                    <strong>Batizado:</strong>{" "}
                    {membro.batizado_aguas ? "Sim" : "Não"}
                  </p>

                  <p>
                    <strong>Criado por:</strong>{" "}
                    {membro.criado_por || "Não informado"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
