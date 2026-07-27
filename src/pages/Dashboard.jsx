import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import "./dashboard.css"

const PERFIS_GESTAO = ["Administrador", "Dirigente", "Mídia"]
const PERFIS_HINOS = ["Administrador", "Dirigente", "Mídia", "Sonoplastia", "Projeção", "TI"]

const ICONES = {
  pedidos: "M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3L17.5 7 12 9.8 6.5 7 12 4.3ZM5 8.6l6 3v7.8l-6-3V8.6Zm8 10.8v-7.8l6-3v7.8l-6 3Z",
  kanban: "M4 4h5v16H4V4Zm7 0h4v10h-4V4Zm6 0h3v7h-3V4Z",
  agenda: "M7 2v2H5a2 2 0 0 0-2 2v14h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 8v8H5v-8h14Z",
  avisos: "M12 3a6 6 0 0 0-6 6v3l-2 3v1h16v-1l-2-3V9a6 6 0 0 0-6-6Zm-2 15h4a2 2 0 0 1-4 0Z",
  usuarios: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6.5-1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20a7 7 0 0 1 14 0H2Zm13.5-7c3.6 0 6.5 2.2 6.5 5v2h-4.1a8.9 8.9 0 0 0-3.1-6.9l.7-.1Z",
  whatsapp: "M12 2a9 9 0 0 0-7.7 13.7L3 21l5.4-1.3A9 9 0 1 0 12 2Zm4.6 13.1c-.2.6-1.2 1.1-1.8 1.2-.5.1-1.2.1-2-.1-2.9-.9-4.8-3.9-5-4.1-.1-.2-1.2-1.6-1.2-3.1 0-1.5.8-2.3 1.1-2.6.3-.3.7-.4 1-.4h.7c.2 0 .5-.1.7.5l.9 2.2c.1.4.1.6-.1.8l-.6.8c-.2.2-.4.4-.2.7.2.4.8 1.3 1.7 2 .9.8 1.7 1.1 2.1 1.2.3.1.5 0 .7-.2l.9-1.1c.2-.3.5-.3.8-.2l2.1 1c.4.2.6.3.7.5.1.1.1.6-.1 1.1Z",
  escala: "M5 3h14v18H5V3Zm3 4h8V5H8v2Zm0 4h2V9H8v2Zm4 0h4V9h-4v2Zm-4 4h2v-2H8v2Zm4 0h4v-2h-4v2Zm-4 4h8v-2H8v2Z",
  ebd: "M3 4.5C6.5 3 9.3 3.4 12 5.3 14.7 3.4 17.5 3 21 4.5v14c-3.3-1.2-6-.9-9 1.2-3-2.1-5.7-2.4-9-1.2v-14Zm2 1.4v10.2c2.2-.4 4.2 0 6 1V7c-1.8-1.3-3.8-1.7-6-1.1Zm8 1.1v10.1c1.8-1 3.8-1.4 6-1V5.9c-2.2-.6-4.2-.2-6 1.1Z",
  custos: "M3 6h18v13H3V6Zm2 3v8h14V9H5Zm7 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM6 3h12v2H6V3Z",
  membros: "M12 2 4 5v6c0 5.1 3.4 9.8 8 11 4.6-1.2 8-5.9 8-11V5l-8-3Zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-5 10.3c.8-2 2.7-3.3 5-3.3s4.2 1.3 5 3.3c-1.3 1.7-3 2.9-5 3.6-2-.7-3.7-1.9-5-3.6Z",
}

function Icone({ nome }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONES[nome] || ICONES.pedidos} />
    </svg>
  )
}

function primeiroNome(nome = "") {
  return nome.trim().split(/\s+/)[0] || "Olá"
}

function dataCurta(valor) {
  if (!valor) return ""
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(new Date(valor))
    .replace(".", "")
}

function saudacaoAtual() {
  const hora = new Date().getHours()
  if (hora < 12) return "Bom dia"
  if (hora < 18) return "Boa tarde"
  return "Boa noite"
}

