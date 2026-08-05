import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import SecretariaCabecalho from "../components/SecretariaCabecalho"
import { supabase } from "../lib/supabase"

const FORM_INICIAL = {
  nome: "",
  data_nascimento: "",
  telefone: "",
  sexo: "",
  estado_civil: "",
  batizado_aguas: false,
  situacao_cadastral: "Ativo",
  observacao: "",
}

function formatarData(data) {
  if (!data) return "Não informado"
  return data.split("-").reverse().join("/")
}

function SeletorFuncoes({ funcoes, selecionadas, onChange }) {
  const [busca, setBusca] = useState("")
  const filtradas = funcoes.filter((funcao) =>
    `${funcao.nome} ${funcao.categoria}`
      .toLocaleLowerCase("pt-BR")
      .includes(busca.toLocaleLowerCase("pt-BR")),
  )

  function alternar(id) {
    onChange(
      selecionadas.includes(id)
        ? selecionadas.filter((item) => item !== id)
        : [...selecionadas, id],
    )
  }

  return (
    <div className="secretaria-funcoes secretaria-campo-largo">
      <div className="secretaria-funcoes-topo">
        <div>
          <span>Funções na igreja</span>
          <small>O membro pode exercer mais de uma função.</small>
        </div>
        <b>{selecionadas.length} selecionada(s)</b>
      </div>
      <input
        type="search"
        placeholder="Buscar função ou departamento"
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
      />
      <div className="secretaria-funcoes-lista">
        {filtradas.map((funcao) => (
          <label
            className={selecionadas.includes(funcao.id) ? "selecionada" : ""}
            key={funcao.id}
          >
            <input
              type="checkbox"
              checked={selecionadas.includes(funcao.id)}
              onChange={() => alternar(funcao.id)}
            />
            <span><strong>{funcao.nome}</strong><small>{funcao.categoria}</small></span>
          </label>
        ))}
      </div>
    </div>
  )
}

