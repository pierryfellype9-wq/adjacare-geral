import { useEffect, useMemo, useState } from "react"

  export default function SenhasAplicativos({ user }) {
  const role = user?.role || ""
  const nomeUsuario = user?.nome || "Usuário"

  const podeEntrar =
    role === "Administrador" ||
    role === "Mídia"

  const podeEditar =
    role === "Administrador" ||
    role === "Mídia"

  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas")
  const [categorias, setCategorias] = useState([])
  const [modalAberto, setModalAberto] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [senhasVisiveis, setSenhasVisiveis] = useState({})
  const [form, setForm] = useState({
    id: "",
    nome_app: "",
    categoria: "",
    login: "",
    senha: "",
    link: "",
    observacoes: "",
  })

  async function carregarItens() {
    setLoading(true)
    try {
      const url =
        categoriaFiltro && categoriaFiltro !== "Todas"
          ? `/api/app-credentials?categoria=${encodeURIComponent(categoriaFiltro)}`
          : "/api/app-credentials"

      const res = await fetch(url)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Erro ao carregar acessos.")

      setItens(data || [])

      const listaCategorias = [
        "Todas",
        ...new Set((data || []).map((item) => item.categoria).filter(Boolean)),
      ]
      setCategorias(listaCategorias)
    } catch (error) {
      console.error(error)
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (podeEntrar) {
      carregarItens()
    }
  }, [categoriaFiltro])

  function abrirNovo() {
    setModoEdicao(false)
    setForm({
      id: "",
      nome_app: "",
      categoria: "",
      login: "",
      senha: "",
      link: "",
      observacoes: "",
    })
    setModalAberto(true)
  }

  function abrirEdicao(item) {
    setModoEdicao(true)
    setForm({
      id: item.id,
      nome_app: item.nome_app || "",
      categoria: item.categoria || "",
      login: item.login || "",
      senha: item.senha || "",
      link: item.link || "",
      observacoes: item.observacoes || "",
    })
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setModoEdicao(false)
  }

  function atualizarCampo(e) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)

    try {
      const method = modoEdicao ? "PUT" : "POST"

      const res = await fetch("/api/app-credentials", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          usuario: nomeUsuario,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Erro ao salvar acesso.")

      fecharModal()
      carregarItens()
    } catch (error) {
      console.error(error)
      alert(error.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id) {
    const confirmar = window.confirm("Deseja excluir este acesso?")
    if (!confirmar) return

    try {
      const res = await fetch("/api/app-credentials", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Erro ao excluir acesso.")

      carregarItens()
    } catch (error) {
      console.error(error)
      alert(error.message)
    }
  }

  async function copiarTexto(texto, mensagem) {
    try {
      await navigator.clipboard.writeText(texto || "")
      alert(mensagem)
    } catch {
      alert("Não foi possível copiar.")
    }
  }

  function alternarSenha(id) {
    setSenhasVisiveis((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  if (!podeEntrar) {
    return (
      <div className="senhas-page">
        <div className="senhas-card">
          <h2>Sem acesso</h2>
          <p>Esta área é permitida apenas para Mídia e Administradores.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="senhas-page">
      <div className="senhas-card">
        <div className="senhas-topo">
          <div>
            <h1>Senhas Aplicativos e Softwares</h1>
            <p>Acessos da equipe de mídia.</p>
          </div>

          {podeEditar && (
            <button className="btn" onClick={abrirNovo}>
              Novo acesso
            </button>
          )}
        </div>

        <div className="senhas-filtros">
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="input"
          >
            {categorias.length > 0 ? (
              categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))
            ) : (
              <option value="Todas">Todas</option>
            )}
          </select>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : itens.length === 0 ? (
          <p>Nenhum acesso cadastrado.</p>
        ) : (
          <div className="senhas-grid">
            {itens.map((item) => (
              <div className="acesso-card" key={item.id}>
                <div className="acesso-header">
                  <h3>{item.nome_app}</h3>
                  {item.categoria && (
                    <span className="badge-categoria">{item.categoria}</span>
                  )}
                </div>

                <div className="acesso-linha">
                  <strong>Login:</strong>
                  <span>{item.login || "-"}</span>
                </div>

                <div className="acesso-linha senha-linha">
                  <strong>Senha:</strong>
                  <span>
                    {senhasVisiveis[item.id] ? item.senha : "••••••••"}
                  </span>
                </div>

                <div className="acesso-linha">
                  <strong>Link:</strong>
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noreferrer">
                      Abrir link
                    </a>
                  ) : (
                    <span>-</span>
                  )}
                </div>

                <div className="acesso-linha acesso-observacao">
                  <strong>Observação:</strong>
                  <span>{item.observacoes || "-"}</span>
                </div>

                <div className="acesso-linha">
                  <strong>Atualizado por:</strong>
                  <span>{item.updated_by || item.created_by || "-"}</span>
                </div>

                <div className="acesso-acoes">
                  <button
                    className="btn-secundario"
                    onClick={() => alternarSenha(item.id)}
                  >
                    {senhasVisiveis[item.id] ? "Ocultar senha" : "Ver senha"}
                  </button>

                  <button
                    className="btn-secundario"
                    onClick={() =>
                      copiarTexto(item.login, "Login copiado com sucesso.")
                    }
                  >
                    Copiar login
                  </button>

                  <button
                    className="btn-secundario"
                    onClick={() =>
                      copiarTexto(item.senha, "Senha copiada com sucesso.")
                    }
                  >
                    Copiar senha
                  </button>

                  {podeEditar && (
                    <button
                      className="btn-secundario"
                      onClick={() => abrirEdicao(item)}
                    >
                      Editar
                    </button>
                  )}

                  {podeEditar && (
                    <button
                      className="btn-excluir"
                      onClick={() => excluir(item.id)}
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>{modoEdicao ? "Editar acesso" : "Novo acesso"}</h2>

            <form onSubmit={salvar} className="form-grid">
              <input
                className="input"
                type="text"
                name="nome_app"
                placeholder="Nome do app"
                value={form.nome_app}
                onChange={atualizarCampo}
                required
              />

              <input
                className="input"
                type="text"
                name="categoria"
                placeholder="Categoria"
                value={form.categoria}
                onChange={atualizarCampo}
              />

              <input
                className="input"
                type="text"
                name="login"
                placeholder="Login ou e-mail"
                value={form.login}
                onChange={atualizarCampo}
              />

              <input
                className="input"
                type="text"
                name="senha"
                placeholder="Senha"
                value={form.senha}
                onChange={atualizarCampo}
                required
              />

              <input
                className="input"
                type="text"
                name="link"
                placeholder="Link"
                value={form.link}
                onChange={atualizarCampo}
              />

              <textarea
                className="input"
                name="observacoes"
                placeholder="Observações"
                value={form.observacoes}
                onChange={atualizarCampo}
                rows={4}
              />

              <div className="modal-acoes">
                <button
                  type="button"
                  className="btn-secundario"
                  onClick={fecharModal}
                >
                  Cancelar
                </button>

                <button type="submit" className="btn" disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
