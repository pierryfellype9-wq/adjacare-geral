import { notificar } from "../lib/feedback"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { sanitizeUser } from "../lib/auth"
import { supabase } from "../lib/supabase"
import "./TrocarSenha.css"

export default function TrocarSenha({ user, setUser }) {
  const navigate = useNavigate()

  const [senha, setSenha] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false)

  const primeiroAcesso = user?.primeiro_acesso === true
  const tamanhoValido = senha.length >= 8
  const senhasIguais = confirmar.length > 0 && senha === confirmar

  async function salvar(e) {
    e.preventDefault()

    if (!user?.id) {
      notificar("Usuário não encontrado.")
      return
    }

    if (senha.length < 8) {
      notificar("A nova senha deve ter pelo menos 8 caracteres.")
      return
    }

    if (senha !== confirmar) {
      notificar("As senhas não coincidem.")
      return
    }

    setCarregando(true)

    try {
      const { data: authData, error: authUserError } = await supabase.auth.getUser()
      if (authUserError || !authData.user) {
        throw new Error("Sua sessão expirou. Entre novamente antes de alterar a senha.")
      }

      const { error: authError } = await supabase.auth.updateUser({ password: senha })
      if (authError) throw authError

      // Mantém o cadastro legado sincronizado apenas durante a migração gradual.
      const { error: legacyError } = await supabase
        .from("users")
        .update({
          senha,
          primeiro_acesso: false,
        })
        .eq("id", user.id)

      if (legacyError) throw legacyError

      const usuarioAtualizado = sanitizeUser({
        ...user,
        primeiro_acesso: false,
      })

      localStorage.setItem("user", JSON.stringify(usuarioAtualizado))
      localStorage.setItem("loginTime", String(Date.now()))
      setUser(usuarioAtualizado)
      setSenha("")
      setConfirmar("")

      notificar(
        primeiroAcesso
          ? "Senha criada com sucesso!"
          : "Senha alterada com sucesso!"
      )

      navigate("/dashboard")
    } catch (error) {
      console.error(error)
      notificar(error?.message || "Erro ao alterar senha.")
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="trocar-senha-page">
      <section className="trocar-senha-painel">
        <div className="trocar-senha-apresentacao">
          <div className="trocar-senha-marca">AD</div>
          <span className="trocar-senha-kicker">
            {primeiroAcesso ? "BEM-VINDO AO SISTEMA" : "SEGURANÇA DA CONTA"}
          </span>
          <h1>{primeiroAcesso ? "Vamos proteger seu acesso." : "Sua conta, mais segura."}</h1>
          <p>
            {primeiroAcesso
              ? "Antes de começar, escolha uma senha pessoal para acessar todos os recursos liberados para você."
              : "Atualize sua senha sempre que achar necessário e mantenha seu acesso ao Sistema ADJACARÉ protegido."}
          </p>

          <div className="trocar-senha-dicas">
            <div><span>✓</span><p><strong>Pessoal e intransferível</strong>Não compartilhe sua senha com outras pessoas.</p></div>
            <div><span>✓</span><p><strong>Fácil para você lembrar</strong>Evite informações óbvias ou muito conhecidas.</p></div>
          </div>

          <i className="trocar-senha-circulo um" />
          <i className="trocar-senha-circulo dois" />
        </div>

        <div className="trocar-senha-formulario">
          {!primeiroAcesso && (
            <button
              type="button"
              className="trocar-senha-voltar"
              onClick={() => navigate("/dashboard")}
            >
              ← Voltar ao início
            </button>
          )}

          <div className="trocar-senha-icone" aria-hidden="true">
            <span>●</span>
            <b>⌑</b>
          </div>

          <span className="trocar-senha-kicker">
            {primeiroAcesso ? "PRIMEIRO ACESSO" : "ALTERAÇÃO DE SENHA"}
          </span>
          <h2>{primeiroAcesso ? "Crie sua senha" : "Defina uma nova senha"}</h2>
          <p className="trocar-senha-introducao">
            Digite a nova senha nos dois campos para confirmar a alteração.
          </p>

          <form onSubmit={salvar}>
            <label className="trocar-senha-campo">
              <span>Nova senha</span>
              <div>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Digite a nova senha"
                  value={senha}
                  onChange={(evento) => setSenha(evento.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                >
                  {mostrarSenha ? "Ocultar" : "Ver"}
                </button>
              </div>
            </label>

            <label className="trocar-senha-campo">
              <span>Confirmar nova senha</span>
              <div>
                <input
                  type={mostrarConfirmacao ? "text" : "password"}
                  placeholder="Digite novamente a senha"
                  value={confirmar}
                  onChange={(evento) => setConfirmar(evento.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  aria-label={mostrarConfirmacao ? "Ocultar confirmação" : "Mostrar confirmação"}
                  onClick={() => setMostrarConfirmacao(!mostrarConfirmacao)}
                >
                  {mostrarConfirmacao ? "Ocultar" : "Ver"}
                </button>
              </div>
            </label>

            <div className="trocar-senha-requisitos">
              <span className={tamanhoValido ? "valido" : ""}>
                <b>{tamanhoValido ? "✓" : "·"}</b> Pelo menos 8 caracteres
              </span>
              <span className={senhasIguais ? "valido" : ""}>
                <b>{senhasIguais ? "✓" : "·"}</b> As duas senhas são iguais
              </span>
            </div>

            <button
              className="trocar-senha-salvar"
              disabled={carregando || !tamanhoValido || !senhasIguais}
            >
              {carregando
                ? "Salvando..."
                : primeiroAcesso
                ? "Criar senha e continuar"
                : "Salvar nova senha"}
              {!carregando && <span>→</span>}
            </button>

            {!primeiroAcesso && (
              <button
                type="button"
                className="trocar-senha-cancelar"
                onClick={() => navigate("/dashboard")}
              >
                Cancelar alteração
              </button>
            )}
          </form>

          <small className="trocar-senha-rodape">
            🔒 Sua senha é atualizada de forma segura no sistema.
          </small>
        </div>
      </section>
    </main>
  )
}
