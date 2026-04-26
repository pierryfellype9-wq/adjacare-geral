import { useNavigate } from "react-router-dom"

export default function EBD() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <div className="ebd-hero">
        <h1>Escola Bíblica Dominical</h1>
        <p>Gerencie alunos, chamadas e relatórios em um só lugar.</p>
      </div>

      <div className="ebd-cards">
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
          <div className="icon">📊</div>
          <h3>Relatórios</h3>
          <p>Visualizar frequência e faltas.</p>
        </div>
      </div>
    </div>
  )
}
