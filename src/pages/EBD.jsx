import { Link } from "react-router-dom"

export default function EBD() {
  return (
    <div className="page">
      <h1>EBD</h1>
      <p>Gerenciamento da Escola Bíblica Dominical</p>

      <div className="cards-grid">
        <Link className="card" to="/ebd/alunos">
          <h3>Alunos</h3>
          <p>Cadastrar, listar e excluir alunos.</p>
        </Link>

        <Link className="card" to="/ebd/chamada">
          <h3>Chamada</h3>
          <p>Registrar presença dos alunos.</p>
        </Link>

        <Link className="card" to="/ebd/relatorios">
          <h3>Relatórios</h3>
          <p>Ver frequência e faltas.</p>
        </Link>
      </div>
    </div>
  )
}
