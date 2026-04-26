import { useNavigate } from "react-router-dom"

export default function EBD() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <h1>EBD</h1>
      <p>Gerenciamento da Escola Bíblica Dominical</p>

      <div className="cards-grid">
        <div className="card" onClick={() => navigate("/ebd/alunos")}>
          <h3>Alunos</h3>
          <p>Cadastrar, listar e excluir alunos.</p>
        </div>

        <div className="card" onClick={() => navigate("/ebd/chamada")}>
          <h3>Chamada</h3>
          <p>Registrar presença dos alunos.</p>
        </div>

        <div className="card" onClick={() => navigate("/ebd/relatorios")}>
          <h3>Relatórios</h3>
          <p>Ver frequência e faltas.</p>
        </div>
      </div>
    </div>
  )
}
