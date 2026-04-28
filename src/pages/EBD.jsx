import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function EBD({ user }) {
  const navigate = useNavigate()
  const usuario = user || JSON.parse(localStorage.getItem("user") || "{}")

  const [alertas, setAlertas] = useState([])

  const podeVerTudo =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    usuario?.turma_ebd === "Superintendente"

  const professor =
    usuario?.turma_ebd &&
    usuario?.turma_ebd !== "Superintendente" &&
    usuario?.turma_ebd !== "Não permitido"

  useEffect(() => {
    carregarAlertas()
  }, [])

  async function carregarAlertas() {
    if (!podeVerTudo && !professor) {
      setAlertas([])
      return
    }

    const { data } = await supabase
      .from("ebd_alunos")
      .select(`
        id,
        nome,
        turma_id,
        ebd_turmas(nome),
        ebd_presencas(status)
      `)

    const alunos = data || []
    const alertasTemp = []

    alunos.forEach((aluno) => {
      if (!podeVerTudo && professor) {
        if (aluno.ebd_turmas?.nome !== usuario.turma_ebd) return
      }

      const presencas = aluno.ebd_presencas || []
      const presentes = presencas.filter((p) => p.status === "presente").length
      const total = presencas.length
      const frequencia = total > 0 ? Math.round((presentes / total) * 100) : 0

      if (frequencia > 0 && frequencia < 60) {
        alertasTemp.push({
          id: aluno.id,
          nome: aluno.nome,
          turma: aluno.ebd_turmas?.nome || "Sem turma",
          frequencia,
        })
      }
    })

    setAlertas(alertasTemp)
  }

  return (
    <div className="page">
      {alertas.length > 0 && (
        <div className="ebd-alerta-topo">
          <div className="ebd-alerta-contador">
            {alertas.length}
          </div>

          <div>
            <h3>⚠️ ATENÇÃO: Frequência baixa</h3>

            {alertas.slice(0, 5).map((a) => (
              <div key={a.id} className="ebd-alerta-item-topo">
                ❗ {a.nome} — {a.turma} ({a.frequencia}%)
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ebd-hero">
        <h1>Escola Bíblica Dominical</h1>
        <p>Gerencie alunos, chamadas, relatórios e financeiro em um só lugar.</p>
      </div>

      <div className="ebd-cards">
        <div className="ebd-card" onClick={() => navigate("/ebd/dashboard")}>
          <div className="icon">📊</div>
          <h3>Dashboard</h3>
          <p>Resumo geral da EBD em tempo real.</p>
        </div>

        <div className="ebd-card" onClick={() => navigate("/ebd/financeiro")}>
          <div className="icon">💰</div>
          <h3>Financeiro</h3>
          <p>Controle de revistas e pagamentos.</p>
        </div>

        <div className="ebd-card" onClick={() => navigate("/ebd/alunos")}>
          <div className="icon">👥</div>
          <h3>Alunos</h3>
          <p>Cadastrar, listar e gerenciar alunos.</p>
        </div>

        <div className="ebd-card" onClick={() => navigate("/ebd/chamada")}>
          <div className="icon">📝</div>
          <h3>Chamada</h3>
          <p>Registrar presença dos alunos.</p>
        </div>

        <div className="ebd-card" onClick={() => navigate("/ebd/relatorios")}>
          <div className="icon">📈</div>
          <h3>Relatórios</h3>
          <p>Visualizar frequência e faltas.</p>
        </div>
      </div>
    </div>
  )
}
