import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function EBDSolicitacaoProfessor({ user }) {
  const navigate = useNavigate()
  const { id } = useParams()

  const [turmas, setTurmas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    nome_completo: "",
    data_nascimento: "",
    telefone: "",
    email: "",
    turmas_ebd: [],
    observacoes: "",
    status: "Pendente",
    created_at: "",
  })

  useEffect(() => {
    carregarDados()
  }, [id])

  async function carregarDados() {
    setCarregando(true)

    const { data: turmasData } = await supabase
      .from("ebd_turmas")
      .select("id, nome")
      .neq("nome", "Não permitido")
      .order("nome", { ascending: true })

    const { data: solicitacaoData, error } = await supabase
      .from("ebd_solicitacoes_professores")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !solicitacaoData) {
      console.error(error)
      alert("Solicitação não encontrada.")
      navigate("/ebd/solicitacoes-professores")
      return
    }

    setTurmas(turmasData || [])
    setForm({
      nome_completo: solicitacaoData.nome_completo || "",
      data_nascimento: solicitacaoData.data_nascimento || "",
      telefone: solicitacaoData.telefone || "",
      email: solicitacaoData.email || "",
      turmas_ebd: Array.isArray(solicitacaoData.turmas_ebd)
        ? solicitacaoData.turmas_ebd
        : [],
      observacoes: solicitacaoData.observacoes || "",
      status: solicitacaoData.status || "Pendente",
      created_at: solicitacaoData.created_at || "",
    })

    setCarregando(false)
  }

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }))
  }

  function alternarTurma(turmaId) {
    setForm((prev) => {
      const selecionada = prev.turmas_ebd.includes(turmaId)

      return {
        ...prev,
        turmas_ebd: selecionada
          ? prev.turmas_ebd.filter((id) => id !== turmaId)
          : [...prev.turmas_ebd, turmaId],
      }
    })
  }

  function primeiraTurmaTexto(ids) {
    if (!ids || ids.length === 0) return "Não permitido"

    const turma = turmas.find((t) => t.id === ids[0])
    return turma?.nome || "Não permitido"
  }

  function gerarSenhaProvisoria() {
    return Math.random().toString(36).slice(-8)
  }

  async function salvarSolicitacao() {
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

    setSalvando(true)

    const { error } = await supabase
      .from("ebd_solicitacoes_professores")
      .update({
        nome_completo: form.nome_completo.trim(),
        data_nascimento: form.data_nascimento,
        telefone: form.telefone.trim(),
        email: form.email.trim(),
        turmas_ebd: form.turmas_ebd,
        observacoes: form.observacoes.trim(),
      })
      .eq("id", id)

    setSalvando(false)

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    alert("Solicitação salva com sucesso.")
  }

  async function aprovarSolicitacao() {
    if (!confirm(`Aprovar cadastro de ${form.nome_completo}?`)) return

    await salvarSolicitacao()

    const senhaProvisoria = gerarSenhaProvisoria()

    const { error: erroUsuario } = await supabase.from("users").insert([
      {
        membro_id: null,
        nome: form.nome_completo.trim(),
        email: form.email.trim(),
        senha: senhaProvisoria,
        role: "EBD",
        turma_ebd: primeiraTurmaTexto(form.turmas_ebd),
        turmas_ebd: form.turmas_ebd,
        primeiro_acesso: true,
      },
    ])

    if (erroUsuario) {
      alert(erroUsuario.message)
      console.error(erroUsuario)
      return
    }

    const { error: erroSolicitacao } = await supabase
      .from("ebd_solicitacoes_professores")
      .update({
        status: "Aprovado",
        aprovado_em: new Date().toISOString(),
        aprovado_por: user?.id || null,
      })
      .eq("id", id)

    if (erroSolicitacao) {
      alert(erroSolicitacao.message)
      console.error(erroSolicitacao)
      return
    }

    alert(
      `Professor aprovado com sucesso!\n\nE-mail: ${form.email}\nSenha provisória: ${senhaProvisoria}`
    )

    navigate("/ebd/solicitacoes-professores")
  }

  async function recusarSolicitacao() {
    if (!confirm("Recusar esta solicitação?")) return

    const { error } = await supabase
      .from("ebd_solicitacoes_professores")
      .update({ status: "Recusado" })
      .eq("id", id)

    if (error) {
      alert(error.message)
      console.error(error)
      return
    }

    navigate("/ebd/solicitacoes-professores")
  }

  function formatarData(data) {
    if (!data) return "-"

    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (carregando) {
    return (
      <div className="main">
        <div className="card">
          <p>Carregando solicitação...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="main">
      <div className="card">
        <button
          onClick={() => navigate("/ebd/solicitacoes-professores")}
          style={btnVoltar}
        >
          ← Voltar
        </button>

        <div style={{ marginBottom: "26px" }}>
          <h2
            className="subtitle"
            style={{ margin: 0, fontSize: "28px", marginBottom: "6px" }}
          >
            Solicitação de Professor
          </h2>

          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
            Solicitado em {formatarData(form.created_at)} • Status:{" "}
            <strong>{form.status}</strong>
          </p>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            padding: "22px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <input
              placeholder="Nome completo"
              value={form.nome_completo}
              onChange={(e) => atualizarCampo("nome_completo", e.target.value)}
              style={inputStyle}
              disabled={form.status !== "Pendente"}
            />

            <input
              type="date"
              value={form.data_nascimento}
              onChange={(e) =>
                atualizarCampo("data_nascimento", e.target.value)
              }
              style={inputStyle}
              disabled={form.status !== "Pendente"}
            />

            <input
              placeholder="Telefone"
              value={form.telefone}
              onChange={(e) => atualizarCampo("telefone", e.target.value)}
              style={inputStyle}
              disabled={form.status !== "Pendente"}
            />

            <input
              type="email"
              placeholder="E-mail"
              value={form.email}
              onChange={(e) => atualizarCampo("email", e.target.value)}
              style={inputStyle}
              disabled={form.status !== "Pendente"}
            />
          </div>

          <div style={{ marginTop: "20px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>
              Turma(s) que irá lecionar
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "10px",
              }}
            >
              {turmas.map((turma) => {
                const selecionada = form.turmas_ebd.includes(turma.id)

                return (
                  <label
                    key={turma.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "12px",
                      borderRadius: "12px",
                      border: selecionada
                        ? "1px solid #2563eb"
                        : "1px solid #e5e7eb",
                      background: selecionada ? "#eff6ff" : "#ffffff",
                      cursor: form.status === "Pendente" ? "pointer" : "default",
                      fontWeight: "600",
                      color: selecionada ? "#1d4ed8" : "#374151",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selecionada}
                      onChange={() => alternarTurma(turma.id)}
                      disabled={form.status !== "Pendente"}
                    />
                    {turma.nome}
                  </label>
                )
              })}
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>
              Observações
            </h3>

            <textarea
              placeholder="Observações"
              value={form.observacoes}
              onChange={(e) => atualizarCampo("observacoes", e.target.value)}
              style={textareaStyle}
              disabled={form.status !== "Pendente"}
            />
          </div>

          {form.status === "Pendente" && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginTop: "22px",
              }}
            >
              <button
                onClick={salvarSolicitacao}
                style={btnSalvar}
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>

              <button onClick={aprovarSolicitacao} style={btnAprovar}>
                Aprovar e criar usuário
              </button>

              <button onClick={recusarSolicitacao} style={btnRecusar}>
                Recusar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
}

const textareaStyle = {
  width: "100%",
  minHeight: "120px",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  resize: "vertical",
  boxSizing: "border-box",
}

const btnVoltar = {
  marginBottom: "18px",
  padding: "9px 13px",
  border: "none",
  borderRadius: "10px",
  background: "#e5e7eb",
  color: "#111827",
  cursor: "pointer",
  fontWeight: "700",
}

const btnSalvar = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "10px",
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: "700",
}

const btnAprovar = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "10px",
  background: "#16a34a",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: "700",
}

const btnRecusar = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "10px",
  background: "#ef4444",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: "700",
}
