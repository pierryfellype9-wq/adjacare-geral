import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function EBDSolicitacoesProfessores() {
  const navigate = useNavigate()

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
              Visualize, edite, aprove ou recuse os cadastros enviados pelos
              professores da EBD.
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
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginBottom: "14px",
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

                  <p
                    style={{
                      margin: "0 0 14px",
                      color: "#6b7280",
                      fontSize: "13px",
                    }}
                  >
                    Solicitado em {formatarData(s.created_at)}
                  </p>

                  <button
                    onClick={() =>
                      navigate(`/ebd/solicitacoes-professores/${s.id}`)
                    }
                    style={btnVisualizar}
                  >
                    Visualizar solicitação
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const btnVisualizar = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "10px",
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: "700",
}
