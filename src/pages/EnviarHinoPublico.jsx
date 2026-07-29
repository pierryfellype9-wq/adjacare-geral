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
  const [form, setForm] = useState({
    culto_id: "",
    departamento: "",
    outro_departamento: "",
    apresentacao: "",
    telefone: "",
    observacoes: "",
  })

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

  function visualizarEnvio(evento) {
    evento.preventDefault()
    alert("A página visual está pronta. A conexão com o envio será ativada na próxima etapa.")
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
      <section style={estilos.card}>
        <header style={estilos.topo}>
          <span style={estilos.marca} />
          <div style={estilos.logoCaixa}>
            <img src="/logo.png" alt="AD Jacaré" style={estilos.logo} />
          </div>
          <span style={estilos.detalhe}>Som e projeção • AD Jacaré</span>
          <h1 style={estilos.titulo}>Envio de hinos</h1>
          <p style={estilos.subtitulo}>
            Envie o material do culto com antecedência. Nós organizamos tudo
            para a equipe de mídia encontrar do jeito certo.
          </p>
        </header>

        <form style={estilos.corpo} onSubmit={visualizarEnvio}>
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

          <button style={estilos.botao}>Enviar hino para a mídia</button>
        </form>
      </section>
    </main>
  )
}
