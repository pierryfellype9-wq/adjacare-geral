import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"
import "./SenhasAplicativos.css"

const FORMULARIO_VAZIO = {
  id: "",
  nome_app: "",
  categoria: "",
  login: "",
  senha: "",
  link: "",
  observacoes: "",
}

export default function SenhasAplicativos({ user }) {
  const role = user?.role || ""
  const nomeUsuario = user?.nome || "Usuário"
  const podeEntrar = role === "Administrador" || role === "Mídia"
  const podeEditar = role === "Administrador"

  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas")
  const [categorias, setCategorias] = useState([])
  const [busca, setBusca] = useState("")
  const [modalAberto, setModalAberto] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [senhasVisiveis, setSenhasVisiveis] = useState({})
  const [form, setForm] = useState(FORMULARIO_VAZIO)

  async function obterToken() {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error("Sua sessão expirou. Entre novamente.")
    return token
  }

  async function carregarItens() {
    setLoading(true)

    try {
      const token = await obterToken()
      const url = categoriaFiltro !== "Todas"
        ? `/api/app-credentials?categoria=${encodeURIComponent(categoriaFiltro)}`
        : "/api/app-credentials"

      const resposta = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await resposta.json()

      if (!resposta.ok) throw new Error(data.error || "Erro ao carregar acessos.")

      setItens(data || [])
      setCategorias([
        "Todas",
        ...new Set((data || []).map((item) => item.categoria).filter(Boolean)),
      ])
    } catch (error) {
      console.error(error)
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (podeEntrar) carregarItens()
  }, [categoriaFiltro, podeEntrar])

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR")
    if (!termo) return itens

    return itens.filter((item) => (
      [item.nome_app, item.categoria, item.login, item.observacoes]
        .some((valor) => (valor || "").toLocaleLowerCase("pt-BR").includes(termo))
    ))
  }, [busca, itens])

  function abrirNovo() {
    setModoEdicao(false)
    setForm(FORMULARIO_VAZIO)
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

  function atualizarCampo(evento) {
    const { name, value } = evento.target
    setForm((anterior) => ({ ...anterior, [name]: value }))
  }

  async function salvar(evento) {
    evento.preventDefault()
    if (!podeEditar || salvando) return
    setSalvando(true)

    try {
      const token = await obterToken()
      const resposta = await fetch("/api/app-credentials", {
        method: modoEdicao ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, usuario: nomeUsuario }),
      })
      const data = await resposta.json()

      if (!resposta.ok) throw new Error(data.error || "Erro ao salvar acesso.")

      fecharModal()
      await carregarItens()
    } catch (error) {
      console.error(error)
      alert(error.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id) {
    if (!podeEditar || !window.confirm("Deseja excluir este acesso?")) return

    try {
      const token = await obterToken()
      const resposta = await fetch("/api/app-credentials", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      })
      const data = await resposta.json()

      if (!resposta.ok) throw new Error(data.error || "Erro ao excluir acesso.")
      await carregarItens()
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
    setSenhasVisiveis((anterior) => ({ ...anterior, [id]: !anterior[id] }))
  }

  if (!podeEntrar) {
    return (
      <main className="cofre-page">
        <section className="cofre-sem-acesso">
          <span>⌑</span>
          <h2>Área protegida</h2>
          <p>Esta área é permitida apenas para Mídia e Administradores.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="cofre-page">
      <section className="cofre-hero">
        <div>
          <span className="cofre-kicker">COFRE DIGITAL • ADJACARÉ</span>
          <h1>Acessos da equipe</h1>
          <p>
            Encontre com segurança os logins de aplicativos, plataformas e
            softwares utilizados no trabalho da igreja.
          </p>
          {podeEditar ? (
            <button type="button" onClick={abrirNovo}><b>＋</b> Cadastrar acesso</button>
          ) : (
            <div className="cofre-consulta"><b>✓</b><span><strong>Modo consulta</strong>Você pode visualizar e copiar os acessos.</span></div>
          )}
        </div>
        <div className="cofre-hero__cadeado" aria-hidden="true"><span>●</span><b>⌑</b></div>
        <i className="cofre-circulo um" /><i className="cofre-circulo dois" />
      </section>

      <section className="cofre-resumo">
        <article><span className="azul">⌑</span><div><small>Acessos guardados</small><strong>{itens.length}</strong></div></article>
        <article><span className="roxo">▦</span><div><small>Categorias</small><strong>{Math.max(0, categorias.length - 1)}</strong></div></article>
        <article><span className="verde">✓</span><div><small>Seu nível</small><strong>{podeEditar ? "Gestão" : "Consulta"}</strong></div></article>
      </section>

      <section className="cofre-conteudo">
        <header>
          <div>
            <span className="cofre-kicker">CREDENCIAIS CADASTRADAS</span>
            <h2>Aplicativos e softwares</h2>
            <p>Use os filtros para encontrar rapidamente o acesso necessário.</p>
          </div>
          <div className="cofre-filtros">
            <label className="cofre-busca"><span>⌕</span><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aplicativo ou login" /></label>
            <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)}>
              {(categorias.length ? categorias : ["Todas"]).map((categoria) => (
                <option key={categoria} value={categoria}>{categoria}</option>
              ))}
            </select>
          </div>
        </header>

        {loading ? (
          <div className="cofre-estado"><span className="carregando">⌑</span><p>Carregando acessos...</p></div>
        ) : itensFiltrados.length === 0 ? (
          <div className="cofre-estado"><span>⌕</span><h3>Nenhum acesso encontrado</h3><p>Tente alterar a busca ou a categoria selecionada.</p></div>
        ) : (
          <div className="cofre-grid">
            {itensFiltrados.map((item) => (
              <article className="cofre-card" key={item.id}>
                <header>
                  <div className="cofre-card__icone">{(item.nome_app || "A").charAt(0).toUpperCase()}</div>
                  <div><h3>{item.nome_app}</h3><span>{item.categoria || "Sem categoria"}</span></div>
                  {podeEditar && <button type="button" aria-label="Editar" onClick={() => abrirEdicao(item)}>✎</button>}
                </header>

                <div className="cofre-dado">
                  <small>LOGIN OU E-MAIL</small>
                  <div><span>{item.login || "Não informado"}</span><button type="button" onClick={() => copiarTexto(item.login, "Login copiado com sucesso.")}>Copiar</button></div>
                </div>

                <div className="cofre-dado senha">
                  <small>SENHA</small>
                  <div><span>{senhasVisiveis[item.id] ? item.senha : "••••••••••"}</span><button type="button" onClick={() => alternarSenha(item.id)}>{senhasVisiveis[item.id] ? "Ocultar" : "Ver"}</button><button type="button" onClick={() => copiarTexto(item.senha, "Senha copiada com sucesso.")}>Copiar</button></div>
                </div>

                {item.observacoes && <p className="cofre-observacao">{item.observacoes}</p>}

                <footer>
                  <span>Atualizado por <strong>{item.updated_by || item.created_by || "Sistema"}</strong></span>
                  <div>
                    {item.link && <a href={item.link} target="_blank" rel="noreferrer">Abrir site ↗</a>}
                    {podeEditar && <button type="button" onClick={() => excluir(item.id)}>Excluir</button>}
                  </div>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      {modalAberto && (
        <div className="cofre-modal" onClick={fecharModal}>
          <article onClick={(evento) => evento.stopPropagation()}>
            <header>
              <div><span className="cofre-kicker">{modoEdicao ? "EDITAR CREDENCIAL" : "NOVA CREDENCIAL"}</span><h2>{modoEdicao ? "Atualizar acesso" : "Guardar novo acesso"}</h2><p>Preencha as informações que a equipe precisará consultar.</p></div>
              <button type="button" onClick={fecharModal}>×</button>
            </header>

            <form onSubmit={salvar}>
              <label><span>Nome do aplicativo *</span><input name="nome_app" placeholder="Ex.: Instagram" value={form.nome_app} onChange={atualizarCampo} required /></label>
              <label><span>Categoria</span><input name="categoria" placeholder="Ex.: Redes sociais" value={form.categoria} onChange={atualizarCampo} /></label>
              <label><span>Login ou e-mail</span><input name="login" placeholder="Login de acesso" value={form.login} onChange={atualizarCampo} /></label>
              <label><span>Senha *</span><input name="senha" placeholder="Senha do aplicativo" value={form.senha} onChange={atualizarCampo} required /></label>
              <label className="largo"><span>Link</span><input name="link" placeholder="https://..." value={form.link} onChange={atualizarCampo} /></label>
              <label className="largo"><span>Observações</span><textarea name="observacoes" placeholder="Informações adicionais..." value={form.observacoes} onChange={atualizarCampo} rows={4} /></label>
              <footer className="largo"><button type="button" className="secundario" onClick={fecharModal}>Cancelar</button><button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar no cofre"} <span>→</span></button></footer>
            </form>
          </article>
        </div>
      )}
    </main>
  )
}
