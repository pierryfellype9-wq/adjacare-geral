import { useEffect, useState } from "react"
import { notificar } from "../lib/feedback"
import { supabase } from "../lib/supabase"

export default function CadastroProfessorPublico() {
  const [turmas, setTurmas] = useState([])
  const [carregando, setCarregando] = useState(true)
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
    setCarregando(true)

    const { data, error } = await supabase
      .from("ebd_turmas")
      .select("id, nome")
      .neq("nome", "Não permitido")
      .order("nome", { ascending: true })

    if (error) {
      console.error("Erro ao carregar turmas:", error)
      setTurmas([])
      setCarregando(false)
      return
    }

    setTurmas(data || [])
    setCarregando(false)
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
      notificar("Informe o nome completo.")
      return
    }

    if (!form.data_nascimento) {
      notificar("Informe a data de nascimento.")
      return
    }

    if (!form.telefone.trim()) {
      notificar("Informe o telefone.")
      return
    }

    if (!form.email.trim()) {
      notificar("Informe o e-mail.")
      return
    }

    if (form.turmas_ebd.length === 0) {
      notificar("Selecione pelo menos uma turma.")
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
      notificar("Erro ao enviar cadastro. Tente novamente.")
      return
    }

    setSucesso(true)
  }

  const estilos = {
    pagina: {
      minHeight: "100vh",
      background:
        "linear-gradient(135deg, #e8f0ff 0%, #f8fbff 45%, #ffffff 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px 10px",
    },
    card: {
      width: "100%",
      maxWidth: "720px",
      background: "#ffffff",
      borderRadius: "22px",
      boxShadow: "0 16px 42px rgba(15, 23, 42, 0.10)",
      padding: "22px 16px",
      boxSizing: "border-box",
    },
    header: {
      textAlign: "center",
      marginBottom: "24px",
    },
    logo: {
      width: "70px",
      height: "70px",
      objectFit: "contain",
      marginBottom: "12px",
    },
    titulo: {
      margin: 0,
      fontSize: "clamp(24px, 6vw, 32px)",
      color: "#0f172a",
      fontWeight: "800",
      lineHeight: "1.2",
    },
    subtitulo: {
      marginTop: "10px",
      color: "#64748b",
      lineHeight: "1.55",
      fontSize: "15px",
    },
    secao: {
      marginTop: "18px",
    },
    secaoTitulo: {
      fontSize: "16px",
      fontWeight: "800",
      color: "#0f172a",
      marginBottom: "10px",
    },
    labelCampo: {
      display: "block",
      fontSize: "13px",
      fontWeight: "700",
      color: "#475569",
      marginBottom: "6px",
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: "12px",
    },
    input: {
      width: "100%",
      padding: "13px",
      borderRadius: "12px",
      border: "1px solid #cbd5e1",
      outline: "none",
      fontSize: "15px",
      boxSizing: "border-box",
    },
    turmasGrid: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: "8px",
    },
    turmaCard: {
      width: "100%",
      border: "1px solid #cbd5e1",
      borderRadius: "12px",
      padding: "12px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: "10px",
      fontWeight: "700",
      color: "#0f172a",
      background: "#ffffff",
      fontSize: "14px",
      boxSizing: "border-box",
      userSelect: "none",
    },
    checkVisual: {
      width: "18px",
      height: "18px",
      minWidth: "18px",
      borderRadius: "5px",
      border: "2px solid #94a3b8",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      fontWeight: "900",
      boxSizing: "border-box",
    },
    inputOculto: {
      display: "none",
    },
    textarea: {
      width: "100%",
      minHeight: "100px",
      padding: "13px",
      borderRadius: "12px",
      border: "1px solid #cbd5e1",
      outline: "none",
      resize: "vertical",
      fontSize: "15px",
      boxSizing: "border-box",
    },
    botao: {
      width: "100%",
      marginTop: "22px",
      padding: "14px",
      border: "none",
      borderRadius: "14px",
      background: "#2563eb",
      color: "#ffffff",
      fontWeight: "800",
      cursor: "pointer",
      fontSize: "15px",
    },
    aviso: {
      background: "#fff7ed",
      border: "1px solid #fed7aa",
      color: "#9a3412",
      padding: "14px",
      borderRadius: "14px",
      lineHeight: "1.6",
      textAlign: "center",
    },
    sucesso: {
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      color: "#166534",
      padding: "14px",
      borderRadius: "14px",
      lineHeight: "1.6",
      textAlign: "center",
    },
  }

  if (carregando) {
    return (
      <div style={estilos.pagina}>
        <div style={estilos.card}>
          <div style={estilos.header}>
            <img src="/logo.png" alt="Logo" style={estilos.logo} />
            <h2 style={estilos.titulo}>Carregando cadastro...</h2>
          </div>
        </div>
      </div>
    )
  }

  if (sucesso) {
    return (
      <div style={estilos.pagina}>
        <div style={estilos.card}>
          <div style={estilos.header}>
            <img src="/logo.png" alt="Logo" style={estilos.logo} />
            <h2 style={estilos.titulo}>Cadastro enviado!</h2>
            <p style={estilos.subtitulo}>
              Seus dados foram enviados com sucesso. Agora é só aguardar a
              aprovação da administração da EBD.
            </p>
          </div>

          <div style={estilos.sucesso}>
            Obrigado por preencher o cadastro. Assim que aprovado, seu acesso
            será liberado no Portal AD Jacaré.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={estilos.pagina}>
      <div style={estilos.card}>
        <div style={estilos.header}>
          <img src="/logo.png" alt="Logo" style={estilos.logo} />

          <h2 style={estilos.titulo}>Cadastro de Professor EBD</h2>

          <p style={estilos.subtitulo}>
            Preencha seus dados para solicitar acesso ao Portal AD Jacaré. Após
            a aprovação, seu acesso será configurado pela administração da EBD.
          </p>
        </div>

        <form onSubmit={enviarFormulario}>
          <div style={estilos.secao}>
            <div style={estilos.secaoTitulo}>Dados do professor</div>

            <label style={estilos.labelCampo}>Nome completo</label>
            <input
              style={estilos.input}
              placeholder="Nome completo"
              value={form.nome_completo}
              onChange={(e) => atualizarCampo("nome_completo", e.target.value)}
            />
          </div>

          <div style={estilos.secao}>
            <div style={estilos.grid2}>
              <div>
                <label style={estilos.labelCampo}>Data de nascimento</label>
                <input
                  style={estilos.input}
                  type="date"
                  value={form.data_nascimento}
                  onChange={(e) =>
                    atualizarCampo("data_nascimento", e.target.value)
                  }
                />
              </div>

              <div>
                <label style={estilos.labelCampo}>Telefone</label>
                <input
                  style={estilos.input}
                  placeholder="Telefone"
                  value={form.telefone}
                  onChange={(e) => atualizarCampo("telefone", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={estilos.secao}>
            <label style={estilos.labelCampo}>E-mail</label>
            <input
              style={estilos.input}
              type="email"
              placeholder="E-mail"
              value={form.email}
              onChange={(e) => atualizarCampo("email", e.target.value)}
            />
          </div>

          <div style={estilos.secao}>
            <div style={estilos.secaoTitulo}>Turma(s) que irá lecionar</div>

            {turmas.length === 0 ? (
              <div style={estilos.aviso}>
                Nenhuma turma disponível para seleção.
              </div>
            ) : (
              <div style={estilos.turmasGrid}>
                {turmas.map((turma) => {
                  const selecionada = form.turmas_ebd.includes(turma.id)

                  return (
                    <label
                      key={turma.id}
                      style={{
                        ...estilos.turmaCard,
                        borderColor: selecionada ? "#2563eb" : "#cbd5e1",
                        background: selecionada ? "#eff6ff" : "#ffffff",
                        color: selecionada ? "#1d4ed8" : "#0f172a",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selecionada}
                        onChange={() => alternarTurma(turma.id)}
                        style={estilos.inputOculto}
                      />

                      <span
                        style={{
                          ...estilos.checkVisual,
                          background: selecionada ? "#2563eb" : "#ffffff",
                          borderColor: selecionada ? "#2563eb" : "#94a3b8",
                          color: "#ffffff",
                        }}
                      >
                        {selecionada ? "✓" : ""}
                      </span>

                      <span>{turma.nome}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div style={estilos.secao}>
            <div style={estilos.secaoTitulo}>Observações</div>

            <textarea
              style={estilos.textarea}
              placeholder="Digite alguma observação, se necessário"
              value={form.observacoes}
              onChange={(e) => atualizarCampo("observacoes", e.target.value)}
            />
          </div>

          <button style={estilos.botao} disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar cadastro"}
          </button>
        </form>
      </div>
    </div>
  )
}
