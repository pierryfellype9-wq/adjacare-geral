import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { sanitizeUser } from "../lib/auth"
import { supabase } from "../lib/supabase"

export default function TrocarSenha({ user, setUser }) {
  const navigate = useNavigate()

  const [senha, setSenha] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [carregando, setCarregando] = useState(false)

  const primeiroAcesso = user?.primeiro_acesso === true

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

    try {
      // Mantém o cadastro legado sincronizado enquanto todos os usuários são migrados.
      const { error: legacyError } = await supabase
        .from("users")
        .update({
          senha,
          primeiro_acesso: false,
        })
        .eq("id", user.id)

      if (legacyError) throw legacyError

      const { data: authData } = await supabase.auth.getUser()
      if (authData.user) {
        const { error: authError } = await supabase.auth.updateUser({ password: senha })

        // O login gradual consegue ressincronizar a senha no próximo acesso.
        if (authError) console.error("Não foi possível sincronizar a senha no Auth:", authError)
      }

      const usuarioAtualizado = sanitizeUser({
        ...user,
        primeiro_acesso: false,
      })

      localStorage.setItem("user", JSON.stringify(usuarioAtualizado))
      localStorage.setItem("loginTime", String(Date.now()))
      setUser(usuarioAtualizado)
      setSenha("")
      setConfirmar("")

      alert(
        primeiroAcesso
          ? "Senha criada com sucesso!"
          : "Senha alterada com sucesso!"
      )

      navigate("/dashboard")
    } catch (error) {
      console.error(error)
      alert("Erro ao alterar senha.")
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="page">
      {!primeiroAcesso && (
        <button className="btn-voltar" onClick={() => navigate("/dashboard")}>
          ← Voltar
        </button>
      )}

      <div
        className="form-card"
        style={{
          maxWidth: "520px",
          margin: "40px auto",
          padding: "32px",
        }}
      >
        <h2 style={{ marginBottom: "8px" }}>
          {primeiroAcesso ? "Crie sua senha" : "Alterar senha"}
        </h2>

        <p style={{ marginBottom: "24px", color: "#64748b" }}>
          {primeiroAcesso
            ? "Para continuar acessando o Portal AD Jacaré, crie uma senha definitiva."
            : "Crie uma nova senha para acessar o Sistema Geral ADJACARÉ."}
        </p>

        <form onSubmit={salvar}>
          <div style={{ marginBottom: "16px" }}>
            <label>Nova senha</label>
            <input
              type="password"
              placeholder="Digite a nova senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label>Confirmar nova senha</label>
            <input
              type="password"
              placeholder="Digite novamente a senha"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              autoComplete="new-password"
              required
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
              {carregando
                ? "Salvando..."
                : primeiroAcesso
                ? "Criar senha"
                : "Salvar nova senha"}
            </button>

            {!primeiroAcesso && (
              <button
                type="button"
                className="btn-cancelar"
                onClick={() => navigate("/dashboard")}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
