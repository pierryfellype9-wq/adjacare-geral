import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function EBDFinanceiro({ user }) {
  const navigate = useNavigate()
  const usuario = user || JSON.parse(localStorage.getItem("user") || "{}")

  const [alunos, setAlunos] = useState([])
  const [registros, setRegistros] = useState([])

  const [alunoId, setAlunoId] = useState("")
  const [descricao, setDescricao] = useState("")
  const [valor, setValor] = useState("")
  const [vencimento, setVencimento] = useState("")
  const [observacao, setObservacao] = useState("")
  const [carregando, setCarregando] = useState(false)

  const temAcessoEBD =
    usuario?.turma_ebd &&
    usuario?.turma_ebd !== "Não permitido"

  const podeVerTudoEBD =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    usuario?.turma_ebd === "Superintendente"

  const professorEBD =
    usuario?.turma_ebd &&
    usuario?.turma_ebd !== "Superintendente" &&
    usuario?.turma_ebd !== "Não permitido"

  useEffect(() => {
    if (temAcessoEBD) carregarDados()
  }, [])

  async function carregarDados() {
    let alunosQuery = supabase
      .from("ebd_alunos")
      .select("id, nome, turma_id, ebd_turmas(nome)")
      .order("nome", { ascending: true })

    if (!podeVerTudoEBD && professorEBD) {
      const { data: turmasData } = await supabase
        .from("ebd_turmas")
        .select("*")
        .eq("nome", usuario.turma_ebd)
        .maybeSingle()

      if (turmasData) {
        alunosQuery = alunosQuery.eq("turma_id", turmasData.id)
      }
    }

    const { data: alunosData } = await alunosQuery

    setAlunos(alunosData || [])

    const idsAlunosPermitidos = (alunosData || []).map((a) => a.id)

    let financeiroQuery = supabase
      .from("ebd_financeiro")
      .select(`
        *,
        ebd_alunos(nome, ebd_turmas(nome))
      `)
      .order("criado_em", { ascending: false })

    if (!podeVerTudoEBD && professorEBD && idsAlunosPermitidos.length > 0) {
      financeiroQuery = financeiroQuery.in("aluno_id", idsAlunosPermitidos)
    }

    const { data: registrosData } = await financeiroQuery

    setRegistros(registrosData || [])
  }

  async function salvarLancamento(e) {
    e.preventDefault()

    if (!alunoId || !descricao || !valor) {
      alert("Preencha aluno, descrição e valor.")
      return
    }

    setCarregando(true)

    const { error } = await supabase.from("ebd_financeiro").insert({
      aluno_id: alunoId,
      descricao,
      valor: Number(valor),
      status: "pendente",
      data_vencimento: vencimento || null,
      observacao: observacao || null,
    })

    setCarregando(false)

    if (error) {
      console.error(error)
      alert("Erro ao salvar lançamento.")
      return
    }

    setAlunoId("")
    setDescricao("")
    setValor("")
    setVencimento("")
    setObservacao("")

    carregarDados()
    alert("Lançamento criado com sucesso!")
  }

  async function marcarComoPago(id) {
    const { error } = await supabase
      .from("ebd_financeiro")
      .update({
        status: "pago",
        data_pagamento: new Date().toISOString().split("T")[0],
      })
      .eq("id", id)

    if (error) {
      console.error(error)
      alert("Erro ao marcar como pago.")
      return
    }

    carregarDados()
  }

  async function marcarComoPendente(id) {
    const { error } = await supabase
      .from("ebd_financeiro")
      .update({
        status: "pendente",
        data_pagamento: null,
      })
      .eq("id", id)

    if (error) {
      console.error(error)
      alert("Erro ao marcar como pendente.")
      return
    }

    carregarDados()
  }

  async function excluirLancamento(id) {
    const confirmar = confirm("Deseja excluir este lançamento?")
    if (!confirmar) return

    const { error } = await supabase
      .from("ebd_financeiro")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(error)
      alert("Erro ao excluir lançamento.")
      return
    }

    carregarDados()
  }

  function statusFinal(item) {
    if (item.status === "pago") return "pago"

    if (item.data_vencimento) {
      const hoje = new Date().toISOString().split("T")[0]
      if (item.data_vencimento < hoje) return "atrasado"
    }

    return "pendente"
  }

  function textoStatus(status) {
    if (status === "pago") return "Pago"
    if (status === "atrasado") return "Atrasado"
    return "Pendente"
  }

  function classeStatus(status) {
    if (status === "pago") return "status-pago"
    if (status === "atrasado") return "status-atrasado"
    return "status-pendente"
  }

  if (!temAcessoEBD) {
    return (
      <div className="page">
        <button className="btn-voltar" onClick={() => navigate("/ebd")}>
          ← Voltar
        </button>

        <div className="form-card">
          <h2>Acesso não permitido</h2>
          <p>Você não possui permissão para acessar o financeiro da EBD.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <button className="btn-voltar" onClick={() => navigate("/ebd")}>
        ← Voltar
      </button>

      <div className="ebd-header">
        <div>
          <h1>Financeiro da EBD</h1>
          <p>Controle de revistas, pagamentos e pendências dos alunos.</p>
        </div>
      </div>

      <form className="form-card ebd-form" onSubmit={salvarLancamento}>
        <div className="form-title-row">
          <div>
            <h2>Novo lançamento</h2>
            <p>Registre revista, material ou outro pagamento da EBD.</p>
          </div>
        </div>

        <div className="form-grid-ebd">
          <div>
            <label>Aluno</label>
            <select value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
              <option value="">Selecione o aluno</option>

              {alunos.map((aluno) => (
                <option key={aluno.id} value={aluno.id}>
                  {aluno.nome} — {aluno.ebd_turmas?.nome || "Sem turma"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Descrição</label>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Revista Adultos"
            />
          </div>

          <div>
            <label>Valor</label>
            <input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ex: 15.00"
            />
          </div>

          <div>
            <label>Data de vencimento</label>
            <input
              type="date"
              value={vencimento}
              onChange={(e) => setVencimento(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label>Observação</label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Observações, se houver"
          />
        </div>

        <div className="form-actions">
          <button disabled={carregando}>
            {carregando ? "Salvando..." : "Salvar lançamento"}
          </button>
        </div>
      </form>

      <div className="list-card">
        <div className="list-header">
          <div>
            <h2>Lançamentos</h2>
            <p>{registros.length} registro{registros.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {registros.length === 0 && <p>Nenhum lançamento cadastrado.</p>}

        <div className="alunos-grid">
          {registros.map((item) => {
            const status = statusFinal(item)

            return (
              <div className="aluno-card" key={item.id}>
                <div className="aluno-card-top">
                  <div>
                    <h3>{item.ebd_alunos?.nome || "Aluno não encontrado"}</h3>
                    <span className="badge-turma">
                      {item.ebd_alunos?.ebd_turmas?.nome || "Sem turma"}
                    </span>
                  </div>

                  <span className={`financeiro-status ${classeStatus(status)}`}>
                    {textoStatus(status)}
                  </span>
                </div>

                <div className="aluno-info">
                  <p><strong>Descrição:</strong> {item.descricao}</p>
                  <p><strong>Valor:</strong> R$ {Number(item.valor || 0).toFixed(2)}</p>

                  {item.data_vencimento && (
                    <p><strong>Vencimento:</strong> {item.data_vencimento}</p>
                  )}

                  {item.data_pagamento && (
                    <p><strong>Pagamento:</strong> {item.data_pagamento}</p>
                  )}

                  {item.observacao && (
                    <p><strong>Obs.:</strong> {item.observacao}</p>
                  )}
                </div>

                <div className="aluno-acoes">
                  {item.status === "pago" ? (
                    <button onClick={() => marcarComoPendente(item.id)}>
                      Marcar pendente
                    </button>
                  ) : (
                    <button onClick={() => marcarComoPago(item.id)}>
                      Marcar pago
                    </button>
                  )}

                  {podeVerTudoEBD && (
                    <button
                      className="btn-danger"
                      onClick={() => excluirLancamento(item.id)}
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
