import { useEffect, useMemo, useState } from "react"
import CampoMembro from "../components/CampoMembro"
import SecretariaCabecalho from "../components/SecretariaCabecalho"
import { supabase } from "../lib/supabase"
import { formatarDataSecretaria } from "../lib/secretaria"

const CONFIGURACOES = {
  movimentacoes: {
    titulo: "Movimentações",
    descricao: "Registre recebimentos, mudanças, desligamentos e reativações.",
    tabela: "secretaria_movimentacoes",
    campoData: "data",
    tipos: ["Recebimento", "Mudança", "Desligamento", "Reativação"],
    campos: [
      ["origem_destino", "Origem ou destino"],
      ["motivo", "Motivo"],
    ],
  },
  documentos: {
    titulo: "Documentos",
    descricao: "Controle cartas, declarações, certificados e demais emissões.",
    tabela: "secretaria_documentos",
    campoData: "data_emissao",
    tipos: ["Carta de recomendação", "Declaração de membro", "Certificado", "Outro"],
    campos: [["finalidade", "Finalidade"]],
    status: ["Rascunho", "Emitido", "Cancelado"],
  },
  datas: {
    titulo: "Datas importantes",
    descricao: "Organize batismos, apresentações, recebimentos e outros marcos.",
    tabela: "secretaria_datas_importantes",
    campoData: "data",
    tipos: ["Batismo", "Apresentação", "Recebimento", "Outro"],
    campos: [["descricao", "Descrição"]],
    membroOpcional: true,
  },
}

function hoje() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
}