function configuracaoPerfil(role) {
  if (role === "Administrador") {
    return {
      eyebrow: "PAINEL ADMINISTRATIVO",
      titulo: "Tudo sob controle, em um só lugar.",
      texto: "Acompanhe a operação da igreja, veja o que precisa de atenção e acesse rapidamente as áreas de gestão.",
      cor: "azul",
      atalhos: [
        ["usuarios", "Usuários", "Gerenciar acessos e departamentos", "/usuarios"],
        ["custos", "Custos fixos", "Pagamentos e vencimentos", "/custos-fixos"],
        ["avisos", "Publicar aviso", "Comunicado para toda a igreja", "/avisos"],
        ["ebd", "Gestão da EBD", "Alunos, chamada e relatórios", "/ebd/dashboard"],
      ],
    }
  }

  if (role === "Dirigente") {
    return {
      eyebrow: "VISÃO DA DIREÇÃO",
      titulo: "O essencial da igreja, sem perder tempo.",
      texto: "Veja solicitações, comunicados e os próximos compromissos para acompanhar cada departamento de perto.",
      cor: "roxo",
      atalhos: [
        ["pedidos", "Solicitações", "Acompanhar todos os departamentos", "/pedidos"],
        ["agenda", "Agenda da igreja", "Programações e eventos", "/agenda"],
        ["avisos", "Novo comunicado", "Orientar líderes e equipes", "/avisos"],
        ["ebd", "Acompanhar EBD", "Indicadores e relatórios", "/ebd/dashboard"],
      ],
    }
  }

  if (role === "Mídia") {
    return {
      eyebrow: "CENTRAL DA MÍDIA",
      titulo: "Produção organizada. Culto preparado.",
      texto: "Priorize pedidos, acompanhe os hinos recebidos e confira a próxima escala da equipe.",
      cor: "ciano",
      atalhos: [
        ["kanban", "Quadro de produção", "Organizar pedidos por etapa", "/kanban"],
        ["whatsapp", "Hinos e letras", "Recebidos no WhatsApp para o computador", "/whatsapp"],
        ["escala", "Escala da mídia", "Organizar a equipe dos cultos", "/escala-midia"],
        ["pedidos", "Novo pedido", "Registrar uma solicitação", "/pedidos"],
      ],
    }
  }

  const atalhosBase = [
    ["pedidos", "Meus pedidos", "Solicitar e acompanhar materiais", "/pedidos"],
    ["agenda", "Agenda da igreja", "Conferir as próximas programações", "/agenda"],
    ["avisos", "Avisos internos", "Comunicados para seu departamento", "/avisos"],
  ]

  if (role === "EBD") {
    atalhosBase.splice(0, 0,
      ["ebd", "Painel da EBD", "Visão geral das turmas", "/ebd/dashboard"],
      ["escala", "Fazer chamada", "Presenças, visitantes e oferta", "/ebd/chamada"],
    )
  } else if (["Sonoplastia", "Projeção", "TI"].includes(role)) {
    atalhosBase.splice(0, 0,
      ["whatsapp", "Hinos e cultos", "Arquivos enviados para a projeção", "/whatsapp"],
    )
  } else if (role === "Recepção") {
    atalhosBase.splice(0, 0,
      ["membros", "Membros", "Consultar e cadastrar pessoas", "/membros"],
    )
  }

  return {
    eyebrow: `ÁREA DO DEPARTAMENTO • ${role?.toUpperCase() || "EQUIPE"}`,
    titulo: `${role || "Departamento"}, este espaço é de vocês.`,
    texto: "Acompanhe as demandas do departamento, consulte os avisos e organize as próximas atividades da equipe.",
    cor: "verde",
    atalhos: atalhosBase.slice(0, 4),
  }
}

