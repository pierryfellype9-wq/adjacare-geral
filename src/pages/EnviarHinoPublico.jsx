import { supabase } from "../lib/supabase"
import { useEffect, useMemo, useState } from "react"
const departamentosPadrao = [
  "Adolescentes e Jovens",
  "Cofemp",
  "Infantil",
  "Individual (solo)",
  "Mídia",
  "Outro departamento",
]

function formatarData(valor, comHora = true) {
  if (!valor) return ""
  const opcoes = {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }
  if (comHora) {
    opcoes.hour = "2-digit"
    opcoes.minute = "2-digit"
  }
  return new Intl.DateTimeFormat("pt-BR", opcoes).format(new Date(valor))
}

export default function EnviarHinoPublico() {
  const [cultos, setCultos] = useState([])
  const [departamentos, setDepartamentos] = useState(departamentosPadrao)
  const [carregando, setCarregando] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState("")
  const [arquivo, setArquivo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [progresso, setProgresso] = useState("")
  const [resultado, setResultado] = useState(null)
  const [mensagemErro, setMensagemErro] = useState("")
  const [form, setForm] = useState({
    culto_id: "",
    departamento: "",
    outro_departamento: "",
    apresentacao: "",
    telefone: "",
    observacoes: "",
  })

  useEffect(() => {
    const tituloAnterior = document.title
    const icone = document.querySelector('link[rel="icon"]')
    const iconeAnterior = icone?.getAttribute("href")
    const tema = document.querySelector('meta[name="theme-color"]')
    const temaAnterior = tema?.getAttribute("content")

    document.title = "Envio de Hinos | AD Jacaré"
    if (icone) icone.setAttribute("href", "/logo-ad-site.png")
    if (tema) tema.setAttribute("content", "#0b4a92")

    return () => {
      document.title = tituloAnterior
      if (icone && iconeAnterior) icone.setAttribute("href", iconeAnterior)
      if (tema && temaAnterior) tema.setAttribute("content", temaAnterior)
    }
  }, [])

  useEffect(() => {
    fetch("/api/whatsapp?acao=formulario_hinos")
      .then(async (resposta) => {
        const dados = await resposta.json()
        if (!resposta.ok) throw new Error(dados.error)
        setCultos(dados.cultos || [])
      })
      .catch(() => setErroCarregamento("Não foi possível carregar as programações. Atualize a página."))
      .finally(() => setCarregando(false))
  }, [])

  const culto = useMemo(
    () => cultos.find((item) => item.id === form.culto_id),
    [cultos, form.culto_id]
  )

  function atualizar(campo, valor) {
    setForm((anterior) => ({ ...anterior, [campo]: valor }))
  }

  async function enviarHino(evento) {
    evento.preventDefault()
    setMensagemErro("")
    if (!arquivo) {
      setMensagemErro("Escolha o arquivo do hino.")
      return
    }
    if (arquivo.size > 50 * 1024 * 1024) {
      setMensagemErro("O arquivo ultrapassa o limite de 50 MB.")
      return
    }

    setEnviando(true)
    try {
      const metadados = {
        culto_id: form.culto_id,
        departamento: form.departamento,
        outro_departamento: form.outro_departamento,
        nome_apresentacao: form.apresentacao,
        telefone: form.telefone,
        observacoes: form.observacoes,
        nome_original: arquivo.name,
        mime_type: arquivo.type || "application/octet-stream",
        tamanho_bytes: arquivo.size,
      }

      setProgresso("Preparando envio seguro...")
      const respostaPreparo = await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "preparar_hino_site", ...metadados }),
      })
      const preparo = await respostaPreparo.json()
      if (!respostaPreparo.ok) throw new Error(preparo.error)

      setProgresso("Enviando arquivo...")
      const { error: erroUpload } = await supabase.storage
        .from("hinos-temporarios")
        .uploadToSignedUrl(preparo.path, preparo.token, arquivo, {
          contentType: metadados.mime_type,
          cacheControl: "3600",
        })
      if (erroUpload) throw erroUpload

      setProgresso("Organizando no Drive...")
      const respostaFinal = await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "finalizar_hino_site",
          upload_id: preparo.upload_id,
          path: preparo.path,
          ...metadados,
        }),
      })
      const finalizado = await respostaFinal.json()
      if (!respostaFinal.ok) throw new Error(finalizado.error)

      setResultado(finalizado.registro)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      setMensagemErro(error?.message || "Não foi possível enviar o hino. Tente novamente.")
    } finally {
      setEnviando(false)
      setProgresso("")
    }
  }

  const estilos = {
    pagina: {
      minHeight: "100vh",
      background:
        "radial-gradient(circle at 12% 8%, rgba(53,113,210,.18), transparent 28%), linear-gradient(145deg,#eaf2ff 0%,#f7faff 46%,#fff 100%)",
      padding: "28px 12px 42px",
      boxSizing: "border-box",
      color: "#13233d",
    },
    card: {
      width: "min(780px,100%)",
      margin: "0 auto",
      background: "#fff",
      border: "1px solid rgba(173,194,225,.55)",
      borderRadius: 28,
      boxShadow: "0 24px 70px rgba(25,55,98,.14)",
      overflow: "hidden",
    },
    topo: {
      position: "relative",
      padding: "34px 24px 30px",
      textAlign: "center",
      background: "linear-gradient(145deg,#082b5d 0%,#0b4a92 58%,#1769c2 100%)",
      color: "#fff",
      overflow: "hidden",
    },
    marca: {
      position: "absolute",
      width: 230,
      height: 230,
      border: "44px solid rgba(255,255,255,.055)",
      borderRadius: "50%",
      right: -105,
      bottom: -145,
    },
    logoCaixa: {
      width: 78,
      height: 78,
      margin: "0 auto 14px",
      borderRadius: 22,
      display: "grid",
      placeItems: "center",
      background: "#fff",
      boxShadow: "0 13px 30px rgba(1,17,42,.25)",
    },
    logo: { width: 61, height: 61, objectFit: "contain" },
    detalhe: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      marginBottom: 10,
      color: "#bcd8ff",
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: 1.7,
      textTransform: "uppercase",
    },
    titulo: {
      margin: 0,
      fontSize: "clamp(29px,7vw,42px)",
      lineHeight: 1.08,
      letterSpacing: "-1.2px",
    },
    subtitulo: {
      maxWidth: 575,
      margin: "13px auto 0",
      color: "#dbeaff",
      fontSize: 16,
      lineHeight: 1.55,
    },
    corpo: { padding: "10px 24px 30px" },
    secao: {
      marginTop: 23,
      paddingBottom: 22,
      borderBottom: "1px solid #e8eef7",
    },
    cabecalho: {
      display: "flex",
      alignItems: "center",
      gap: 11,
      marginBottom: 14,
    },
    numero: {
      width: 34,
      height: 34,
      borderRadius: 12,
      display: "grid",
      placeItems: "center",
      color: "#fff",
      background: "linear-gradient(145deg,#1759ad,#277ee0)",
      fontSize: 14,
      fontWeight: 900,
      boxShadow: "0 7px 16px rgba(37,99,190,.22)",
    },
    secaoTitulo: { margin: 0, color: "#10284a", fontSize: 18, fontWeight: 850 },
    secaoTexto: { display: "block", marginTop: 2, color: "#8090a8", fontSize: 13 },
    label: {
      display: "block",
      marginBottom: 7,
      color: "#465a76",
      fontSize: 13,
      fontWeight: 800,
    },
    campo: {
      width: "100%",
      minHeight: 52,
      padding: "13px 14px",
      boxSizing: "border-box",
      border: "1px solid #cbd8e9",
      borderRadius: 14,
      outlineColor: "#277ee0",
      background: "#fbfdff",
      color: "#172b49",
      fontSize: 16,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(225px,1fr))",
      gap: 14,
    },
    cultoResumo: {
      marginTop: 12,
      padding: 14,
      border: "1px solid #cfe0f7",
      borderRadius: 15,
      background: "#f0f6ff",
      color: "#28527f",
      fontSize: 14,
      lineHeight: 1.55,
    },
    arquivo: {
      padding: 18,
      border: "2px dashed #b8cae3",
      borderRadius: 18,
      textAlign: "center",
      background: arquivo ? "#f0f7ff" : "#fafcff",
    },
    arquivoIcone: {
      width: 52,
      height: 52,
      margin: "0 auto 9px",
      borderRadius: 17,
      display: "grid",
      placeItems: "center",
      background: "#e5f0ff",
      color: "#1760b8",
      fontSize: 25,
    },
    botaoArquivo: {
      display: "inline-block",
      marginTop: 11,
      padding: "11px 17px",
      borderRadius: 12,
      background: "#e5f0ff",
      color: "#1556a3",
      fontSize: 14,
      fontWeight: 800,
      cursor: "pointer",
    },
    observacao: {
      marginTop: 18,
      padding: "14px 15px",
      borderRadius: 15,
      background: "#fff8e7",
      border: "1px solid #f3dfaa",
      color: "#795b19",
      fontSize: 13,
      lineHeight: 1.55,
    },
    botao: {
      width: "100%",
      marginTop: 22,
      padding: 16,
      border: 0,
      borderRadius: 16,
      background: "linear-gradient(135deg,#104994,#2476d6)",
      color: "#fff",
      fontSize: 16,
      fontWeight: 850,
      cursor: "pointer",
      boxShadow: "0 12px 27px rgba(25,91,177,.24)",
    },
  }

  return (
    <main style={estilos.pagina}>
      <style>{`
        @keyframes hino-girar { to { transform: rotate(360deg); } }
        @keyframes hino-pulsar { 0%,100% { opacity:.45; transform:scale(.92) } 50% { opacity:1; transform:scale(1) } }
      `}</style>

      {enviando && (
        <div
          role="dialog"
          aria-modal="true"
          aria-live="assertive"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "grid",
            placeItems: "center",
            padding: 18,
            background: "rgba(5,18,40,.72)",
            backdropFilter: "blur(7px)",
          }}
        >
          <div style={{
            width: "min(390px,100%)",
            padding: "30px 24px",
            borderRadius: 24,
            textAlign: "center",
            background: "#fff",
            boxShadow: "0 28px 80px rgba(0,0,0,.32)",
          }}>
            <div style={{
              width: 64,
              height: 64,
              margin: "0 auto 18px",
              borderRadius: "50%",
              border: "6px solid #dbe9fb",
              borderTopColor: "#1769c2",
              animation: "hino-girar .85s linear infinite",
            }} />
            <h2 style={{ margin: 0, color: "#10284a", fontSize: 23 }}>{progresso}</h2>
            <p style={{ margin: "9px 0 0", color: "#6f819b", lineHeight: 1.5 }}>
              Não feche nem atualize esta página.
            </p>
            <div style={{ display:"flex", justifyContent:"center", gap:7, marginTop:18 }}>
              {[0,1,2].map((item) => (
                <i key={item} style={{
                  width:8, height:8, borderRadius:"50%", background:"#2a76ce",
                  animation:`hino-pulsar 1s ease-in-out ${item * .18}s infinite`
                }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {mensagemErro && !enviando && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "grid",
            placeItems: "center",
            padding: 18,
            background: "rgba(5,18,40,.68)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div style={{
            width: "min(420px,100%)",
            padding: "27px 23px",
            borderRadius: 23,
            textAlign: "center",
            background: "#fff",
            boxShadow: "0 28px 80px rgba(0,0,0,.3)",
          }}>
            <div style={{
              width: 54, height: 54, margin:"0 auto 14px", borderRadius:17,
              display:"grid", placeItems:"center", background:"#fff0f0",
              color:"#bb3030", fontSize:27, fontWeight:900
            }}>!</div>
            <h2 style={{ margin:0, color:"#10284a", fontSize:22 }}>Não foi possível enviar</h2>
            <p style={{ margin:"10px 0 20px", color:"#657891", lineHeight:1.55 }}>{mensagemErro}</p>
            <button
              type="button"
              onClick={() => setMensagemErro("")}
              style={{
                width:"100%", padding:13, border:0, borderRadius:13,
                background:"#175eae", color:"#fff", fontSize:15,
                fontWeight:800, cursor:"pointer"
              }}
            >Entendi, tentar novamente</button>
          </div>
        </div>
      )}
      <section style={estilos.card}>
        <header style={estilos.topo}>
          <span style={estilos.marca} />
          <div style={estilos.logoCaixa}>
            <img src="/logo-ad-site.png" alt="Assembleia de Deus — AD Jacaré" style={estilos.logo} />
          </div>
          <span style={estilos.detalhe}>Som e projeção • AD Jacaré</span>
          <h1 style={estilos.titulo}>Envio de hinos</h1>
          <p style={estilos.subtitulo}>
            Envie o material do culto com antecedência. Nós organizamos tudo
            para a equipe de mídia encontrar do jeito certo.
          </p>
        </header>

        <form style={estilos.corpo} onSubmit={enviarHino}>
          <div style={estilos.secao}>
            <div style={estilos.cabecalho}>
              <span style={estilos.numero}>1</span>
              <div>
                <h2 style={estilos.secaoTitulo}>Escolha o culto</h2>
                <small style={estilos.secaoTexto}>Selecione onde o hino será apresentado</small>
              </div>
            </div>
            <label style={estilos.label}>Culto ou programação</label>
            <select
              required
              style={estilos.campo}
              value={form.culto_id}
              onChange={(e) => atualizar("culto_id", e.target.value)}
            >
              <option value="">
                {carregando ? "Carregando programações..." : "Selecione uma programação"}
              </option>
              {cultos.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.titulo} • {formatarData(item.data_culto)}
                </option>
              ))}
            </select>
            {erroCarregamento && (
              <div style={{ ...estilos.cultoResumo, color: "#9f2f2f", background: "#fff2f2", borderColor: "#f1caca" }}>
                {erroCarregamento}
              </div>
            )}
            {culto && (
              <div style={estilos.cultoResumo}>
                <strong>{culto.titulo}</strong><br />
                {formatarData(culto.data_culto)}
                {culto.prazo_envio && <> • Envio até {formatarData(culto.prazo_envio)}</>}
              </div>
            )}
          </div>

          <div style={estilos.secao}>
            <div style={estilos.cabecalho}>
              <span style={estilos.numero}>2</span>
              <div>
                <h2 style={estilos.secaoTitulo}>Identifique a apresentação</h2>
                <small style={estilos.secaoTexto}>Isso será usado para nomear e organizar o arquivo</small>
              </div>
            </div>
            <div style={estilos.grid}>
              <div>
                <label style={estilos.label}>Departamento</label>
                <select
                  required
                  style={estilos.campo}
                  value={form.departamento}
                  onChange={(e) => atualizar("departamento", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {departamentos.map((item) => <option key={item}>{item}</option>)}
                </select>
                {form.departamento === "Outro departamento" && (
                  <input
                    required
                    style={{ ...estilos.campo, marginTop: 10 }}
                    placeholder="Digite o nome do departamento"
                    value={form.outro_departamento}
                    onChange={(e) => atualizar("outro_departamento", e.target.value)}
                  />
                )}
              </div>
              <div>
                <label style={estilos.label}>Quem vai cantar?</label>
                <input
                  required
                  style={estilos.campo}
                  placeholder="Nome, dupla, grupo ou conjunto"
                  value={form.apresentacao}
                  onChange={(e) => atualizar("apresentacao", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={estilos.secao}>
            <div style={estilos.cabecalho}>
              <span style={estilos.numero}>3</span>
              <div>
                <h2 style={estilos.secaoTitulo}>Envie o material</h2>
                <small style={estilos.secaoTexto}>Áudio, vídeo, letra, imagem ou documento</small>
              </div>
            </div>
            <div style={estilos.arquivo}>
              <div style={estilos.arquivoIcone}>{arquivo ? "✓" : "↑"}</div>
              <strong>{arquivo ? arquivo.name : "Escolha o arquivo do hino"}</strong>
              <div style={{ marginTop: 5, color: "#7b8ca5", fontSize: 13 }}>
                {arquivo
                  ? `${(arquivo.size / 1024 / 1024).toFixed(1)} MB`
                  : "MP3, MP4, imagem, PDF, Word ou PowerPoint"}
              </div>
              <label style={estilos.botaoArquivo}>
                {arquivo ? "Trocar arquivo" : "Selecionar arquivo"}
                <input
                  required
                  type="file"
                  accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
                  style={{ display: "none" }}
                  onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>

          <div style={{ ...estilos.secao, borderBottom: 0, paddingBottom: 0 }}>
            <div style={estilos.cabecalho}>
              <span style={estilos.numero}>4</span>
              <div>
                <h2 style={estilos.secaoTitulo}>Contato e observações</h2>
                <small style={estilos.secaoTexto}>Para a mídia falar com você, caso seja necessário</small>
              </div>
            </div>
            <div style={estilos.grid}>
              <div>
                <label style={estilos.label}>Celular com DDD</label>
                <input
                  required
                  inputMode="numeric"
                  style={estilos.campo}
                  placeholder="(11) 99999-9999"
                  value={form.telefone}
                  onChange={(e) => atualizar("telefone", e.target.value)}
                />
              </div>
              <div>
                <label style={estilos.label}>Orientação para a mídia (opcional)</label>
                <input
                  style={estilos.campo}
                  placeholder="Tom, versão ou momento do culto"
                  value={form.observacoes}
                  onChange={(e) => atualizar("observacoes", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={estilos.observacao}>
            <strong>Antes de enviar:</strong> confira se escolheu o culto correto
            e se o arquivo é exatamente a versão que será apresentada.
          </div>

          {resultado && (
            <div style={{ ...estilos.observacao, background: "#effcf4", borderColor: "#b9e8ca", color: "#176536" }}>
              <strong>Hino enviado com sucesso!</strong><br />
              Protocolo: {resultado.protocolo}<br />
              Arquivo: {resultado.nome_drive}
            </div>
          )}

          <button disabled={enviando || Boolean(resultado)} style={{ ...estilos.botao, opacity: enviando || resultado ? .7 : 1 }}>
            {resultado ? "Envio concluído" : "Enviar hino para a mídia"}
          </button>
          {resultado && (
            <button
              type="button"
              onClick={() => {
                setResultado(null)
                setArquivo(null)
                setForm({ culto_id: "", departamento: "", outro_departamento: "", apresentacao: "", telefone: "", observacoes: "" })
              }}
              style={{ ...estilos.botao, marginTop: 10, background: "#e8f0fb", color: "#174c8d", boxShadow: "none" }}
            >
              Enviar outro hino
            </button>
          )}
        </form>
      </section>
    </main>
  )
}
