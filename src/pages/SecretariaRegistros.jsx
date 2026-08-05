import { useEffect, useMemo, useState } from "react"
import CampoMembro from "../components/CampoMembro"
import Confirmacao from "../components/Confirmacao"
import SecretariaCabecalho from "../components/SecretariaCabecalho"
import { notificar } from "../lib/feedback"
import { supabase } from "../lib/supabase"
import {
  codigoDocumentoSecretaria,
  formatarDataSecretaria,
  modeloDocumentoSecretaria,
  preencherDocumentoSecretaria,
} from "../lib/secretaria"

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
      ...(tipoPagina === "documentos" ? {
        conteudo: modeloDocumentoSecretaria(config.tipos[0]),
        assinante_1_nome: "",
        assinante_1_cargo: "Pastor local",
        assinante_2_nome: "",
        assinante_2_cargo: "Secretaria",
      } : {}),
    }),
    [config, tipoPagina],
  )
  const [membros, setMembros] = useState([])
  const [registros, setRegistros] = useState([])
  const [form, setForm] = useState(formInicial)
  const [editando, setEditando] = useState(null)
  const [busca, setBusca] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [exclusaoPendente, setExclusaoPendente] = useState(null)

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
      notificar("Não foi possível carregar os registros da Secretaria.")
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
      notificar("Selecione um membro.")
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
      notificar(`Não foi possível salvar: ${resposta.error.message}`)
      return
    }

    notificar(editando ? "Registro atualizado com sucesso." : "Registro salvo com sucesso.")
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
    const { error } = await supabase.from(config.tabela).delete().eq("id", registro.id)
    if (error) return notificar("Não foi possível excluir o registro.")
    setExclusaoPendente(null)
    notificar("Registro excluído com sucesso.")
    await carregar()
  }

  function imprimir(registro) {
    const janela = window.open("", "_blank", "width=850,height=900")
    if (!janela) return notificar("Autorize a abertura da janela de impressão.")
    const nome = escaparHtml(registro.membros?.nome || "Interessado")
    const tipo = escaparHtml(registro.tipo)
    const finalidade = escaparHtml(registro.finalidade)
    const observacao = escaparHtml(registro.observacao)
    const conteudo = escaparHtml(preencherDocumentoSecretaria(
      registro.conteudo || modeloDocumentoSecretaria(registro.tipo),
      { nome: registro.membros?.nome || "Interessado", finalidade: registro.finalidade },
    )).replaceAll("\n", "<br>")
    const codigo = escaparHtml(codigoDocumentoSecretaria(registro.id))
    const assinante1 = escaparHtml(registro.assinante_1_nome)
    const cargo1 = escaparHtml(registro.assinante_1_cargo || "Pastor local")
    const assinante2 = escaparHtml(registro.assinante_2_nome)
    const cargo2 = escaparHtml(registro.assinante_2_cargo || "Secretaria")
    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${tipo}</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;color:#172438;font:11pt Arial,sans-serif;line-height:1.65}.documento{min-height:265mm;display:flex;flex-direction:column;border-top:5px solid #17477c;padding:12mm 10mm 8mm}header{display:grid;grid-template-columns:72px 1fr 110px;align-items:center;gap:18px;padding-bottom:18px;border-bottom:1px solid #c8a75b}header img{width:68px;height:68px;object-fit:contain}.identidade strong{display:block;color:#123f72;font-size:13pt}.identidade span{display:block;font-size:9pt;color:#647286}.protocolo{text-align:right;font-size:8pt;color:#657286}.protocolo b{display:block;color:#24364c;font-size:9pt}main{flex:1;padding:20mm 4mm 8mm}h1{margin:0 0 16mm;text-align:center;text-transform:uppercase;letter-spacing:1.5px;color:#173f6d;font:700 18pt Georgia,serif}.corpo{text-align:justify;font-size:11.5pt;line-height:1.9}.complemento{margin-top:10mm;padding:5mm 6mm;background:#f5f7f9;border-left:3px solid #c8a75b;font-size:9.5pt}.data{margin-top:18mm;text-align:right}.assinaturas{display:grid;grid-template-columns:1fr 1fr;gap:18mm;margin-top:22mm}.assinatura{text-align:center;border-top:1px solid #26384e;padding-top:5px;min-height:38px}.assinatura strong{display:block}.assinatura span{font-size:9pt;color:#5c697a}footer{margin-top:12mm;padding-top:5mm;border-top:1px solid #d8dee6;text-align:center;color:#667487;font-size:8.5pt}@media print{.documento{min-height:260mm}}</style></head><body><article class="documento"><header><img src="/logo-ad-institucional-escura.png" alt=""><div class="identidade"><strong>ASSEMBLEIA DE DEUS, BAIRRO JACARÉ</strong><span>Ministério Belém · Secretaria da Igreja</span></div><div class="protocolo">DOCUMENTO Nº<b>${codigo}</b></div></header><main><h1>${tipo}</h1><div class="corpo">${conteudo}</div>${observacao ? `<div class="complemento"><strong>Informações complementares</strong><br>${observacao}</div>` : ""}<div class="data">Cabreúva, ${formatarDataSecretaria(registro[config.campoData])}.</div><div class="assinaturas"><div class="assinatura">${assinante1 ? `<strong>${assinante1}</strong>` : ""}<span>${cargo1}</span></div><div class="assinatura">${assinante2 ? `<strong>${assinante2}</strong>` : ""}<span>${cargo2}</span></div></div></main><footer>Av. Ver. José Donato, 913 · Bairro Jacaré · Cabreúva/SP · CEP 13318-000</footer></article><script>window.addEventListener('load',()=>window.print())</script></body></html>`)
    janela.document.close()
  }

  const filtrados = registros.filter((registro) =>
    `${registro.membros?.nome || ""} ${registro.tipo}`
      .toLocaleLowerCase("pt-BR")
      .includes(busca.toLocaleLowerCase("pt-BR")),
  )

  return (
    <div className="page secretaria-page">
      <Confirmacao
        aberto={Boolean(exclusaoPendente)}
        titulo="Excluir registro?"
        mensagem={exclusaoPendente ? `O registro de ${exclusaoPendente.tipo} será removido do histórico.` : ""}
        cancelar={() => setExclusaoPendente(null)}
        confirmar={() => excluir(exclusaoPendente)}
      />
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
            <select value={form.tipo} onChange={(event) => {
              const tipo = event.target.value
              setForm({
                ...form,
                tipo,
                ...(tipoPagina === "documentos" ? { conteudo: modeloDocumentoSecretaria(tipo) } : {}),
              })
            }}>
              {config.tipos.map((tipo) => <option key={tipo}>{tipo}</option>)}
            </select>
          </label>
          <label className="secretaria-campo">
            <span>Data *</span>
            <input type="date" value={form[config.campoData]} onChange={(event) => setForm({ ...form, [config.campoData]: event.target.value })} required />
          </label>
          {config.campos.map(([campo, titulo]) => (
            <label className="secretaria-campo" key={campo}>
              <span>{tipoPagina === "documentos" && campo === "finalidade" ? "Destino ou finalidade *" : titulo}</span>
              <input value={form[campo]} onChange={(event) => setForm({ ...form, [campo]: event.target.value })} required={tipoPagina === "documentos" && campo === "finalidade"} />
            </label>
          ))}
          {tipoPagina === "documentos" && (
            <>
              <label className="secretaria-campo secretaria-campo-largo">
                <span>Texto do documento *</span>
                <textarea className="secretaria-texto-documento" value={form.conteudo} onChange={(event) => setForm({ ...form, conteudo: event.target.value })} required />
                <small className="secretaria-ajuda-campo">Use {"{nome}"} e {"{finalidade}"}; o sistema substitui pelos dados do registro ao imprimir.</small>
              </label>
              <label className="secretaria-campo">
                <span>Nome do primeiro responsável</span>
                <input value={form.assinante_1_nome} onChange={(event) => setForm({ ...form, assinante_1_nome: event.target.value })} placeholder="Nome que aparecerá na assinatura" />
              </label>
              <label className="secretaria-campo">
                <span>Cargo do primeiro responsável</span>
                <input value={form.assinante_1_cargo} onChange={(event) => setForm({ ...form, assinante_1_cargo: event.target.value })} />
              </label>
              <label className="secretaria-campo">
                <span>Nome do segundo responsável</span>
                <input value={form.assinante_2_nome} onChange={(event) => setForm({ ...form, assinante_2_nome: event.target.value })} placeholder="Nome que aparecerá na assinatura" />
              </label>
              <label className="secretaria-campo">
                <span>Cargo do segundo responsável</span>
                <input value={form.assinante_2_cargo} onChange={(event) => setForm({ ...form, assinante_2_cargo: event.target.value })} />
              </label>
            </>
          )}
          {config.status && (
            <label className="secretaria-campo">
              <span>Status</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                {config.status.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
          )}
          <label className="secretaria-campo secretaria-campo-largo">
            <span>{tipoPagina === "documentos" ? "Informações complementares" : "Observação"}</span>
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
                  <td data-label="Data">{formatarDataSecretaria(registro[config.campoData])}</td>
                  <td data-label="Membro"><strong>{registro.membros?.nome || "Sem membro vinculado"}</strong></td>
                  <td data-label="Tipo">{registro.tipo}</td>
                  {config.status && <td data-label="Status"><span className="secretaria-status">{registro.status}</span></td>}
                  <td data-label="Ações"><div className="secretaria-acoes-tabela"><button onClick={() => editar(registro)}>Editar</button>{tipoPagina === "documentos" && <button onClick={() => imprimir(registro)}>Imprimir</button>}<button className="perigo" onClick={() => setExclusaoPendente(registro)}>Excluir</button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