export default function Dashboard({ user }) {
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [dados, setDados] = useState({
    avisos: [],
    pedidos: [],
    escalas: [],
    hinos: [],
    usuarios: 0,
    alunos: 0,
    custos: [],
  })

  const perfil = useMemo(() => configuracaoPerfil(user?.role), [user?.role])
  const gestao = PERFIS_GESTAO.includes(user?.role)
  const podeVerHinos = PERFIS_HINOS.includes(user?.role)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setCarregando(true)
      const agora = new Date().toISOString()

      let consultaPedidos = supabase
        .from("pedidos")
        .select("id,status,prioridade,ministerio,arquivado,data")
        .or("arquivado.is.null,arquivado.eq.false")
        .order("data", { ascending: false })

      if (!gestao) consultaPedidos = consultaPedidos.eq("ministerio", user?.role)

      const consultas = [
        supabase.from("avisos").select("*").order("fixado", { ascending: false }).order("data", { ascending: false }).limit(8),
        consultaPedidos,
        supabase.from("escala_midia").select("*").eq("arquivado", false).gte("data", agora.slice(0, 10)).order("data", { ascending: true }).limit(2),
        podeVerHinos
          ? supabase.from("whatsapp_hinos_projecao").select("id,status,criado_em,nome_apresentacao").order("criado_em", { ascending: false })
          : Promise.resolve({ data: [] }),
        user?.role === "Administrador"
          ? supabase.from("users").select("*", { count: "exact", head: true })
          : Promise.resolve({ count: 0 }),
        ["Administrador", "Dirigente", "EBD"].includes(user?.role)
          ? supabase.from("ebd_alunos").select("*", { count: "exact", head: true }).eq("ativo", true)
          : Promise.resolve({ count: 0 }),
        PERFIS_GESTAO.includes(user?.role)
          ? supabase.from("custos_fixos").select("id,status,data_proximo_pagamento")
          : Promise.resolve({ data: [] }),
      ]

      const [avisos, pedidos, escalas, hinos, usuarios, alunos, custos] =
        await Promise.all(consultas)

      if (!ativo) return

      const agoraData = new Date()
      const avisosDoUsuario = (avisos.data || []).filter((aviso) => {
        const destino = (aviso.destino || "").toLocaleLowerCase("pt-BR")
        const role = (user?.role || "").toLocaleLowerCase("pt-BR")
        const valido = !aviso.expira_em || new Date(aviso.expira_em) > agoraData
        return valido && (destino === "todos" || destino === role)
      }).slice(0, 4)

      setDados({
        avisos: avisosDoUsuario,
        pedidos: pedidos.data || [],
        escalas: escalas.data || [],
        hinos: hinos.data || [],
        usuarios: usuarios.count || 0,
        alunos: alunos.count || 0,
        custos: custos.data || [],
      })
      setCarregando(false)
    }

    carregar()
    return () => { ativo = false }
  }, [user?.id, user?.role, gestao, podeVerHinos])

  const resumo = useMemo(() => {
    const pendentes = dados.pedidos.filter((p) => p.status === "Pendente").length
    const producao = dados.pedidos.filter((p) => p.status === "Em produção").length
    const urgentes = dados.pedidos.filter((p) => p.prioridade === "Urgente" && p.status !== "Concluído").length
    const hinosPendentes = dados.hinos.filter((h) => ["recebido", "em_preparacao", "precisa_correcao"].includes(h.status)).length
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const custosAtrasados = dados.custos.filter((c) => {
      if (!c.data_proximo_pagamento || ["Cancelado", "Pago"].includes(c.status)) return false
      return new Date(`${c.data_proximo_pagamento}T00:00:00`) < hoje
    }).length

    if (user?.role === "Mídia") return [
      ["Pedidos pendentes", pendentes, pendentes ? "Aguardando início" : "Tudo em dia", "pedidos"],
      ["Em produção", producao, "Trabalhos em andamento", "kanban"],
      ["Hinos e letras", hinosPendentes, "Para conferir no computador", "whatsapp"],
      ["Urgentes", urgentes, urgentes ? "Precisam de atenção" : "Nenhuma urgência", "avisos"],
    ]

    if (user?.role === "Administrador") return [
      ["Usuários", dados.usuarios, "Acessos cadastrados", "usuarios"],
      ["Pedidos abertos", pendentes + producao, "Em toda a igreja", "pedidos"],
      ["Custos atrasados", custosAtrasados, custosAtrasados ? "Verificar pagamentos" : "Nenhum atraso", "custos"],
      ["Alunos ativos", dados.alunos, "Na Escola Bíblica", "ebd"],
    ]

    if (user?.role === "Dirigente") return [
      ["Pedidos abertos", pendentes + producao, "Todos os departamentos", "pedidos"],
      ["Pedidos urgentes", urgentes, urgentes ? "Precisam de atenção" : "Nenhuma urgência", "avisos"],
      ["Alunos na EBD", dados.alunos, "Cadastros ativos", "ebd"],
      ["Avisos ativos", dados.avisos.length, "Comunicados importantes", "agenda"],
    ]

    return [
      ["Pedidos pendentes", pendentes, `Do departamento ${user?.role || ""}`, "pedidos"],
      ["Em produção", producao, producao ? "A mídia já está trabalhando" : "Nenhum no momento", "kanban"],
      ["Avisos para vocês", dados.avisos.length, "Comunicados ativos", "avisos"],
      ["Próxima atividade", dados.escalas.length ? dataCurta(dados.escalas[0].data) : "—", dados.escalas[0]?.evento || "Consulte a agenda", "agenda"],
    ]
  }, [dados, user?.role])

  return (
    <main className={`home-dashboard home-dashboard--${perfil.cor}`}>
      <section className="home-hero">
        <div className="home-hero__conteudo">
          <span className="home-eyebrow">{perfil.eyebrow}</span>
          <p className="home-saudacao">{saudacaoAtual()}, {primeiroNome(user?.nome)}!</p>
          <h1>{perfil.titulo}</h1>
          <p className="home-hero__texto">{perfil.texto}</p>
          <button type="button" onClick={() => navigate(perfil.atalhos[0][3])}>
            Abrir {perfil.atalhos[0][1].toLowerCase()} <span>→</span>
          </button>
        </div>
        <div className="home-hero__marca" aria-hidden="true">
          <img src="/logo.png" alt="" />
          <span>AD<br />JACARÉ</span>
        </div>
      </section>

      <section className="home-metricas" aria-label="Resumo">
        {resumo.map(([rotulo, valor, detalhe, icone]) => (
          <article className="home-metrica" key={rotulo}>
            <div className="home-metrica__icone"><Icone nome={icone} /></div>
            <div>
              <span>{rotulo}</span>
              <strong className={carregando ? "home-skeleton" : ""}>{carregando ? "" : valor}</strong>
              <small>{detalhe}</small>
            </div>
          </article>
        ))}
      </section>

      <div className="home-grid">
        <section className="home-bloco home-acessos">
          <div className="home-bloco__cabecalho">
            <div>
              <span className="home-kicker">ACESSO RÁPIDO</span>
              <h2>O que você precisa agora?</h2>
            </div>
          </div>

          <div className="home-atalhos">
            {perfil.atalhos.map(([icone, titulo, texto, rota]) => (
              <button type="button" onClick={() => navigate(rota)} key={`${titulo}-${rota}`}>
                <span className="home-atalho__icone"><Icone nome={icone} /></span>
                <span className="home-atalho__texto">
                  <strong>{titulo}</strong>
                  <small>{texto}</small>
                </span>
                <span className="home-atalho__seta">→</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="home-bloco home-avisos">
          <div className="home-bloco__cabecalho">
            <div>
              <span className="home-kicker">MURAL</span>
              <h2>Avisos para você</h2>
            </div>
            <button type="button" onClick={() => navigate("/avisos")}>Ver todos</button>
          </div>

          <div className="home-avisos__lista">
            {!carregando && dados.avisos.length === 0 && (
              <div className="home-vazio">
                <span>✓</span>
                <strong>Nenhum aviso novo</strong>
                <p>Quando houver um comunicado para você, ele aparecerá aqui.</p>
              </div>
            )}
            {dados.avisos.map((aviso) => (
              <article key={aviso.id} className={aviso.urgente ? "urgente" : ""}>
                <span className="home-aviso__ponto" />
                <div>
                  <div className="home-aviso__meta">
                    {aviso.urgente && <b>URGENTE</b>}
                    {aviso.fixado && <b>IMPORTANTE</b>}
                  </div>
                  <strong>{aviso.titulo}</strong>
                  <p>{aviso.mensagem}</p>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>

      {(PERFIS_GESTAO.includes(user?.role) || PERFIS_HINOS.includes(user?.role)) && (
        <section className="home-faixa">
          <div>
            <span className="home-kicker">PRÓXIMOS PASSOS</span>
            <h2>{dados.escalas[0] ? "Próxima escala da mídia" : "Organize a próxima programação"}</h2>
            <p>
              {dados.escalas[0]
                ? `${dataCurta(dados.escalas[0].data)} • ${dados.escalas[0].evento || "Culto"}`
                : "Consulte a agenda e deixe as equipes preparadas com antecedência."}
            </p>
          </div>
          <button type="button" onClick={() => navigate(PERFIS_GESTAO.includes(user?.role) ? "/escala-midia" : "/agenda")}>
            Conferir agora <span>→</span>
          </button>
        </section>
      )}
    </main>
  )
}
