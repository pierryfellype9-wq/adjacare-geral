import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function EBDSolicitacoesProfessores({ user }) {
  const [solicitacoes, setSolicitacoes] = useState([])
  const [turmas, setTurmas] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)

    const { data: turmasData } = await supabase
      .from("ebd_turmas")
      .select("id, nome")
      .order("nome", { ascending: true })

    const { data: solicitacoesData, error } = await supabase
      .from("ebd_solicitacoes_professores")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
      alert("Erro ao carregar solicitações.")
    }

    setTurmas(turmasData || [])
    setSolicitacoes(solicitacoesData || [])
    setCarregando(false)
  }

  function nomeTurma(id) {
    return turmas.find((t) => t.id === id)?.nome || "Turma não encontrada"
  }

  function primeiraTurmaTexto(ids) {
    if (!ids || ids.length === 0) return "Não permitido"

    const turma = turmas.find((t) => t.id === ids[0])
    return turma?.nome || "Não permitido"
  }

  function gerarSenhaProvisoria() {
    return Math.random().toString(36).slice(-8)
  }

  async function aprovarSolicitacao(solicitacao) {
    if (!confirm(`Aprovar cadastro de ${solicitacao.nome_completo}?`)) return

    const senhaProvisoria = gerarSenhaProvisoria()

    const { error: erroUsuario } = await supabase.from("users").insert([
      {
        membro_id: null,
        nome: solicitacao.nome_completo,
        email: solicitacao.email,
        senha: senhaProvisoria,
        role: "EBD",
        turma_ebd: primeiraTurmaTexto(solicitacao.turmas_ebd),
        turmas_ebd: solicitacao.turmas_ebd,
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
      .eq("id", solicitacao.id)

    if (erroSolicitacao) {
      alert(erroSolicitacao.message)
      console.error(erroSolicitacao)
      return
    }

    alert(
      `Professor aprovado com sucesso!\n\nE-mail: ${solicitacao.email}\nSenha provisória: ${senhaProvisoria}`
    )

    carregarDados()
  }

  async function recusarSolicitacao(id) {
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

    carregarDados()
  }

  function formatarData(data) {
    if (!data) return "-"

    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  function badgeStatus(status) {
    if (status === "Aprovado") {
      return { background: "#dcfce7", color: "#166534" }
    }

    if (status === "Recusado") {
      return { background: "#fee2e2", color: "#991b1b" }
    }

    return { background: "#fef3c7", color: "#92400e" }
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
              Solicitações de Professores
            </h2>

            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
              Aprove ou recuse os cadastros enviados pelos professores da EBD.
            </p>
          </div>

          <span
            style={{
              background: "#eff6ff",
              color: "#1d4ed8",
              padding: "8px 14px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: "700",
            }}
          >
            {solicitacoes.length} solicitação
            {solicitacoes.length !== 1 ? "es" : ""}
          </span>
        </div>

        {carregando ? (
          <p>Carregando solicitações...</p>
        ) : solicitacoes.length === 0 ? (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              padding: "24px",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            Nenhuma solicitação encontrada.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {solicitacoes.map((s) => {
              const badge = badgeStatus(s.status)

              return (
                <div
                  key={s.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "16px",
                    padding: "20px",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                      marginBottom: "14px",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, color: "#111827" }}>
                        {s.nome_completo}
                      </h3>

                      <p
                        style={{
                          margin: "6px 0 0",
                          color: "#6b7280",
                          fontSize: "14px",
                        }}
                      >
                        {s.email} • {s.telefone}
                      </p>
                    </div>

                    <span
                      style={{
                        background: badge.background,
                        color: badge.color,
                        padding: "7px 12px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: "800",
                        height: "fit-content",
                      }}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <Info label="Nascimento" value={formatarData(s.data_nascimento)} />
                    <Info label="Solicitado em" value={formatarData(s.created_at)} />
                  </div>

                  <div style={{ marginBottom: "14px" }}>
                    <strong style={{ fontSize: "14px", color: "#374151" }}>
                      Turmas:
                    </strong>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginTop: "8px",
                      }}
                    >
                      {(s.turmas_ebd || []).map((id) => (
                        <span
                          key={id}
                          style={{
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            padding: "6px 10px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: "700",
                          }}
                        >
                          {nomeTurma(id)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {s.observacoes && (
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "12px",
                        marginBottom: "14px",
                        color: "#4b5563",
                        fontSize: "14px",
                        lineHeight: "1.5",
                      }}
                    >
                      <strong>Observações:</strong>
                      <br />
                      {s.observacoes}
                    </div>
                  )}

                  {s.status === "Pendente" && (
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => aprovarSolicitacao(s)}
                        style={btnAprovar}
                      >
                        Aprovar e criar usuário
                      </button>

                      <button
                        onClick={() => recusarSolicitacao(s.id)}
                        style={btnRecusar}
                      >
                        Recusar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div
      style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "12px",
      }}
    >
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
        {label}
      </div>

      <div style={{ fontWeight: "700", color: "#111827" }}>{value}</div>
    </div>
  )
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
