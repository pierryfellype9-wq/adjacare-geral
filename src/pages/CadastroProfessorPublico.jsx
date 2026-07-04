import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function CadastroProfessorPublico() {
  const [turmas, setTurmas] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const [form, setForm] = useState({
    nome_completo: "",
    data_nascimento: "",
    telefone: "",
    email: "",
    turmas_ebd: [],
    observacoes: "",
  })

  useEffect(() => {
    carregarTurmas()
  }, [])

  async function carregarTurmas() {
    const { data, error } = await supabase
      .from("ebd_turmas")
      .select("id, nome")
      .order("nome", { ascending: true })

    if (error) {
      console.error("Erro ao carregar turmas:", error)
      return
    }

    setTurmas(data || [])
  }

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }))
  }

  function alternarTurma(id) {
    setForm((prev) => {
      const jaSelecionada = prev.turmas_ebd.includes(id)

      return {
        ...prev,
        turmas_ebd: jaSelecionada
          ? prev.turmas_ebd.filter((turmaId) => turmaId !== id)
          : [...prev.turmas_ebd, id],
      }
    })
  }

  async function enviarFormulario(e) {
    e.preventDefault()

    if (!form.nome_completo.trim()) {
      alert("Informe o nome completo.")
      return
    }

    if (!form.data_nascimento) {
      alert("Informe a data de nascimento.")
      return
    }

    if (!form.telefone.trim()) {
      alert("Informe o telefone.")
      return
    }

    if (!form.email.trim()) {
      alert("Informe o e-mail.")
      return
    }

    if (form.turmas_ebd.length === 0) {
      alert("Selecione pelo menos uma turma.")
      return
    }

    setEnviando(true)

    const { error } = await supabase
      .from("ebd_solicitacoes_professores")
      .insert([
        {
          nome_completo: form.nome_completo.trim(),
          data_nascimento: form.data_nascimento,
          telefone: form.telefone.trim(),
          email: form.email.trim(),
          turmas_ebd: form.turmas_ebd,
          observacoes: form.observacoes.trim(),
          status: "Pendente",
        },
      ])

    setEnviando(false)

    if (error) {
      console.error("Erro ao enviar cadastro:", error)
      alert("Erro ao enviar cadastro. Tente novamente.")
      return
    }

    setSucesso(true)
  }

  if (sucesso) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ maxWidth: "520px" }}>
          <div style={{ textAlign: "center" }}>
            <img
              src="/logo.png"
              alt="Logo"
              style={{
                width: "90px",
                height: "90px",
                objectFit: "contain",
                marginBottom: "20px",
              }}
            />

            <h2>Cadastro enviado!</h2>

            <p style={{ marginTop: "15px", lineHeight: "1.6" }}>
              Seus dados foram enviados com sucesso. Agora é só aguardar a
              aprovação da administração da EBD.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: "620px" }}>
        <div style={{ textAlign: "center", marginBottom: "25px" }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              width: "90px",
              height: "90px",
              objectFit: "contain",
              marginBottom: "15px",
            }}
          />

          <h2 style={{ margin: 0 }}>Cadastro de Professor EBD</h2>

          <p style={{ marginTop: "10px", opacity: 0.8 }}>
            Preencha seus dados para solicitação de acesso ao Portal AD Jacaré.
          </p>
        </div>

        <form onSubmit={enviarFormulario}>
          <input
            placeholder="Nome completo"
            value={form.nome_completo}
            onChange={(e) => atualizarCampo("nome_completo", e.target.value)}
          />

          <input
            type="date"
            value={form.data_nascimento}
            onChange={(e) => atualizarCampo("data_nascimento", e.target.value)}
          />

          <input
            placeholder="Telefone"
            value={form.telefone}
            onChange={(e) => atualizarCampo("telefone", e.target.value)}
          />

          <input
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => atualizarCampo("email", e.target.value)}
          />

          <div style={{ marginTop: "15px", marginBottom: "15px" }}>
            <strong>Turma(s) que irá lecionar</strong>

            <div style={{ marginTop: "10px", display: "grid", gap: "8px" }}>
              {turmas.length === 0 ? (
                <p style={{ opacity: 0.8 }}>Nenhuma turma encontrada.</p>
              ) : (
                turmas.map((turma) => (
                  <label
                    key={turma.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.turmas_ebd.includes(turma.id)}
                      onChange={() => alternarTurma(turma.id)}
                    />
                    {turma.nome}
                  </label>
                ))
              )}
            </div>
          </div>

          <textarea
            placeholder="Observações"
            value={form.observacoes}
            onChange={(e) => atualizarCampo("observacoes", e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              resize: "vertical",
              marginBottom: "15px",
            }}
          />

          <button className="login-btn" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar cadastro"}
          </button>
        </form>
      </div>
    </div>
  )
}
