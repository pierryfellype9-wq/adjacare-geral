import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import "./EBD.css"

const MODULOS = [
  {
    id: "dashboard",
    titulo: "Visão geral",
    texto: "Frequência, desempenho e panorama das turmas.",
    rota: "/ebd/dashboard",
    icone: "◫",
    cor: "azul",
    gestao: true,
  },
  {
    id: "chamada",
    titulo: "Fazer chamada",
    texto: "Presenças, atrasos, visitantes e oferta da aula.",
    rota: "/ebd/chamada",
    icone: "✓",
    cor: "verde",
  },
  {
    id: "alunos",
    titulo: "Alunos",
    texto: "Cadastros, contatos e organização por turma.",
    rota: "/ebd/alunos",
    icone: "♟",
    cor: "roxo",
  },
  {
    id: "trimestres",
    titulo: "Lições e trimestres",
    texto: "Temas, datas, revistas e planejamento das aulas.",
    rota: "/ebd/trimestres",
    icone: "▤",
    cor: "dourado",
  },
  {
    id: "relatorios",
    titulo: "Relatórios",
    texto: "Frequência, faltas e evolução de cada turma.",
    rota: "/ebd/relatorios",
    icone: "↗",
    cor: "ciano",
  },
  {
    id: "ofertas",
    titulo: "Relatório de ofertas",
    texto: "Valores por lição, turma e trimestre.",
    rota: "/ebd/relatorio-ofertas",
    icone: "◆",
    cor: "rosa",
  },
  {
    id: "financeiro",
    titulo: "Financeiro",
    texto: "Revistas, pagamentos e pendências dos alunos.",
    rota: "/ebd/financeiro",
    icone: "$",
    cor: "esmeralda",
    gestao: true,
  },
  {
    id: "professores",
    titulo: "Solicitações de professores",
    texto: "Analise e aprove novos acessos para a EBD.",
    rota: "/ebd/solicitacoes-professores",
    icone: "＋",
    cor: "laranja",
    gestao: true,
  },
]

