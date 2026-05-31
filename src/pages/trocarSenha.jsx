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

    const usuarioAtualizado = {
      ...user,
      senha,
    }

    localStorage.setItem("user", JSON.stringify(usuarioAtualizado))
    setUser(usuarioAtualizado)

    alert("Senha alterada com sucesso!")
    navigate("/dashboard")
  }

  return (
    <div className="page">
      <div className="form-card">
        <h2>Alterar senha</h2>

        <form onSubmit={salvar}>
          <input
            type="password"
            placeholder="Nova senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />

          <button disabled={carregando}>
            {carregando ? "Salvando..." : "Salvar nova senha"}
          </button>

          <button
            type="button"
            className="btn-cancelar"
            onClick={() => navigate("/dashboard")}
          >
            Voltar
          </button>
        </form>
      </div>
    </div>
  )
}
