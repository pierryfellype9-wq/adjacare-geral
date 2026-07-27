import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import jsPDF from "jspdf"
import QRCode from "qrcode"
import "./EBDInternas.css"

export default function EBDAlunos({ user }) {
  const navigate = useNavigate()
  const usuario = user || JSON.parse(localStorage.getItem("user") || "{}")

  const temAcessoEBD =
    usuario?.turma_ebd &&
    usuario?.turma_ebd !== "Não permitido"

  const [turmas, setTurmas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [aba, setAba] = useState("ativos")
  const [busca, setBusca] = useState("")

  const [nome, setNome] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [nomePai, setNomePai] = useState("")
  const [nomeMae, setNomeMae] = useState("")
  const [contato, setContato] = useState("")
  const [observacao, setObservacao] = useState("")
  const [casado, setCasado] = useState("Não")
  const [turmaSelecionada, setTurmaSelecionada] = useState("")

  const [editando, setEditando] = useState(false)
  const [alunoId, setAlunoId] = useState(null)
  const [carregando, setCarregando] = useState(false)

  const podeVerTudoEBD =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    (usuario?.role === "EBD" && usuario?.turma_ebd === "Superintendente")

  const podeGerenciarStatusAluno =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    usuario?.turma_ebd === "Superintendente"

  const turmasPermitidas = Array.isArray(usuario?.turmas_ebd)
    ? usuario.turmas_ebd
    : []

  const professorEBD =
    !podeVerTudoEBD &&
    turmasPermitidas.length > 0

  useEffect(() => {
    if (temAcessoEBD) {
      carregarDados()
    }
  }, [])

  function baixarFicha(tipo) {
    if (tipo === "maiores") {
      window.open("/fichas/ficha-ebd-maiores.pdf", "_blank")
      return
    }

    if (tipo === "menores") {
      window.open("/fichas/ficha-ebd-menores.pdf", "_blank")
    }
  }

  async function carregarDados() {
    const { data: turmasData } = await supabase
      .from("ebd_turmas")
      .select("*")
      .order("idade_min", { ascending: true })

    setTurmas(turmasData || [])

    let query = supabase
      .from("ebd_alunos")
      .select("*, ebd_turmas(id,nome)")
      .order("nome", { ascending: true })

    if (professorEBD) {
      query = query.in("turma_id", turmasPermitidas)
    }

    const { data: alunosData, error } = await query

    if (error) {
      console.error(error)
      alert("Erro ao carregar alunos.")
      return
    }

    setAlunos(alunosData || [])
  }

  function calcularIdade(data) {
    if (!data) return null

    const hoje = new Date()
    const nascimento = new Date(data)

    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const mes = hoje.getMonth() - nascimento.getMonth()

    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--
    }

    return idade
  }

  function gerarEmailPortal(nomeAluno) {
    if (!nomeAluno) return ""

    return (
      nomeAluno
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .trim()
        .replace(/\s+/g, ".") + "@adjacare.org"
    )
  }

  function gerarSenhaPortal(data) {
    if (!data) return ""

    const [ano, mes, dia] = data.split("-")
    return `${dia}${mes}${ano}`
  }

  function encontrarTurmaPorIdade(idade, casadoAluno) {
    if (idade === null) return null

    if (idade <= 2) return turmas.find((t) => t.nome === "Berçário")
    if (idade <= 5) return turmas.find((t) => t.nome === "Maternal")
    if (idade <= 8) return turmas.find((t) => t.nome === "Primários")
    if (idade <= 11) return turmas.find((t) => t.nome === "Juniores")
    if (idade <= 16) return turmas.find((t) => t.nome === "Juvenis")

    if (idade === 17) {
      return turmas.find((t) => t.nome === "Jovens")
    }

    if (idade >= 18) {
      if (casadoAluno === "Sim") {
        return turmas.find((t) => t.nome === "Adultos")
      }

      return turmas.find((t) => t.nome === "Jovens")
    }

    return null
  }

  async function imprimirEtiqueta(aluno) {
    const largura = 90
    const altura = 50
    const linkPortal = "https://sistema.adjacare.org/portal-aluno"

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [largura, altura],
    })

    const turma = aluno.ebd_turmas?.nome || "Sem turma"
    const login = aluno.email_portal || gerarEmailPortal(aluno.nome)
    const senha = aluno.senha_portal || gerarSenhaPortal(aluno.data_nascimento)

    const qrCode = await QRCode.toDataURL(linkPortal, {
      width: 300,
      margin: 1,
    })

    doc.setDrawColor(0)
    doc.roundedRect(2, 2, largura - 4, altura - 4, 2, 2)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text("ESCOLA BÍBLICA DOMINICAL", 6, 7)

    doc.setFontSize(13)
    const nomeQuebrado = doc.splitTextToSize(aluno.nome || "Sem nome", 55)
    doc.text(nomeQuebrado, 6, 15)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text(`Classe: ${turma}`, 6, 25)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text("Portal do aluno", 6, 32)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.text(`Login: ${login || "Não gerado"}`, 6, 37)
    doc.text(`Senha: ${senha || "Não gerada"}`, 6, 42)

    doc.addImage(qrCode, "PNG", 65, 12, 20, 20)

    doc.setFontSize(6)
    doc.text("Aponte a câmera para acessar", 75, 36, {
      align: "center",
    })

    doc.save(`etiqueta-${aluno.nome || "aluno"}.pdf`)
  }

  const idade = dataNascimento ? calcularIdade(dataNascimento) : null
  const emailPortal = gerarEmailPortal(nome)
  const senhaPortal = gerarSenhaPortal(dataNascimento)

  const turmaAutomatica =
    idade !== null ? encontrarTurmaPorIdade(idade, casado) : null

  const turmaFinal = turmaSelecionada
    ? turmas.find((t) => String(t.id) === String(turmaSelecionada))
    : turmaAutomatica

  const alunosAtivos = alunos.filter((aluno) => aluno.ativo !== false)
  const alunosInativos = alunos.filter((aluno) => aluno.ativo === false)

  const alunosDaAba = aba === "ativos" ? alunosAtivos : alunosInativos

  const alunosFiltrados = alunosDaAba.filter((aluno) =>
    aluno.nome?.toLowerCase().includes(busca.toLowerCase())
  )

  function limparFormulario() {
    setNome("")
    setDataNascimento("")
    setNomePai("")
    setNomeMae("")
    setContato("")
    setObservacao("")
    setCasado("Não")
    setTurmaSelecionada("")
    setEditando(false)
    setAlunoId(null)
  }

  function iniciarEdicao(aluno) {
    setEditando(true)
    setAlunoId(aluno.id)
    setNome(aluno.nome || "")
    setDataNascimento(aluno.data_nascimento || "")
    setNomePai(aluno.nome_pai || "")
    setNomeMae(aluno.nome_mae || "")
    setContato(aluno.contato || "")
    setObservacao(aluno.observacao || "")
    setTurmaSelecionada(aluno.turma_id ? String(aluno.turma_id) : "")

    setCasado(aluno.ebd_turmas?.nome === "Adultos" ? "Sim" : "Não")

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  async function cadastrarAluno(e) {
    e.preventDefault()

    if (!temAcessoEBD) {
      alert("Você não possui permissão para alterar esta área.")
      return
    }

    if (!nome.trim()) {
      alert("Informe o nome do aluno.")
      return
    }

    if (!dataNascimento) {
      alert("Informe a data de nascimento do aluno.")
      return
    }

    if (idade !== null && idade < 18) {
      if (!nomePai.trim()) {
        alert("Informe o nome do pai.")
        return
      }

      if (!nomeMae.trim()) {
        alert("Informe o nome da mãe.")
        return
      }

      if (!contato.trim()) {
        alert("Informe o contato do responsável.")
        return
      }
    }

    if (
      professorEBD &&
      turmaFinal &&
      !turmasPermitidas.includes(turmaFinal.id)
    ) {
      alert("Você não possui acesso a essa turma.")
      return
    }

    setCarregando(true)

    const dadosAluno = {
      nome: nome.trim(),
      data_nascimento: dataNascimento || null,
      turma_id: turmaFinal?.id || null,
      nome_pai: nomePai.trim() || null,
      nome_mae: nomeMae.trim() || null,
      contato: contato.trim() || null,
      observacao: observacao.trim() || null,
      email_portal: emailPortal || null,
      senha_portal: senhaPortal || null,
    }

    let error

    if (editando) {
      const resposta = await supabase
        .from("ebd_alunos")
        .update(dadosAluno)
        .eq("id", alunoId)
        .select()

      error = resposta.error

      if (!resposta.data || resposta.data.length === 0) {
        setCarregando(false)
        alert("Nenhum aluno foi atualizado. Verifique as permissões do Supabase.")
        return
      }
    } else {
      const resposta = await supabase.from("ebd_alunos").insert({
        ...dadosAluno,
        ativo: true,
        criado_por: usuario?.nome || "Não identificado",
      })

      error = resposta.error
    }

    setCarregando(false)

    if (error) {
      console.error(error)
      alert(editando ? "Erro ao editar aluno." : "Erro ao cadastrar aluno.")
      return
    }

    if (!editando && contato?.trim()) {
      try {
        await fetch("/api/enviar-whatsapp-aluno", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nome: nome.trim(),
            contato: contato.trim(),
            login: emailPortal,
            senha: senhaPortal,
            turma: turmaFinal?.nome || "Sem turma",
          }),
        })
      } catch (erroWhatsapp) {
        console.error("Erro ao enviar WhatsApp:", erroWhatsapp)
      }
    }

    await carregarDados()
    limparFormulario()

    alert(editando ? "Aluno atualizado com sucesso!" : "Aluno cadastrado com sucesso!")
  }

  async function enviarWhatsappAluno(aluno) {
    try {
      const resposta = await fetch("/api/enviar-whatsapp-aluno", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: aluno.nome,
          contato: aluno.contato,
          login:
            aluno.email_portal ||
            gerarEmailPortal(aluno.nome),

          senha:
            aluno.senha_portal ||
            gerarSenhaPortal(aluno.data_nascimento),

          turma:
            aluno.ebd_turmas?.nome ||
            "Sem turma",
        }),
      })

      if (!resposta.ok) {
        alert("Erro ao enviar mensagem.")
        return
      }

      alert("Mensagem enviada com sucesso.")
    } catch (error) {
      console.error(error)
      alert("Erro ao enviar WhatsApp.")
    }
  }

  async function alterarStatusAluno(aluno) {
    if (!podeGerenciarStatusAluno) {
      alert("Apenas administradores, dirigentes ou superintendente podem alterar o status do aluno.")
      return
    }

    const novoStatus = aluno.ativo === false ? true : false

    const confirmar = confirm(
      novoStatus
        ? `Deseja ativar o aluno ${aluno.nome}?`
        : `Deseja inativar o aluno ${aluno.nome}?`
    )

    if (!confirmar) return

    const { data, error } = await supabase
      .from("ebd_alunos")
      .update({ ativo: novoStatus })
      .eq("id", aluno.id)
      .select()

    if (error) {
      console.error("Erro ao alterar status:", error)
      alert("Erro ao alterar status do aluno: " + error.message)
      return
    }

    if (!data || data.length === 0) {
      alert("Nenhum aluno foi alterado. Verifique se a coluna ativo existe e se as permissões do Supabase permitem update.")
      return
    }

    await carregarDados()

    setAba(novoStatus ? "ativos" : "inativos")
  }

  async function excluirAluno(id) {
    if (!podeVerTudoEBD) {
      alert("Apenas administradores, dirigentes ou superintendente podem excluir alunos.")
      return
    }

    const confirmar = confirm("Deseja excluir este aluno?")
    if (!confirmar) return

    const { error } = await supabase
      .from("ebd_alunos")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(error)
      alert("Erro ao excluir aluno.")
      return
    }

    carregarDados()
  }

  if (!temAcessoEBD) {
    return (
      <div className="page ebd-subpage">
        <button className="btn-voltar" onClick={() => navigate("/ebd")}>
          ← Voltar
        </button>

        <div className="form-card">
          <h2>Acesso não permitido</h2>
          <p>Você não possui permissão para acessar esta área da EBD.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page ebd-subpage ebd-subpage--alunos">
      <button className="btn-voltar" onClick={() => navigate("/ebd")}>
        ← Voltar
      </button>

      <div className="ebd-header">
        <div>
          <h1>Alunos da EBD</h1>
          <p>Cadastro e gerenciamento dos alunos da Escola Bíblica Dominical.</p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginTop: "12px",
          }}
        >
          <button
            type="button"
            onClick={() => baixarFicha("maiores")}
            style={btnFichaStyle}
          >
            Ficha maiores de 18 anos
          </button>

          <button
            type="button"
            onClick={() => baixarFicha("menores")}
            style={btnFichaStyle}
          >
            Ficha menores de 18 anos
          </button>
        </div>
      </div>

      <form className="form-card ebd-form" onSubmit={cadastrarAluno}>
        <div className="form-title-row">
          <div>
            <h2>{editando ? "Editar aluno" : "Cadastrar aluno"}</h2>
            <p>
              Nome e data de nascimento são obrigatórios. Para menores de 18 anos,
              também é obrigatório informar pai, mãe e contato.
            </p>
          </div>
        </div>

        <div className="form-grid-ebd">
          <div>
            <label>Nome do aluno *</label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite o nome"
            />
          </div>

          <div>
            <label>Data de nascimento *</label>
            <input
              required
              type="date"
              value={dataNascimento}
              onChange={(e) => {
                setDataNascimento(e.target.value)
                setCasado("Não")
                setTurmaSelecionada("")
              }}
            />
          </div>
        </div>

        {nome && (
          <div className="info-box ebd-info-box">
            <div>
              <span>Login do aluno</span>
              <strong>{emailPortal}</strong>
            </div>

            <div>
              <span>Senha inicial</span>
              <strong>
                {senhaPortal || "Será gerada após informar a data de nascimento"}
              </strong>
            </div>
          </div>
        )}

        {idade !== null && idade >= 18 && (
          <div>
            <label>É casado?</label>
            <select
              value={casado}
              onChange={(e) => {
                setCasado(e.target.value)
                setTurmaSelecionada("")
              }}
            >
              <option value="Não">Não</option>
              <option value="Sim">Sim</option>
            </select>
          </div>
        )}

        {idade !== null && (
          <>
            <div className="info-box ebd-info-box">
              <div>
                <span>Idade</span>
                <strong>{idade} anos</strong>
              </div>

              <div>
                <span>Classe sugerida</span>
                <strong>{turmaAutomatica?.nome || "Não encontrada"}</strong>
              </div>
            </div>

            <div>
              <label>Classe</label>
              <select
                value={turmaSelecionada || turmaAutomatica?.id || ""}
                onChange={(e) => setTurmaSelecionada(e.target.value)}
              >
                <option value="">Selecione a classe</option>

                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.nome}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="form-grid-ebd">
          <div>
            <label>Nome do pai</label>
            <input
              value={nomePai}
              onChange={(e) => setNomePai(e.target.value)}
              placeholder="Nome do pai"
            />
          </div>

          <div>
            <label>Nome da mãe</label>
            <input
              value={nomeMae}
              onChange={(e) => setNomeMae(e.target.value)}
              placeholder="Nome da mãe"
            />
          </div>

          <div>
            <label>Contato</label>
            <input
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              placeholder="Telefone"
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
            {carregando
              ? "Salvando..."
              : editando
              ? "Salvar alterações"
              : "Cadastrar aluno"}
          </button>

          {editando && (
            <button
              type="button"
              className="btn-cancelar"
              onClick={limparFormulario}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="list-card">
        <div className="list-header">
          <div>
            <h2>
              Alunos cadastrados
              {professorEBD &&
                ` — ${turmasPermitidas.length} turma${
                  turmasPermitidas.length > 1 ? "s" : ""
                }`}
            </h2>

            <p>
              {alunosAtivos.length} ativo{alunosAtivos.length !== 1 ? "s" : ""} ·{" "}
              {alunosInativos.length} inativo{alunosInativos.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="form-actions" style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Pesquisar aluno..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              marginBottom: "15px",
            }}
          />

          <button
            type="button"
            className={aba === "ativos" ? "" : "btn-cancelar"}
            onClick={() => setAba("ativos")}
          >
            Ativos ({alunosAtivos.length})
          </button>

          <button
            type="button"
            className={aba === "inativos" ? "" : "btn-cancelar"}
            onClick={() => setAba("inativos")}
          >
            Inativos ({alunosInativos.length})
          </button>
        </div>

        {alunosFiltrados.length === 0 && (
          <p>
            Nenhum aluno {aba === "ativos" ? "ativo" : "inativo"} cadastrado.
          </p>
        )}

        <div className="alunos-grid">
          {alunosFiltrados.map((aluno) => (
            <div
              className={`aluno-card ${aluno.ativo === false ? "aluno-inativo" : ""}`}
              key={aluno.id}
            >
              <div className="aluno-card-top">
                <div>
                  <h3>{aluno.nome}</h3>

                  <span className="badge-turma">
                    {aluno.ebd_turmas?.nome || "Sem turma"}
                  </span>

                  {aluno.ativo === false && (
                    <span className="badge-turma" style={{ marginLeft: "8px" }}>
                      Inativo
                    </span>
                  )}
                </div>

                <div className="idade-circle">
                  {calcularIdade(aluno.data_nascimento) ?? "--"}
                  <small>anos</small>
                </div>
              </div>

              <div className="aluno-info">
                <p>
                  <strong>Contato:</strong> {aluno.contato || "Não informado"}
                </p>

                <p>
                  <strong>Login:</strong>{" "}
                  {aluno.email_portal || gerarEmailPortal(aluno.nome)}
                </p>

                <p>
                  <strong>Senha:</strong>{" "}
                  {aluno.senha_portal || gerarSenhaPortal(aluno.data_nascimento)}
                </p>

                <p>
                  <strong>Cadastrado por:</strong>{" "}
                  {aluno.criado_por || "Não informado"}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {aluno.ativo === false ? "Inativo" : "Ativo"}
                </p>

                {!aluno.data_nascimento && (
                  <p>
                    <strong>Status do cadastro:</strong> Cadastro incompleto
                  </p>
                )}

                {aluno.observacao && (
                  <p>
                    <strong>Obs.:</strong> {aluno.observacao}
                  </p>
                )}
              </div>

              <div className="aluno-acoes">
                {aluno.ativo !== false && (
                  <button onClick={() => iniciarEdicao(aluno)}>Editar</button>
                )}

                {aluno.ativo !== false && (
                  <button type="button" onClick={() => imprimirEtiqueta(aluno)}>
                    Imprimir etiqueta
                  </button>
                )}

                {aluno.ativo !== false && (
                  <button
                    type="button"
                    onClick={() => enviarWhatsappAluno(aluno)}
                  >
                    Enviar acesso
                  </button>
                )}

                {podeGerenciarStatusAluno && (
                  <button
                    type="button"
                    className={aluno.ativo === false ? "" : "btn-danger"}
                    onClick={() => alterarStatusAluno(aluno)}
                  >
                    {aluno.ativo === false ? "Ativar aluno" : "Inativar aluno"}
                  </button>
                )}

                {podeVerTudoEBD && (
                  <button
                    className="btn-danger"
                    onClick={() => excluirAluno(aluno.id)}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const btnFichaStyle = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "10px",
  background: "#111827",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: "700",
}