function escaparHtml(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export default function SecretariaRegistros({ tipoPagina, user }) {
  const config = CONFIGURACOES[tipoPagina]
  const formInicial = useMemo(
    () => ({
      membro_id: "",
      tipo: config.tipos[0],
      [config.campoData]: hoje(),
      observacao: "",
      status: config.status?.[1] || undefined,
      ...Object.fromEntries(config.campos.map(([campo]) => [campo, ""])),
    }),
    [config],
  )
  const [membros, setMembros] = useState([])
  const [registros, setRegistros] = useState([])
  const [form, setForm] = useState(formInicial)
  const [editando, setEditando] = useState(null)
  const [busca, setBusca] = useState("")
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    const [membrosResposta, registrosResposta] = await Promise.all([
      supabase
        .from("membros")
        .select("id,nome")
        .eq("situacao_cadastral", "Ativo")
        .order("nome"),
      supabase
        .from(config.tabela)
        .select("*, membros(nome)")
        .order(config.campoData, { ascending: false }),
    ])

    if (membrosResposta.error || registrosResposta.error) {
      alert("Não foi possível carregar os registros da Secretaria.")
    }
    setMembros(membrosResposta.data || [])
    setRegistros(registrosResposta.data || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [config.tabela])

  function limpar() {
    setForm(formInicial)
    setEditando(null)
  }

  async function salvar(event) {
    event.preventDefault()
    if (!config.membroOpcional && !form.membro_id) {
      alert("Selecione um membro.")
      return
    }

    const payload = {
      ...form,
      membro_id: form.membro_id || null,
      criado_por: user?.nome || user?.email,
    }

    const resposta = editando
      ? await supabase.from(config.tabela).update(payload).eq("id", editando)
      : await supabase.from(config.tabela).insert(payload)

    if (resposta.error) {
      alert(`Não foi possível salvar: ${resposta.error.message}`)
      return
    }

    limpar()
    await carregar()
  }

  function editar(registro) {
    const campos = Object.fromEntries(
      Object.keys(formInicial).map((campo) => [campo, registro[campo] ?? ""]),
    )
    setForm(campos)
    setEditando(registro.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function excluir(registro) {
    if (!confirm(`Excluir este registro de ${registro.tipo}?`)) return
    const { error } = await supabase.from(config.tabela).delete().eq("id", registro.id)
    if (error) return alert("Não foi possível excluir o registro.")
    carregar()
  }

  function imprimir(registro) {
    const janela = window.open("", "_blank", "width=850,height=900")
    if (!janela) return alert("Autorize a abertura da janela de impressão.")
    const nome = escaparHtml(registro.membros?.nome || "Interessado")
    const tipo = escaparHtml(registro.tipo)
    const finalidade = escaparHtml(registro.finalidade)
    const observacao = escaparHtml(registro.observacao)
    janela.document.write(`<!doctype html><html><head><title>${tipo}</title><style>body{font:16px Arial;color:#162236;padding:70px;line-height:1.7}header{text-align:center;border-bottom:2px solid #183f70;padding-bottom:22px;margin-bottom:60px}h1{font-size:24px}main{min-height:420px}footer{margin-top:80px;text-align:center}.linha{width:300px;border-top:1px solid #333;margin:0 auto}</style></head><body><header><strong>ASSEMBLEIA DE DEUS, BAIRRO JACARÉ</strong><br><small>Secretaria da Igreja</small></header><main><h1>${tipo}</h1><p>Declaramos, para os devidos fins, que <strong>${nome}</strong>${finalidade ? `, para a finalidade de ${finalidade}` : ""}.</p><p>${observacao}</p></main><footer>Cabreúva, ${formatarDataSecretaria(registro[config.campoData])}.<br><br><br><div class="linha"></div>Secretaria</footer><script>window.print()</script></body></html>`)
    janela.document.close()
  }

  const filtrados = registros.filter((registro) =>
    `${registro.membros?.nome || ""} ${registro.tipo}`
      .toLocaleLowerCase("pt-BR")
      .includes(busca.toLocaleLowerCase("pt-BR")),
  )

  return (
    <div className="page secretaria-page">
      <SecretariaCabecalho
        ativa={tipoPagina}
        titulo={config.titulo}
        descricao={config.descricao}
      />

      <section className="secretaria-bloco secretaria-formulario-bloco">
        <div className="secretaria-titulo-linha">
          <div>
            <span>NOVO REGISTRO</span>
            <h2>{editando ? "Editar registro" : `Registrar ${config.titulo.toLowerCase()}`}</h2>
          </div>
          {editando && <button className="secretaria-botao-texto" onClick={limpar}>Cancelar edição</button>}
        </div>

        <form className="secretaria-formulario" onSubmit={salvar}>
          <CampoMembro membros={membros} valor={form.membro_id} onChange={(valor) => setForm({ ...form, membro_id: valor })} obrigatorio={!config.membroOpcional} />
          <label className="secretaria-campo">
            <span>Tipo *</span>
            <select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })}>
              {config.tipos.map((tipo) => <option key={tipo}>{tipo}</option>)}
            </select>
          </label>
          <label className="secretaria-campo">
            <span>Data *</span>
            <input type="date" value={form[config.campoData]} onChange={(event) => setForm({ ...form, [config.campoData]: event.target.value })} required />
          </label>
          {config.campos.map(([campo, titulo]) => (
            <label className="secretaria-campo" key={campo}>
              <span>{titulo}</span>
              <input value={form[campo]} onChange={(event) => setForm({ ...form, [campo]: event.target.value })} />
            </label>
          ))}
          {config.status && (
            <label className="secretaria-campo">
              <span>Status</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                {config.status.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
          )}
          <label className="secretaria-campo secretaria-campo-largo">
            <span>Observação</span>
            <textarea value={form.observacao} onChange={(event) => setForm({ ...form, observacao: event.target.value })} />
          </label>
          <div className="secretaria-form-acoes secretaria-campo-largo">
            <button className="secretaria-botao-primario">{editando ? "Salvar alterações" : "Salvar registro"}</button>
          </div>
        </form>
      </section>

      <section className="secretaria-bloco">
        <div className="secretaria-titulo-linha secretaria-lista-topo">
          <div><span>HISTÓRICO</span><h2>{registros.length} registros</h2></div>
          <input className="secretaria-busca" placeholder="Buscar por membro ou tipo" value={busca} onChange={(event) => setBusca(event.target.value)} />
        </div>
        {carregando ? <p>Carregando...</p> : filtrados.length === 0 ? <p className="secretaria-vazio">Nenhum registro encontrado.</p> : (
          <div className="secretaria-tabela-wrap">
            <table className="secretaria-tabela">
              <thead><tr><th>Data</th><th>Membro</th><th>Tipo</th>{config.status && <th>Status</th>}<th>Ações</th></tr></thead>
              <tbody>{filtrados.map((registro) => (
                <tr key={registro.id}>
                  <td>{formatarDataSecretaria(registro[config.campoData])}</td>
                  <td><strong>{registro.membros?.nome || "Sem membro vinculado"}</strong></td>
                  <td>{registro.tipo}</td>
                  {config.status && <td><span className="secretaria-status">{registro.status}</span></td>}
                  <td><div className="secretaria-acoes-tabela"><button onClick={() => editar(registro)}>Editar</button>{tipoPagina === "documentos" && <button onClick={() => imprimir(registro)}>Imprimir</button>}<button className="perigo" onClick={() => excluir(registro)}>Excluir</button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
