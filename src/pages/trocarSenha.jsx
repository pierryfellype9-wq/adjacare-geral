import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function TrocarSenha({ user, setUser }) {
  const navigate = useNavigate()

  const [senha, setSenha] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [carregando, setCarregando] = useState(false)

  async function salvar(e) {
    e.preventDefault()

    if (!user?.id) {
      alert("Usuário não encontrado.")
      return
    }

    if (senha.length < 4) {
      alert("A senha deve ter pelo menos 4 caracteres.")
      return
    }

    if (senha !== confirmar) {
      alert("As senhas não coincidem.")
      return
    }

    setCarregando(true)

    const { error } = await supabase
      .from("users")
      .update({ senha })
      .eq("id", user.id)

    setCarregando(false)

    if (error) {
      console.error(error)
      alert("Erro ao alterar senha.")
      return
    }

    const usuarioAtualizado = { ...user, senha }

    localStorage.setItem("user", JSON.stringify(usuarioAtualizado))
    setUser(usuarioAtualizado)

    alert("Senha alterada com sucesso!")
    navigate("/dashboard")
  }

  return (
    <div className="page">
      <button className="btn-voltar" onClick={() => navigate("/dashboard")}>
        ← Voltar
      </button>

      <div
        className="form-card"
        style={{
          maxWidth: "520px",
          margin: "40px auto",
          padding: "32px",
        }}
      >
        <h2 style={{ marginBottom: "8px" }}>Alterar senha</h2>

        <p style={{ marginBottom: "24px", color: "#64748b" }}>
          Crie uma nova senha para acessar o Sistema Geral ADJACARÉ.
        </p>

        <form onSubmit={salvar}>
          <div style={{ marginBottom: "16px" }}>
            <label>Nova senha</label>
            <input
              type="password"
              placeholder="Digite a nova senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label>Confirmar nova senha</label>
            <input
              type="password"
              placeholder="Digite novamente a senha"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <button disabled={carregando}>
              {carregando ? "Salvando..." : "Salvar nova senha"}
            </button>

            <button
              type="button"
              className="btn-cancelar"
              onClick={() => navigate("/dashboard")}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