function dataLocalISO() {
  const agora = new Date()
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function formatarData(data) {
  if (!data) return null
  const valor = new Date(`${data}T12:00:00`)
  return {
    dia: new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(valor),
    mes: new Intl.DateTimeFormat("pt-BR", { month: "short" })
      .format(valor)
      .replace(".", "")
      .toUpperCase(),
    semana: new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(valor),
    completa: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(valor),
  }
}

function primeiroNome(nome = "") {
  return nome.trim().split(/\s+/)[0] || "Professor"
}

export default function EBD({ user }) {
  const navigate = useNavigate()
  const usuario = user || {}
  const [carregando, setCarregando] = useState(true)
  const [dados, setDados] = useState({
    turmas: [],
    alunos: [],
    aulas: [],
    solicitacoes: 0,
  })

  const podeVerTudo =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    usuario?.turma_ebd === "Superintendente"

  const turmasPermitidas = Array.isArray(usuario?.turmas_ebd)
    ? usuario.turmas_ebd
    : []

  const temAcessoEBD =
    podeVerTudo ||
    turmasPermitidas.length > 0 ||
    (usuario?.turma_ebd &&
      usuario.turma_ebd !== "Não permitido" &&
      usuario.turma_ebd !== "Superintendente")

  useEffect(() => {
    if (!temAcessoEBD) {
      setCarregando(false)
      return
    }

    let ativo = true

    async function carregarCentral() {
      setCarregando(true)
      const hoje = dataLocalISO()

      const [turmas, alunos, aulas, solicitacoes] = await Promise.all([
        supabase.from("ebd_turmas").select("id,nome").order("nome"),
        supabase
          .from("ebd_alunos")
          .select("id,nome,turma_id,ativo,ebd_presencas(status)")
          .eq("ativo", true),
        supabase
          .from("ebd_aulas")
          .select("id,data,numero_licao,tema,turma_id,ebd_turmas(nome)")
          .gte("data", hoje)
          .order("data", { ascending: true })
          .limit(30),
        podeVerTudo
          ? supabase
              .from("ebd_solicitacoes_professores")
              .select("*", { count: "exact", head: true })
              .eq("status", "Pendente")
          : Promise.resolve({ count: 0 }),
      ])

      if (!ativo) return
      setDados({
        turmas: turmas.data || [],
        alunos: alunos.data || [],
        aulas: aulas.data || [],
        solicitacoes: solicitacoes.count || 0,
      })
      setCarregando(false)
    }

    carregarCentral()
    return () => { ativo = false }
  }, [usuario?.id, temAcessoEBD, podeVerTudo])

  function podeAcessarTurma(turmaId, nomeTurma) {
    if (podeVerTudo) return true
    if (turmasPermitidas.includes(turmaId)) return true
    return Boolean(
      usuario?.turma_ebd &&
      usuario.turma_ebd !== "Não permitido" &&
      usuario.turma_ebd === nomeTurma
    )
  }

  const resumo = useMemo(() => {
    const turmasVisiveis = dados.turmas.filter((turma) =>
      podeAcessarTurma(turma.id, turma.nome)
    )
    const nomesTurmas = new Map(dados.turmas.map((turma) => [turma.id, turma.nome]))
    const alunosVisiveis = dados.alunos.filter((aluno) =>
      podeAcessarTurma(aluno.turma_id, nomesTurmas.get(aluno.turma_id))
    )
    const aulasVisiveis = dados.aulas.filter((aula) =>
      podeAcessarTurma(aula.turma_id, aula.ebd_turmas?.nome)
    )

    const alertas = alunosVisiveis
      .map((aluno) => {
        const presencas = aluno.ebd_presencas || []
        const total = presencas.length
        const presentes = presencas.filter((item) => item.status === "presente").length
        const frequencia = total ? Math.round((presentes / total) * 100) : null
        return {
          ...aluno,
          turma: nomesTurmas.get(aluno.turma_id) || "Sem turma",
          frequencia,
        }
      })
      .filter((aluno) => aluno.frequencia !== null && aluno.frequencia < 60)
      .sort((a, b) => a.frequencia - b.frequencia)

    const proximaData = aulasVisiveis[0]?.data
    const aulasProximaData = proximaData
      ? aulasVisiveis.filter((aula) => aula.data === proximaData)
      : []

    return {
      turmas: turmasVisiveis,
      alunos: alunosVisiveis,
      alertas,
      proximaAula: aulasProximaData[0] || null,
      aulasProximaData,
    }
  }, [dados, podeVerTudo, turmasPermitidas, usuario?.turma_ebd])

  const modulosVisiveis = MODULOS.filter((modulo) => !modulo.gestao || podeVerTudo)
  const rotaPrincipal = podeVerTudo ? "/ebd/dashboard" : "/ebd/chamada"
  const dataProximaAula = formatarData(resumo.proximaAula?.data)

  if (!temAcessoEBD) {
    return (
      <main className="ebd-central ebd-central--bloqueada">
        <section>
          <span>ACESSO RESTRITO</span>
          <h1>Área da Escola Bíblica Dominical</h1>
          <p>Seu usuário ainda não está vinculado a uma turma da EBD.</p>
          <button type="button" onClick={() => navigate("/dashboard")}>Voltar ao início</button>
        </section>
      </main>
    )
  }

  return (
    <main className="ebd-central">
      <section className="ebd-central__hero">
        <div className="ebd-central__hero-texto">
          <span>ESCOLA BÍBLICA DOMINICAL</span>
          <p>Olá, {primeiroNome(usuario?.nome)}!</p>
          <h1>Ensinar a Palavra.<br />Cuidar de pessoas.</h1>
          <p className="ebd-central__hero-descricao">
            Tudo o que você precisa para preparar as aulas, acompanhar seus
            alunos e fortalecer cada turma.
          </p>
          <button type="button" onClick={() => navigate(rotaPrincipal)}>
            {podeVerTudo ? "Ver panorama da EBD" : "Fazer chamada"} <b>→</b>
          </button>
        </div>

        <div className="ebd-central__versiculo">
          <span>“</span>
          <blockquote>
            Ensina a criança no caminho em que deve andar.
          </blockquote>
          <cite>PROVÉRBIOS 22:6</cite>
        </div>

        <div className="ebd-central__livro" aria-hidden="true">
          <span /><span />
        </div>
      </section>

      <section className="ebd-central__metricas">
        <article>
          <span className="alunos">♟</span>
          <div>
            <small>Alunos ativos</small>
            <strong className={carregando ? "ebd-carregando" : ""}>
              {carregando ? "" : resumo.alunos.length}
            </strong>
            <p>Nas turmas que você acompanha</p>
          </div>
        </article>
        <article>
          <span className="turmas">▦</span>
          <div>
            <small>Turmas</small>
            <strong className={carregando ? "ebd-carregando" : ""}>
              {carregando ? "" : resumo.turmas.length}
            </strong>
            <p>{podeVerTudo ? "Visão completa da EBD" : "Vinculadas ao seu acesso"}</p>
          </div>
        </article>
        <article>
          <span className="atencao">!</span>
          <div>
            <small>Precisam de atenção</small>
            <strong className={carregando ? "ebd-carregando" : ""}>
              {carregando ? "" : resumo.alertas.length}
            </strong>
            <p>Frequência abaixo de 60%</p>
          </div>
        </article>
        <article>
          <span className="solicitacoes">＋</span>
          <div>
            <small>{podeVerTudo ? "Solicitações pendentes" : "Próxima lição"}</small>
            <strong className={carregando ? "ebd-carregando" : ""}>
              {carregando
                ? ""
                : podeVerTudo
                  ? dados.solicitacoes
                  : resumo.proximaAula?.numero_licao || "—"}
            </strong>
            <p>{podeVerTudo ? "Novos professores" : resumo.proximaAula ? "Lição programada" : "Ainda não definida"}</p>
          </div>
        </article>
      </section>

      <div className="ebd-central__grade">
        <section className="ebd-central__modulos">
          <header>
            <div>
              <span>ÁREAS DA EBD</span>
              <h2>O que você precisa fazer?</h2>
              <p>Acesse rapidamente as ferramentas da sua rotina.</p>
            </div>
          </header>

          <div className="ebd-central__modulos-grid">
            {modulosVisiveis.map((modulo) => (
              <button type="button" key={modulo.id} onClick={() => navigate(modulo.rota)}>
                <span className={`ebd-modulo__icone ${modulo.cor}`}>{modulo.icone}</span>
                <span className="ebd-modulo__texto">
                  <strong>{modulo.titulo}</strong>
                  <small>{modulo.texto}</small>
                </span>
                {modulo.id === "professores" && dados.solicitacoes > 0 && (
                  <b className="ebd-modulo__contador">{dados.solicitacoes}</b>
                )}
                <span className="ebd-modulo__seta">→</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="ebd-central__domingo">
          <header>
            <span>PRÓXIMO DOMINGO</span>
            <h2>Prepare sua aula</h2>
          </header>

          {resumo.proximaAula && dataProximaAula ? (
            <>
              <div className="ebd-domingo__data">
                <span>{dataProximaAula.mes}</span>
                <strong>{dataProximaAula.dia}</strong>
                <small>{dataProximaAula.semana}</small>
              </div>
              <div className="ebd-domingo__licao">
                <span>LIÇÃO {resumo.proximaAula.numero_licao || "—"}</span>
                <h3>{resumo.proximaAula.tema || "Tema ainda não informado"}</h3>
                <p>
                  {resumo.aulasProximaData.length}{" "}
                  {resumo.aulasProximaData.length === 1 ? "turma preparada" : "turmas preparadas"} para esta data.
                </p>
              </div>
              <button type="button" onClick={() => navigate("/ebd/trimestres")}>
                Ver planejamento completo <span>→</span>
              </button>
            </>
          ) : (
            <div className="ebd-domingo__vazio">
              <span>▤</span>
              <h3>Nenhuma lição programada</h3>
              <p>Cadastre as próximas aulas para orientar os professores.</p>
              <button type="button" onClick={() => navigate("/ebd/trimestres")}>
                Abrir planejamento
              </button>
            </div>
          )}
        </aside>
      </div>

      <section className="ebd-central__rodape">
        <div>
          <span className="ebd-rodape__icone">♡</span>
          <div>
            <span>ACOMPANHAMENTO PASTORAL</span>
            <h2>
              {resumo.alertas.length
                ? `${resumo.alertas.length} ${resumo.alertas.length === 1 ? "aluno precisa" : "alunos precisam"} de atenção`
                : "As turmas estão sendo bem acompanhadas"}
            </h2>
            <p>
              {resumo.alertas.length
                ? "Consulte o relatório de frequência e acompanhe quem tem faltado."
                : "Nenhum aluno com frequência abaixo de 60% nas turmas visíveis."}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => navigate("/ebd/relatorios")}>
          Ver frequência <span>→</span>
        </button>
      </section>
    </main>
  )
}
