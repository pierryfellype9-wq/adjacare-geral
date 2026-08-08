import { notificar, confirmarAcao } from "../lib/feedback"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { apiFetch } from "../lib/api"
import "./EBDInternas.css"

export default function EBDSolicitacaoProfessor({ user }) {
  const navigate = useNavigate()
  const { id } = useParams()

  const [turmas, setTurmas] = useState([])
  const [membros, setMembros] = useState([])
  const [membroId, setMembroId] = useState("")
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

    const { data: membrosData } = await supabase
      .from("membros")
      .select("id,nome,telefone")
      .eq("situacao_cadastral", "Ativo")
      .order("nome", { ascending: true })

    const { data: solicitacaoData, error } = await supabase
      .from("ebd_solicitacoes_professores")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !solicitacaoData) {
      console.error(error)
      notificar("Solicitação não encontrada.")
      navigate("/ebd/solicitacoes-professores")
      return
    }

    setTurmas(turmasData || [])
    setMembros(membrosData || [])

    if (solicitacaoData.status === "Aprovado") {
      const { data: usuarioCriado } = await supabase
        .from("users")
        .select("membro_id")
        .ilike("email", solicitacaoData.email || "")
        .maybeSingle()

      setMembroId(usuarioCriado?.membro_id || "")
    } else {
      const nomeSolicitante = (solicitacaoData.nome_completo || "")
        .trim()
        .toLocaleLowerCase("pt-BR")
      const membroCorrespondente = (membrosData || []).find(
        (membro) => membro.nome?.trim().toLocaleLowerCase("pt-BR") === nomeSolicitante
      )
      setMembroId(membroCorrespondente?.id || "")
    }

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

  function validarFormulario() {
    if (!form.nome_completo.trim()) {
      notificar("Informe o nome completo.")
      return false
    }

    if (!form.data_nascimento) {
      notificar("Informe a data de nascimento.")
      return false
    }

    if (!form.telefone.trim()) {
      notificar("Informe o telefone.")
      return false
    }

    if (!form.email.trim()) {
      notificar("Informe o e-mail.")
      return false
    }

    if (form.turmas_ebd.length === 0) {
      notificar("Selecione pelo menos uma turma.")
      return false
    }

    return true
  }

  function primeiraTurmaTexto(ids) {
    if (!ids || ids.length === 0) return "Não permitido"

    const turma = turmas.find((t) => t.id === ids[0])
    return turma?.nome || "Não permitido"
  }

  function gerarSenhaProvisoria() {
    return `ADJ${Math.floor(100000 + Math.random() * 900000)}`
  }

  async function salvarSolicitacao(mostrarAlerta = true) {
    if (!validarFormulario()) return false

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
      notificar(error.message)
      return false
    }

    if (mostrarAlerta) {
      notificar("Solicitação salva com sucesso.")
    }

    return true
  }

  async function enviarEmailAprovacao(senhaProvisoria) {
    const resposta = await apiFetch("/api/enviar-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        para: form.email.trim(),
        assunto: "SISTEMA ADJACARÉ - Acesso ao sistema aprovado",
        mensagem: `
          <p>Olá, ${form.nome_completo.trim()}!</p>

          <p>Seu cadastro como professor da Escola Bíblica Dominical foi aprovado.</p>

          <p><strong>Acesse o Portal ADJACARÉ pelo link:</strong><br>
          https://sistema.adjacare.org/</p>

          <p><strong>Seus dados de acesso são:</strong></p>

          <p>
            E-mail: ${form.email.trim()}<br>
            Senha provisória: ${senhaProvisoria}
          </p>

          <p>No primeiro acesso, o sistema solicitará que você crie uma nova senha.</p>

          <br>

          <p>Atenciosamente,<br>
          Departamento de EBD - ADJACARÉ.</p>
        `,
      }),
    })

    const resultado = await resposta.json().catch(() => null)

    if (!resposta.ok) {
      throw new Error(
        resultado?.error || "Erro ao enviar e-mail de aprovação."
      )
    }

    return resultado
  }

  async function aprovarSolicitacao() {
    const membroSelecionado = membros.find(
      (membro) => String(membro.id) === String(membroId)
    )

    if (!membroSelecionado) {
      notificar("Selecione o membro que receberá este acesso antes de aprovar.")
      return
    }

    if (!await confirmarAcao(`Aprovar cadastro de ${form.nome_completo} e vincular ao membro ${membroSelecionado.nome}?`)) return

    const salvou = await salvarSolicitacao(false)
    if (!salvou) return

    const senhaProvisoria = gerarSenhaProvisoria()

    const { error: erroUsuario } = await supabase.from("users").insert([
      {
        membro_id: membroId,
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
      notificar(erroUsuario.message)
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
      notificar(erroSolicitacao.message)
      console.error(erroSolicitacao)
      return
    }

    try {
      await enviarEmailAprovacao(senhaProvisoria)

      notificar(
        `Professor aprovado com sucesso!\n\nO e-mail com os dados de acesso foi enviado para:\n${form.email}`
      )
    } catch (error) {
      console.error("Erro ao enviar e-mail:", error)

      notificar(
        `Professor aprovado e usuário criado, mas o e-mail não foi enviado.\n\nE-mail: ${form.email}\nSenha provisória: ${senhaProvisoria}\n\nErro: ${error.message}`
      )
    }

    navigate("/ebd/solicitacoes-professores")
  }

  async function recusarSolicitacao() {
    if (!await confirmarAcao("Recusar esta solicitação?")) return

    const { error } = await supabase
      .from("ebd_solicitacoes_professores")
      .update({ status: "Recusado" })
      .eq("id", id)

    if (error) {
      notificar(error.message)
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
      <div className="main ebd-subpage ebd-subpage--solicitacao">
        <div className="card">
          <p>Carregando solicitação...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="main ebd-subpage ebd-subpage--solicitacao">
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

          <div className="ebd-vinculo-membro">
            <div>
              <span>VÍNCULO DO ACESSO</span>
              <h3>Selecione o membro responsável por este usuário *</h3>
              <p>
                Ao aprovar, o acesso de professor ficará ligado diretamente ao cadastro
                escolhido na aba Membros.
              </p>
            </div>

            <select
              value={membroId}
              onChange={(e) => setMembroId(e.target.value)}
              disabled={form.status !== "Pendente"}
              required
            >
              <option value="">Selecione um membro</option>
              {membros.map((membro) => (
                <option key={membro.id} value={membro.id}>
                  {membro.nome}{membro.telefone ? ` — ${membro.telefone}` : ""}
                </option>
              ))}
            </select>

            {membroId && (
              <small>✓ Este membro será vinculado ao acesso quando você aprovar.</small>
            )}
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
                      cursor:
                        form.status === "Pendente" ? "pointer" : "default",
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
                onClick={() => salvarSolicitacao(true)}
                style={btnSalvar}
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>

              <button onClick={aprovarSolicitacao} style={btnAprovar}>
                Aprovar e enviar e-mail
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
