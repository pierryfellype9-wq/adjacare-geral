import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { apiFetch } from "../lib/api"
import "./Usuarios.css"

export default function Usuarios({ user }) {
  const [usuarios, setUsuarios] = useState([])
  const [turmas, setTurmas] = useState([])
  const [membros, setMembros] = useState([])

  const [membroId, setMembroId] = useState("")
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [role, setRole] = useState("")
  const [turmaEbd, setTurmaEbd] = useState("")
  const [turmasEbdSelecionadas, setTurmasEbdSelecionadas] = useState([])

  const [editando, setEditando] = useState(false)
  const [usuarioId, setUsuarioId] = useState(null)
  const [busca, setBusca] = useState("")

  function normalizarTexto(valor) {
    return (valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
  }

  function obterUsuarioLocalStorage() {
    const chavesPossiveis = ["user", "usuario", "usuarioLogado", "adjacare_user"]

    for (const chave of chavesPossiveis) {
      try {
        const bruto = localStorage.getItem(chave)
        if (!bruto) continue

        const convertido = JSON.parse(bruto)
        if (convertido && typeof convertido === "object") {
          return convertido
        }
      } catch (error) {
        console.log("Erro ao ler localStorage:", error)
      }
    }

    return null
  }

  const usuarioAtual = user || obterUsuarioLocalStorage()

  const roleUsuario =
    usuarioAtual?.role ||
    usuarioAtual?.departamento ||
    usuarioAtual?.tipo ||
    ""

  const isAdmin = ["administrador", "admin"].includes(
    normalizarTexto(roleUsuario)
  )

  const departamentos = [
    "Administrador",
    "Dirigente",
    "Mídia",
    "Recepção",
    "Secretaria",
    "Sonoplastia",
    "Infantil",
    "Adolescentes",
    "Jovens",
    "EBD",
    "Cofemp",
    "Além-mar",
    "Orquestra e coral",
  ]

  useEffect(() => {
    carregarUsuarios()
    carregarTurmas()
    carregarMembros()
  }, [])

  async function carregarUsuarios() {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("nome", { ascending: true })

    if (error) {
      console.log(error)
      return
    }

    setUsuarios(data || [])
  }

  async function carregarTurmas() {
    const { data, error } = await supabase
      .from("ebd_turmas")
      .select("*")
      .order("idade_min", { ascending: true })

    if (error) {
      console.log(error)
      return
    }

    setTurmas(data || [])
  }

  async function carregarMembros() {
    const { data, error } = await supabase
      .from("membros")
      .select("*")
      .eq("situacao_cadastral", "Ativo")
      .order("nome", { ascending: true })

    if (error) {
      console.log(error)
      return
    }

    setMembros(data || [])
  }

  function limparFormulario() {
    setMembroId("")
    setNome("")
    setEmail("")
    setSenha("")
    setRole("")
    setTurmaEbd("")
    setTurmasEbdSelecionadas([])
    setEditando(false)
    setUsuarioId(null)
  }

  function selecionarMembro(id) {
    setMembroId(id)

    const membroSelecionado = membros.find((m) => m.id === id)

    if (membroSelecionado) {
      setNome(membroSelecionado.nome)
    }
  }

  function alternarTurmaEbd(turmaId) {
    setTurmasEbdSelecionadas((prev) => {
      if (prev.includes(turmaId)) {
        return prev.filter((id) => id !== turmaId)
      }

      return [...prev, turmaId]
    })
  }

  function selecionarTodasTurmas() {
    setTurmasEbdSelecionadas(turmas.map((turma) => turma.id))
  }

  function limparTurmasEbd() {
    setTurmasEbdSelecionadas([])
  }

  function obterNomeTurmaPorId(id) {
    return turmas.find((turma) => turma.id === id)?.nome || ""
  }

  function obterTurmasDoUsuario(usuario) {
    if (Array.isArray(usuario?.turmas_ebd) && usuario.turmas_ebd.length > 0) {
      return usuario.turmas_ebd
        .map((id) => obterNomeTurmaPorId(id))
        .filter(Boolean)
    }

    if (
      usuario?.turma_ebd &&
      usuario.turma_ebd !== "Não permitido" &&
      usuario.turma_ebd !== "Superintendente"
    ) {
      return [usuario.turma_ebd]
    }

    if (usuario?.turma_ebd === "Superintendente") {
      return ["Todas as turmas"]
    }

    return []
  }

  function obterPrimeiraTurmaTexto(ids) {
    if (!ids || ids.length === 0) return "Não permitido"

    const primeiraTurma = turmas.find((turma) => turma.id === ids[0])
    return primeiraTurma?.nome || "Não permitido"
  }

  function usuarioTemAcessoTotalEBD(usuario) {
    return (
      usuario?.role === "Administrador" ||
      usuario?.role === "Dirigente" ||
      usuario?.turma_ebd === "Superintendente"
    )
  }

  async function criarUsuario(e) {
    e.preventDefault()

    if (!isAdmin) {
      alert("Apenas administradores podem criar usuários.")
      return
    }

    if (!nome || !email || !senha || !role) {
      alert("Preencha todos os campos.")
      return
    }

    if (role === "EBD" && turmasEbdSelecionadas.length === 0) {
      alert("Selecione pelo menos uma turma da EBD.")
      return
    }

    const turmaLegada =
  turmasEbdSelecionadas.length > 0
    ? obterPrimeiraTurmaTexto(turmasEbdSelecionadas)
    : "Não permitido"
    
    const { error } = await supabase.from("users").insert([
      {
        membro_id: membroId || null,
        nome,
        email,
        senha,
        role,
        turma_ebd: turmaLegada,
        turmas_ebd: turmasEbdSelecionadas,
        primeiro_acesso: true,
      },
    ])

    if (error) {
      alert(error.message)
      console.log(error)
      return
    }

    await apiFetch("/api/enviar-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        para: email,
        assunto: "Acesso ao Sistema Interno ADJACARÉ",
        mensagem: `
        <p>Olá!</p>

        <p>O Sistema Interno ADJACARÉ já está disponível!</p>

        <p><strong>Acesse pelo link:</strong><br>
        https://sistema.adjacare.org/</p>

        <p>No sistema você poderá:</p>

        <ul>
        <li>Criar pedidos solicitados via WhatsApp para equipe de mídia (artes, vídeos, materiais, etc.)</li>
        <li>Acompanhar o andamento dos pedidos e atualizar status</li>
        <li>Visualizar avisos e informações importantes</li>
        <li>Consultar e alterar a agenda da igreja</li>
        <li>Consultar escalas</li>
        </ul>

        <p><strong>Seus dados de acesso são:</strong></p>

        <p>
        E-mail: ${email}<br>
        Senha: ${senha}
        </p>

        <p><strong>OBS.:</strong> O site ainda está em construção, porém algumas funções já estão disponíveis e novas melhorias serão adicionadas em breve.</p>

        <p>Caso tenha dúvidas ou deseje alterar sua senha, basta responder este e-mail (midia@adjacare.org) solicitando o suporte.</p>

        <br>

        <p>Atenciosamente,<br>
        ADJACARÉ</p>
        `
      })
    })

    limparFormulario()
    carregarUsuarios()
  }

  function iniciarEdicao(u) {
    if (!isAdmin) {
      alert("Apenas administradores podem editar usuários.")
      return
    }

    let turmasDoUsuario = []

    if (Array.isArray(u.turmas_ebd)) {
      turmasDoUsuario = u.turmas_ebd
    } else if (
      u.turma_ebd &&
      u.turma_ebd !== "Não permitido" &&
      u.turma_ebd !== "Superintendente"
    ) {
      const turmaEncontrada = turmas.find((t) => t.nome === u.turma_ebd)
      if (turmaEncontrada) {
        turmasDoUsuario = [turmaEncontrada.id]
      }
    }

    setMembroId(u.membro_id || "")
    setNome(u.nome || "")
    setEmail(u.email || "")
    setSenha(u.senha || "")
    setRole(u.role || "")
    setTurmaEbd(u.turma_ebd || "")
    setTurmasEbdSelecionadas(turmasDoUsuario)
    setUsuarioId(u.id)
    setEditando(true)

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  async function salvarEdicao(e) {
    e.preventDefault()

    if (!isAdmin) {
      alert("Apenas administradores podem editar usuários.")
      return
    }

    if (!nome || !email || !senha || !role) {
      alert("Preencha todos os campos.")
      return
    }

    const turmaLegada =
      role === "EBD"
        ? obterPrimeiraTurmaTexto(turmasEbdSelecionadas)
        : "Não permitido"

    const dadosAtualizados = {
      membro_id: membroId || null,
      nome,
      email,
      senha,
      role,
      turma_ebd: turmaLegada,
turmas_ebd: turmasEbdSelecionadas,
    }

    const { error } = await supabase
      .from("users")
      .update(dadosAtualizados)
      .eq("id", usuarioId)

    if (error) {
      alert(error.message)
      console.log(error)
      return
    }

    const usuarioLogado = obterUsuarioLocalStorage()

    if (usuarioLogado?.id === usuarioId) {
      const usuarioAtualizado = {
        ...usuarioLogado,
        ...dadosAtualizados,
      }

      localStorage.setItem("user", JSON.stringify(usuarioAtualizado))
    }

    limparFormulario()
    carregarUsuarios()
  }

  async function excluirUsuario(id) {
    if (!isAdmin) {
      alert("Apenas administradores podem excluir usuários.")
      return
    }

    if (!confirm("Excluir usuário?")) return

    const { error } = await supabase.from("users").delete().eq("id", id)

    if (error) {
      alert(error.message)
      console.log(error)
      return
    }

    if (usuarioId === id) {
      limparFormulario()
    }

    carregarUsuarios()
  }

  function corBadge(departamento) {
    const valor = normalizarTexto(departamento)

    if (valor === "administrador" || valor === "admin") {
      return { background: "#ede9fe", color: "#6d28d9" }
    }

    if (valor === "dirigente") {
      return { background: "#fee2e2", color: "#b91c1c" }
    }

    if (valor === "midia") {
      return { background: "#dbeafe", color: "#1d4ed8" }
    }

    if (valor === "recepcao") {
      return { background: "#cffafe", color: "#0f766e" }
    }

    if (valor === "secretaria") {
      return { background: "#fef3c7", color: "#92400e" }
    }

    if (valor === "sonoplastia") {
      return { background: "#f3f4f6", color: "#374151" }
    }

    if (valor === "infantil") {
      return { background: "#fce7f3", color: "#be185d" }
    }

    if (valor === "adolescentes") {
      return { background: "#e0e7ff", color: "#4338ca" }
    }

    if (valor === "jovens") {
      return { background: "#dcfce7", color: "#166534" }
    }

    if (valor === "ebd") {
      return { background: "#fde68a", color: "#92400e" }
    }

    if (valor === "cofemp") {
      return { background: "#d1fae5", color: "#065f46" }
    }

    if (valor === "alem-mar" || valor === "alemmar") {
      return { background: "#fbcfe8", color: "#9d174d" }
    }

    if (valor === "orquestra e coral") {
      return { background: "#e9d5ff", color: "#6b21a8" }
    }

    return { background: "#f3f4f6", color: "#374151" }
  }

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const termo = normalizarTexto(busca)
    if (!termo) return true

    return [usuario.nome, usuario.email, usuario.role]
      .some((valor) => normalizarTexto(valor).includes(termo))
  })

  return (
    <main className="usuarios-page">
      <div className="usuarios-conteudo">
        <div
          className="usuarios-hero"
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
            <span className="usuarios-kicker">PESSOAS E ACESSOS</span>
            <h2
              className="subtitle"
              style={{ margin: 0, fontSize: "28px", marginBottom: "6px" }}
            >
              Usuários do sistema
            </h2>

            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
              {isAdmin
                ? "Gerencie os usuários, departamentos e permissões do sistema."
                : "Visualize os usuários cadastrados no sistema."}
            </p>
          </div>

          <div
            className={`usuarios-acesso ${isAdmin ? "admin" : ""}`}
            style={{
              background: isAdmin ? "#dcfce7" : "#f3f4f6",
              color: isAdmin ? "#166534" : "#374151",
              padding: "8px 14px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            {isAdmin ? "Administrador" : "Somente visualização"}
          </div>
        </div>

        {isAdmin && (
          <div
            className={`usuarios-formulario ${editando ? "editando" : ""}`}
            style={{
              background: editando ? "#eff6ff" : "#f8fafc",
              border: editando ? "1px solid #bfdbfe" : "1px solid #e5e7eb",
              borderRadius: "14px",
              padding: "22px",
              marginBottom: "28px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
            }}
          >
            <div className="usuarios-formulario__titulo">
              <span>{editando ? "EDIÇÃO DE ACESSO" : "NOVO ACESSO"}</span>
            <h3
              style={{
                marginTop: 0,
                marginBottom: "18px",
                fontSize: "20px",
                color: "#111827",
              }}
            >
              {editando ? "Editar usuário" : "Novo usuário"}
            </h3>
              <p>Defina os dados, o departamento e as permissões desta pessoa.</p>
            </div>

            <form className="usuarios-form" onSubmit={editando ? salvarEdicao : criarUsuario}>
              <div
                className="usuarios-form__campos"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                }}
              >
                <select
                  value={membroId}
                  onChange={(e) => selecionarMembro(e.target.value)}
                >
                  <option value="">Selecione um membro</option>

                  {membros.map((membro) => (
                    <option key={membro.id} value={membro.id}>
                      {membro.nome}
                    </option>
                  ))}
                </select>

                <input
                  placeholder="Nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />

                <input
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <input
                  type="password"
                  placeholder="Senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />

                <select
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value)

                    if (e.target.value !== "EBD") {
                      setTurmasEbdSelecionadas([])
                      setTurmaEbd("")
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                    boxSizing: "border-box",
                    fontSize: "14px",
                    background: "white",
                  }}
                >
                  <option value="">Selecione o departamento</option>

                  {departamentos.map((dep) => (
                    <option key={dep} value={dep}>
                      {dep}
                    </option>
                  ))}
                </select>
              </div>

              {role && (
                <div
                  className="usuarios-ebd"
                  style={{
                    marginTop: "18px",
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "18px",
                  }}
                >
                  <div
                    className="usuarios-ebd__cabecalho"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                      marginBottom: "14px",
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          color: "#111827",
                        }}
                      >
                        Turmas da EBD
                      </h4>

                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        Selecione uma ou mais turmas que este usuário poderá
                        acessar.
                      </p>
                    </div>

                    <div
                      className="usuarios-ebd__acoes"
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={selecionarTodasTurmas}
                        style={{
                          padding: "8px 12px",
                          border: "none",
                          borderRadius: "8px",
                          background: "#2563eb",
                          color: "#ffffff",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                      >
                        Selecionar todas
                      </button>

                      <button
                        type="button"
                        onClick={limparTurmasEbd}
                        style={{
                          padding: "8px 12px",
                          border: "none",
                          borderRadius: "8px",
                          background: "#e5e7eb",
                          color: "#111827",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  <div
                    className="usuarios-ebd__turmas"
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    {turmas.map((turma) => {
                      const selecionada = turmasEbdSelecionadas.includes(
                        turma.id
                      )

                      return (
                        <label
                          className={`usuarios-turma ${selecionada ? "selecionada" : ""}`}
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
                            background: selecionada ? "#eff6ff" : "#f9fafb",
                            cursor: "pointer",
                            fontWeight: "600",
                            color: selecionada ? "#1d4ed8" : "#374151",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selecionada}
                            onChange={() => alternarTurmaEbd(turma.id)}
                            style={{
                              width: "16px",
                              height: "16px",
                              margin: 0,
                            }}
                          />

                          {turma.nome}
                        </label>
                      )
                    })}
                  </div>

                  {turmasEbdSelecionadas.length > 0 && (
                    <p
                      style={{
                        margin: "14px 0 0",
                        fontSize: "13px",
                        color: "#6b7280",
                      }}
                    >
                      {turmasEbdSelecionadas.length} turma
                      {turmasEbdSelecionadas.length !== 1 ? "s" : ""} selecionada
                      {turmasEbdSelecionadas.length !== 1 ? "s" : ""}.
                    </p>
                  )}
                </div>
              )}

              <div
                className="usuarios-form__acoes"
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "16px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="login-btn"
                  style={{ marginTop: 0, width: "auto" }}
                >
                  {editando ? "Salvar alterações" : "Criar usuário"}
                </button>

                {editando && (
                  <button
                    type="button"
                    onClick={limparFormulario}
                    style={{
                      marginTop: 0,
                      width: "auto",
                      padding: "12px 18px",
                      border: "none",
                      borderRadius: "8px",
                      background: "#e5e7eb",
                      color: "#111827",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        <div
          className="usuarios-listagem"
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
          }}
        >
          <div
            className="usuarios-listagem__cabecalho"
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <span className="usuarios-kicker">DIRETÓRIO</span>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#111827" }}>
                Usuários cadastrados
              </h3>
            </div>

            <div className="usuarios-listagem__filtros">
              <label>
                <span>⌕</span>
                <input
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                  placeholder="Buscar nome, e-mail ou departamento"
                />
              </label>
              <b>
                {usuariosFiltrados.length} usuário{usuariosFiltrados.length !== 1 ? "s" : ""}
              </b>
            </div>
          </div>

          <div className="usuarios-tabela-wrap" style={{ overflowX: "auto" }}>
            <table
              className="usuarios-tabela"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "950px",
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={thStyle}>Nome</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Departamento</th>
                  <th style={thStyle}>Turmas EBD</th>

                  {isAdmin && (
                    <th style={{ ...thStyle, width: "180px" }}>
                      Ações
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={isAdmin ? 5 : 4}
                      style={{
                        padding: "24px 16px",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      {busca ? "Nenhum usuário encontrado." : "Nenhum usuário cadastrado."}
                    </td>
                  </tr>
                )}

                {usuariosFiltrados.map((u, index) => {
                  const badge = corBadge(u.role)
                  const turmasUsuario = obterTurmasDoUsuario(u)

                  return (
                    <tr
                      className="usuario-linha"
                      key={u.id}
                      style={{
                        background: index % 2 === 0 ? "#ffffff" : "#fafafa",
                      }}
                    >
                      <td data-label="Nome" style={tdNomeStyle}>{u.nome}</td>
                      <td data-label="E-mail" style={tdStyle}>{u.email}</td>

                      <td data-label="Departamento" style={tdStyle}>
                        <span
                          style={{
                            background: badge.background,
                            color: badge.color,
                            padding: "6px 10px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: "700",
                            display: "inline-block",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td data-label="Turmas EBD" style={tdStyle}>
                        {turmasUsuario.length === 0 ? (
                          <span style={{ color: "#9ca3af" }}>
                            Não permitido
                          </span>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            {turmasUsuario.map((nomeTurma) => (
                              <span
                                key={nomeTurma}
                                style={{
                                  background: "#eff6ff",
                                  color: "#1d4ed8",
                                  padding: "5px 9px",
                                  borderRadius: "999px",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                }}
                              >
                                {nomeTurma}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {isAdmin && (
                        <td data-label="Ações" style={tdStyle}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => iniciarEdicao(u)}
                              style={btnEditarStyle}
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => excluirUsuario(u.id)}
                              style={btnExcluirStyle}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}

const thStyle = {
  textAlign: "left",
  padding: "14px 16px",
  fontSize: "13px",
  color: "#6b7280",
  borderBottom: "1px solid #e5e7eb",
}

const tdStyle = {
  padding: "16px",
  borderBottom: "1px solid #f1f5f9",
  color: "#4b5563",
  verticalAlign: "top",
}

const tdNomeStyle = {
  padding: "16px",
  borderBottom: "1px solid #f1f5f9",
  fontWeight: "600",
  color: "#111827",
  verticalAlign: "top",
}

const btnEditarStyle = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: "none",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontWeight: "600",
}

const btnExcluirStyle = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: "none",
  background: "#ef4444",
  color: "white",
  cursor: "pointer",
  fontWeight: "600",
}
