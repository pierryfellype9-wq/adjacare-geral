import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function Membros({ user }) {
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        Membros
      </h1>

      <form
        onSubmit={salvarMembro}
        className="grid gap-3 bg-white p-4 rounded-xl shadow"
      >
        <input
          type="text"
          placeholder="Nome"
          value={form.nome}
          onChange={(e) =>
            setForm({ ...form, nome: e.target.value.toUpperCase() })
          }
          className="border p-2 rounded"
          required
        />

        <input
          type="date"
          value={form.data_nascimento}
          onChange={(e) =>
            setForm({ ...form, data_nascimento: e.target.value })
          }
          className="border p-2 rounded"
        />

        <input
          type="text"
          placeholder="Telefone"
          value={form.telefone}
          onChange={(e) =>
            setForm({ ...form, telefone: e.target.value })
          }
          className="border p-2 rounded"
        />

        <select
          value={form.sexo}
          onChange={(e) =>
            setForm({ ...form, sexo: e.target.value })
          }
          className="border p-2 rounded"
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
          className="border p-2 rounded"
        >
          <option value="">Estado civil</option>
          <option value="Solteiro">Solteiro</option>
          <option value="Casado">Casado</option>
          <option value="Divorciado">Divorciado</option>
        </select>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.batizado_aguas}
            onChange={(e) =>
              setForm({
                ...form,
                batizado_aguas: e.target.checked
              })
            }
          />

          Batizado nas águas
        </label>

        <select
          value={form.situacao_cadastral}
          onChange={(e) =>
            setForm({
              ...form,
              situacao_cadastral: e.target.value
            })
          }
          className="border p-2 rounded"
        >
          <option value="Ativo">Ativo</option>
          <option value="Desativado">Desativado</option>
          <option value="Bloqueado">Bloqueado</option>
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
          className="border p-2 rounded"
        />

        <button
          type="submit"
          className="bg-black text-white p-2 rounded"
        >
          Salvar membro
        </button>
      </form>

      <div className="mt-6">
        <h2 className="text-xl font-bold mb-3">
          Lista de membros
        </h2>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className="grid gap-3">
            {membros.map((membro) => (
              <div
                key={membro.id}
                className="border rounded-xl p-3 bg-white shadow"
              >
                <p className="font-bold">
                  {membro.nome}
                </p>

                <p>
                  Situação: {membro.situacao_cadastral}
                </p>

                <p>
                  Batizado: {membro.batizado_aguas ? "Sim" : "Não"}
                </p>

                <p className="text-sm text-gray-500">
                  Criado por: {membro.criado_por}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