export default function Membros({ user }) {
  const navigate = useNavigate()
  const [membros, setMembros] = useState([])
  const [funcoes, setFuncoes] = useState([])
  const [funcoesSelecionadas, setFuncoesSelecionadas] = useState([])
  const [form, setForm] = useState(FORM_INICIAL)
  const [formAberto, setFormAberto] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [pesquisa, setPesquisa] = useState("")
  const [filtroSituacao, setFiltroSituacao] = useState("Ativo")

  async function carregar() {
    setCarregando(true)
    const [membrosResposta, funcoesResposta] = await Promise.all([
      supabase
        .from("membros")
        .select("*, membro_funcoes(id,funcao_id,ativo,secretaria_funcoes(id,nome,categoria))")
        .order("nome"),
      supabase
        .from("secretaria_funcoes")
        .select("id,nome,categoria")
        .eq("ativa", true)
        .order("categoria")
        .order("nome"),
    ])

    if (membrosResposta.error || funcoesResposta.error) {
      alert("Não foi possível carregar todos os dados dos membros.")
    }
    setMembros(membrosResposta.data || [])
    setFuncoes(funcoesResposta.data || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  function limparFormulario() {
    setForm(FORM_INICIAL)
    setFuncoesSelecionadas([])
    setEditandoId(null)
    setFormAberto(false)
  }

  async function sincronizarFuncoes(membroId) {
    const { data: atuais, error } = await supabase
      .from("membro_funcoes")
      .select("id,funcao_id")
      .eq("membro_id", membroId)
      .eq("ativo", true)

    if (error) throw error
    const idsAtuais = (atuais || []).map((item) => item.funcao_id)
    const remover = (atuais || []).filter(
      (item) => !funcoesSelecionadas.includes(item.funcao_id),
    )
    const adicionar = funcoesSelecionadas.filter((id) => !idsAtuais.includes(id))

    if (remover.length) {
      const { error: erroRemover } = await supabase
        .from("membro_funcoes")
        .update({ ativo: false, data_fim: new Date().toLocaleDateString("en-CA") })
        .in("id", remover.map((item) => item.id))
      if (erroRemover) throw erroRemover
    }

    if (adicionar.length) {
      const { error: erroAdicionar } = await supabase.from("membro_funcoes").insert(
        adicionar.map((funcaoId) => ({
          membro_id: membroId,
          funcao_id: funcaoId,
          data_inicio: new Date().toLocaleDateString("en-CA"),
          criado_por: user?.nome || user?.email,
        })),
      )
      if (erroAdicionar) throw erroAdicionar
    }
  }

  async function salvarMembro(event) {
    event.preventDefault()
    if (salvando) return
    setSalvando(true)

    try {
      let membroId = editandoId
      if (editandoId) {
        const { error } = await supabase.from("membros").update(form).eq("id", editandoId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("membros")
          .insert({ ...form, criado_por: user?.nome || user?.email })
          .select("id")
          .single()
        if (error) throw error
        membroId = data.id
      }

      await sincronizarFuncoes(membroId)
      alert(editandoId ? "Membro atualizado." : "Membro cadastrado.")
      limparFormulario()
      await carregar()
    } catch (error) {
      console.error(error)
      alert(`Não foi possível salvar o cadastro: ${error.message || "erro inesperado"}`)
    } finally {
      setSalvando(false)
    }
  }

  function editarMembro(membro) {
    setEditandoId(membro.id)
    setForm({
      nome: membro.nome || "",
      data_nascimento: membro.data_nascimento || "",
      telefone: membro.telefone || "",
      sexo: membro.sexo || "",
      estado_civil: membro.estado_civil || "",
      batizado_aguas: Boolean(membro.batizado_aguas),
      situacao_cadastral: membro.situacao_cadastral || "Ativo",
      observacao: membro.observacao || "",
    })
    setFuncoesSelecionadas(
      (membro.membro_funcoes || [])
        .filter((item) => item.ativo)
        .map((item) => item.funcao_id),
    )
    setFormAberto(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function criarAcesso(membro) {
    localStorage.setItem("membroSelecionado", JSON.stringify(membro))
    navigate("/usuarios")
  }

  const membrosFiltrados = useMemo(
    () =>
      membros.filter(
        (membro) =>
          (filtroSituacao === "Todos" || membro.situacao_cadastral === filtroSituacao) &&
          `${membro.nome} ${membro.telefone || ""}`
            .toLocaleLowerCase("pt-BR")
            .includes(pesquisa.toLocaleLowerCase("pt-BR")),
      ),
    [membros, filtroSituacao, pesquisa],
  )

  return (
    <div className="page secretaria-page">
      <SecretariaCabecalho
        ativa="membros"
        titulo="Membros"
        descricao="Cadastros, funções e situação de cada pessoa da igreja."
        acao={
          <button
            className="secretaria-botao-claro"
            onClick={() => {
              if (formAberto) limparFormulario()
              else setFormAberto(true)
            }}
          >
            {formAberto ? "Fechar cadastro" : "+ Novo membro"}
          </button>
        }
      />

      {formAberto && (
        <section className="secretaria-bloco secretaria-formulario-bloco">
          <div className="secretaria-titulo-linha">
            <div><span>CADASTRO</span><h2>{editandoId ? "Editar membro" : "Novo membro"}</h2></div>
          </div>
          <form className="secretaria-formulario" onSubmit={salvarMembro}>
            <label className="secretaria-campo secretaria-campo-largo"><span>Nome completo *</span><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value.toUpperCase() })} required /></label>
            <label className="secretaria-campo"><span>Data de nascimento</span><input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} /></label>
            <label className="secretaria-campo"><span>Telefone / WhatsApp</span><input inputMode="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></label>
            <label className="secretaria-campo"><span>Sexo</span><select value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })}><option value="">Não informado</option><option>Masculino</option><option>Feminino</option></select></label>
            <label className="secretaria-campo"><span>Estado civil</span><select value={form.estado_civil} onChange={(e) => setForm({ ...form, estado_civil: e.target.value })}><option value="">Não informado</option><option>Solteiro</option><option>Casado</option><option>Divorciado</option><option>Viúvo</option></select></label>
            <label className="secretaria-campo"><span>Situação cadastral</span><select value={form.situacao_cadastral} onChange={(e) => setForm({ ...form, situacao_cadastral: e.target.value })}><option>Ativo</option><option>Desativado</option><option>Bloqueado</option></select></label>
            <label className="secretaria-campo"><span>Batizado nas águas?</span><select value={form.batizado_aguas ? "Sim" : "Não"} onChange={(e) => setForm({ ...form, batizado_aguas: e.target.value === "Sim" })}><option>Não</option><option>Sim</option></select></label>
            <label className="secretaria-campo secretaria-campo-largo"><span>Observação</span><textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></label>
            <SeletorFuncoes funcoes={funcoes} selecionadas={funcoesSelecionadas} onChange={setFuncoesSelecionadas} />
            <div className="secretaria-form-acoes secretaria-campo-largo"><button className="secretaria-botao-primario" disabled={salvando}>{salvando ? "Salvando..." : "Salvar membro"}</button><button type="button" className="secretaria-botao-secundario" onClick={limparFormulario}>Cancelar</button></div>
          </form>
        </section>
      )}

      <section className="secretaria-bloco secretaria-lista-membros">
        <div className="secretaria-titulo-linha secretaria-lista-topo">
          <div><span>CADASTRO GERAL</span><h2>{membrosFiltrados.length} membros</h2></div>
          <div className="secretaria-filtros"><input className="secretaria-busca" placeholder="Buscar nome ou telefone" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} /><select value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)}><option>Ativo</option><option>Desativado</option><option>Bloqueado</option><option>Todos</option></select></div>
        </div>

        {carregando ? <p>Carregando...</p> : membrosFiltrados.length === 0 ? <p className="secretaria-vazio">Nenhum membro encontrado.</p> : (
          <div className="secretaria-membros-lista">
            {membrosFiltrados.map((membro) => {
              const cargos = (membro.membro_funcoes || []).filter((item) => item.ativo && item.secretaria_funcoes)
              return (
                <article className="secretaria-membro" key={membro.id}>
                  <div className="secretaria-membro-identidade"><span>{membro.nome?.charAt(0)}</span><div><h3>{membro.nome}</h3><p>{membro.telefone || "Telefone não informado"} · {formatarData(membro.data_nascimento)}</p></div></div>
                  <div className="secretaria-membro-funcoes">{cargos.length ? cargos.slice(0, 3).map((item) => <span key={item.id}>{item.secretaria_funcoes.nome}</span>) : <small>Sem função cadastrada</small>}{cargos.length > 3 && <small>+{cargos.length - 3}</small>}</div>
                  <span className={`secretaria-situacao ${membro.situacao_cadastral?.toLowerCase()}`}>{membro.situacao_cadastral}</span>
                  <div className="secretaria-membro-acoes"><button onClick={() => editarMembro(membro)}>Editar</button><button onClick={() => criarAcesso(membro)}>Criar acesso</button></div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
