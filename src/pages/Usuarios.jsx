import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export default function Usuarios({ user }) {
  const [usuarios, setUsuarios] = useState([])

  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [role, setRole] = useState("")

  const [editando, setEditando] = useState(false)
  const [usuarioId, setUsuarioId] = useState(null)

  function normalizarTexto(valor) {
    return (valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
  }

  function obterUsuarioLocalStorage() {
    const chavesPossiveis = ["user", "usuario", "usuarioLogado", "adjacare_user"]

    for (const chave of chavesPossiveis) {
      try {
        const bruto = localStorage.getItem(chave)
        if (!bruto) continue

        const convertido = JSON.parse(bruto)
        if (convertido && typeof convertido === "object") {
          return convertido
        }
      } catch (error) {
        console.log("Erro ao ler localStorage:", error)
      }
    }

    return null
  }

  const usuarioAtual = user || obterUsuarioLocalStorage()

const roleUsuario =
  usuarioAtual?.role ||
  usuarioAtual?.departamento ||
  usuarioAtual?.tipo ||
  ""

const isAdmin = ["administrador", "admin"].includes(
  normalizarTexto(roleUsuario)
)

  const departamentos = [
  "Administrador",
  "Dirigente",
  "Mídia",
  "Recepção",
  "Secretaria",
  "Sonoplastia",
  "Infantil",
  "Adolescentes",
  "Jovens",
  "EBD",
  "Cofemp",
  "Além-mar",
  "Orquestra e coral",
]

  useEffect(() => {
    carregarUsuarios()
  }, [])

  async function carregarUsuarios() {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("nome", { ascending: true })

    if (error) {
      console.log(error)
      return
    }

    setUsuarios(data || [])
  }

  function limparFormulario() {
    setNome("")
    setEmail("")
    setSenha("")
    setRole("")
    setEditando(false)
    setUsuarioId(null)
  }

  async function criarUsuario(e) {
    e.preventDefault()

    if (!isAdmin) {
      alert("Apenas administradores podem criar usuários.")
      return
    }

    if (!nome || !email || !senha || !role) {
      alert("Preencha todos os campos.")
      return
    }

    const { error } = await supabase.from("users").insert([
      {
        nome,
        email,
        senha,
        role,
        primeiro_acesso: true,
      },
    ])

    if (error) {
      alert(error.message)
      console.log(error)
      return
    }

    limparFormulario()
    carregarUsuarios()
  }

  function iniciarEdicao(u) {
    if (!isAdmin) {
      alert("Apenas administradores podem editar usuários.")
      return
    }

    setNome(u.nome || "")
    setEmail(u.email || "")
    setSenha(u.senha || "")
    setRole(u.role || "")
    setUsuarioId(u.id)
    setEditando(true)

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  async function salvarEdicao(e) {
    e.preventDefault()

    if (!isAdmin) {
      alert("Apenas administradores podem editar usuários.")
      return
    }

    if (!nome || !email || !senha || !role) {
      alert("Preencha todos os campos.")
      return
    }

    const { error } = await supabase
      .from("users")
      .update({
        nome,
        email,
        senha,
        role,
      })
      .eq("id", usuarioId)

    if (error) {
      alert(error.message)
      console.log(error)
      return
    }

    limparFormulario()
    carregarUsuarios()
  }

  async function excluirUsuario(id) {
    if (!isAdmin) {
      alert("Apenas administradores podem excluir usuários.")
      return
    }

    if (!confirm("Excluir usuário?")) return

    const { error } = await supabase.from("users").delete().eq("id", id)

    if (error) {
      alert(error.message)
      console.log(error)
      return
    }

    if (usuarioId === id) {
      limparFormulario()
    }

    carregarUsuarios()
  }

  function corBadge(departamento) {
  const valor = normalizarTexto(departamento)

  if (valor === "administrador" || valor === "admin") {
    return { background: "#ede9fe", color: "#6d28d9" }
  }

  if (valor === "dirigente") {
    return { background: "#fee2e2", color: "#b91c1c" }
  }

  if (valor === "midia") {
    return { background: "#dbeafe", color: "#1d4ed8" }
  }

  if (valor === "recepcao") {
    return { background: "#cffafe", color: "#0f766e" }
  }

  if (valor === "secretaria") {
    return { background: "#fef3c7", color: "#92400e" }
  }

  if (valor === "sonoplastia") {
    return { background: "#f3f4f6", color: "#374151" }
  }

  if (valor === "infantil") {
    return { background: "#fce7f3", color: "#be185d" }
  }

  if (valor === "adolescentes") {
    return { background: "#e0e7ff", color: "#4338ca" }
  }

  if (valor === "jovens") {
    return { background: "#dcfce7", color: "#166534" }
  }

  if (valor === "ebd") {
    return { background: "#fde68a", color: "#92400e" }
  }

  if (valor === "cofemp") {
    return { background: "#d1fae5", color: "#065f46" }
  }

  if (valor === "alem-mar" || valor === "alemmar") {
    return { background: "#fbcfe8", color: "#9d174d" }
  }

  if (valor === "orquestra e coral") {
    return { background: "#e9d5ff", color: "#6b21a8" }
  }

  return { background: "#f3f4f6", color: "#374151" }
}

  return (
    <div className="main">
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "28px",
          }}
        >
          <div>
            <h2
              className="subtitle"
              style={{ margin: 0, fontSize: "28px", marginBottom: "6px" }}
            >
              Usuários
            </h2>

            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
              {isAdmin
                ? "Gerencie os usuários e departamentos do sistema."
                : "Visualize os usuários cadastrados no sistema."}
            </p>
          </div>

          <div
            style={{
              background: isAdmin ? "#dcfce7" : "#f3f4f6",
              color: isAdmin ? "#166534" : "#374151",
              padding: "8px 14px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            {isAdmin ? "Administrador" : "Somente visualização"}
          </div>
        </div>

        {isAdmin && (
          <>
            <div
              style={{
                background: editando ? "#eff6ff" : "#f8fafc",
                border: editando ? "1px solid #bfdbfe" : "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "22px",
                marginBottom: "28px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: "18px",
                  fontSize: "20px",
                  color: "#111827",
                }}
              >
                {editando ? "Editar usuário" : "Novo usuário"}
              </h3>

              <form onSubmit={editando ? salvarEdicao : criarUsuario}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <input
                    placeholder="Nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />

                  <input
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <input
                    type="password"
                    placeholder="Senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />

                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                      boxSizing: "border-box",
                      fontSize: "14px",
                      background: "white",
                    }}
                  >
                    <option value="">Selecione o departamento</option>

                    {departamentos.map((dep) => (
                      <option key={dep} value={dep}>
                        {dep}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    className="login-btn"
                    style={{ marginTop: 0, width: "auto" }}
                  >
                    {editando ? "Salvar alterações" : "Criar usuário"}
                  </button>

                  {editando && (
                    <button
                      type="button"
                      onClick={limparFormulario}
                      style={{
                        marginTop: 0,
                        width: "auto",
                        padding: "12px 18px",
                        border: "none",
                        borderRadius: "8px",
                        background: "#e5e7eb",
                        color: "#111827",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </>
        )}

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "18px", color: "#111827" }}>
              Usuários cadastrados
            </h3>

            <span
              style={{
                background: "#eff6ff",
                color: "#1d4ed8",
                padding: "6px 10px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              {usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "760px",
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "14px 16px",
                      fontSize: "13px",
                      color: "#6b7280",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Nome
                  </th>

                  <th
                    style={{
                      textAlign: "left",
                      padding: "14px 16px",
                      fontSize: "13px",
                      color: "#6b7280",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Email
                  </th>

                  <th
                    style={{
                      textAlign: "left",
                      padding: "14px 16px",
                      fontSize: "13px",
                      color: "#6b7280",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Departamento
                  </th>

                  {isAdmin && (
                    <th
                      style={{
                        textAlign: "left",
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: "#6b7280",
                        borderBottom: "1px solid #e5e7eb",
                        width: "180px",
                      }}
                    >
                      Ações
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {usuarios.length === 0 && (
                  <tr>
                    <td
                      colSpan={isAdmin ? 4 : 3}
                      style={{
                        padding: "24px 16px",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      Nenhum usuário cadastrado.
                    </td>
                  </tr>
                )}

                {usuarios.map((u, index) => {
                  const badge = corBadge(u.role)

                  return (
                    <tr
                      key={u.id}
                      style={{
                        background: index % 2 === 0 ? "#ffffff" : "#fafafa",
                      }}
                    >
                      <td
                        style={{
                          padding: "16px",
                          borderBottom: "1px solid #f1f5f9",
                          fontWeight: "600",
                          color: "#111827",
                        }}
                      >
                        {u.nome}
                      </td>

                      <td
                        style={{
                          padding: "16px",
                          borderBottom: "1px solid #f1f5f9",
                          color: "#4b5563",
                        }}
                      >
                        {u.email}
                      </td>

                      <td
                        style={{
                          padding: "16px",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <span
                          style={{
                            background: badge.background,
                            color: badge.color,
                            padding: "6px 10px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: "700",
                            display: "inline-block",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>

                      {isAdmin && (
                        <td
                          style={{
                            padding: "16px",
                            borderBottom: "1px solid #f1f5f9",
                          }}
                        >
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => iniciarEdicao(u)}
                              style={{
                                padding: "8px 12px",
                                borderRadius: "8px",
                                border: "none",
                                background: "#2563eb",
                                color: "white",
                                cursor: "pointer",
                                fontWeight: "600",
                              }}
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => excluirUsuario(u.id)}
                              style={{
                                padding: "8px 12px",
                                borderRadius: "8px",
                                border: "none",
                                background: "#ef4444",
                                color: "white",
                                cursor: "pointer",
                                fontWeight: "600",
                              }}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}