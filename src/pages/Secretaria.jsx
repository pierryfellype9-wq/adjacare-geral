import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import SecretariaAbas from "../components/SecretariaAbas"
import { supabase } from "../lib/supabase"
import {
  calcularResumoSecretaria,
  formatarDataSecretaria,
} from "../lib/secretaria"

const AREAS_FUTURAS = [
  {
    titulo: "Movimentações",
    descricao: "Recebimentos, mudanças, desligamentos e histórico cadastral.",
  },
  {
    titulo: "Documentos",
    descricao: "Cartas, declarações, certificados e registros oficiais.",
  },
  {
    titulo: "Datas importantes",
    descricao: "Batismos, apresentações, casamentos e aniversários.",
  },
]

function Indicador({ valor, titulo, detalhe, destaque = false }) {
  return (
    <article className={`secretaria-indicador ${destaque ? "destaque" : ""}`}>
      <span>{titulo}</span>
      <strong>{valor}</strong>
      <small>{detalhe}</small>
    </article>
  )
}

export default function Secretaria() {
  const [membros, setMembros] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  useEffect(() => {
    let ativo = true

    async function carregarVisaoGeral() {
      setCarregando(true)
      setErro("")

      const { data, error } = await supabase
        .from("membros")
        .select(
          "id,nome,data_nascimento,telefone,batizado_aguas,situacao_cadastral,created_at",
        )
        .order("created_at", { ascending: false })

      if (!ativo) return

      if (error) {
        console.error("Erro ao carregar a visão geral da Secretaria:", error)
        setErro("Não foi possível carregar os dados da Secretaria.")
        setMembros([])
      } else {
        setMembros(data || [])
      }

      setCarregando(false)
    }

    carregarVisaoGeral()

    return () => {
      ativo = false
    }
  }, [])

  const resumo = useMemo(() => calcularResumoSecretaria(membros), [membros])
  const cadastrosRecentes = membros.slice(0, 5)

  return (
    <div className="page secretaria-page">
      <header className="secretaria-cabecalho">
        <div>
          <span className="secretaria-kicker">GESTÃO DE PESSOAS</span>
          <h1>Secretaria</h1>
          <p>
            Visão institucional dos membros e dos registros da Assembleia de
            Deus, Bairro Jacaré.
          </p>
        </div>

        <Link className="secretaria-acao-principal" to="/membros">
          Cadastrar membro
        </Link>
      </header>

      <SecretariaAbas ativa="geral" />

      {carregando ? (
        <div className="secretaria-estado" role="status">
          Carregando informações da Secretaria...
        </div>
      ) : erro ? (
        <div className="secretaria-estado erro" role="alert">
          {erro}
        </div>
      ) : (
        <>
          <section className="secretaria-indicadores" aria-label="Resumo cadastral">
            <Indicador
              valor={resumo.total}
              titulo="Total cadastrado"
              detalhe="Base geral de membros"
              destaque
            />
            <Indicador
              valor={resumo.ativos}
              titulo="Membros ativos"
              detalhe={`${resumo.desativados + resumo.bloqueados} fora da situação ativa`}
            />
            <Indicador
              valor={resumo.aniversariantes}
              titulo="Aniversariantes"
              detalhe="No mês atual"
            />
            <Indicador
              valor={resumo.cadastrosIncompletos}
              titulo="Precisam de revisão"
              detalhe="Sem telefone ou nascimento"
            />
          </section>

          <section className="secretaria-conteudo">
            <article className="secretaria-painel secretaria-painel-principal">
              <div className="secretaria-painel-titulo">
                <div>
                  <span>ACOMPANHAMENTO</span>
                  <h2>Cadastros recentes</h2>
                </div>
                <Link to="/membros">Ver todos</Link>
              </div>

              {cadastrosRecentes.length === 0 ? (
                <p className="secretaria-vazio">Nenhum membro cadastrado.</p>
              ) : (
                <div className="secretaria-recentes">
                  {cadastrosRecentes.map((membro) => (
                    <div className="secretaria-recente" key={membro.id}>
                      <span className="secretaria-inicial">
                        {membro.nome?.charAt(0) || "M"}
                      </span>
                      <div>
                        <strong>{membro.nome}</strong>
                        <small>
                          Cadastrado em {formatarDataSecretaria(membro.created_at)}
                        </small>
                      </div>
                      <b>{membro.situacao_cadastral || "Ativo"}</b>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <aside className="secretaria-painel secretaria-qualidade">
              <span>QUALIDADE DA BASE</span>
              <h2>Cadastro organizado começa pelos dados essenciais.</h2>
              <p>
                Existem <strong>{resumo.cadastrosIncompletos}</strong> registros
                sem telefone ou data de nascimento. Esses dados serão importantes
                para contatos, documentos e datas comemorativas.
              </p>
              <Link to="/membros">Revisar cadastros</Link>
            </aside>
          </section>

          <section className="secretaria-proximas-etapas">
            <div className="secretaria-secao-titulo">
              <span>ESTRUTURA DO MÓDULO</span>
              <h2>Próximas áreas da Secretaria</h2>
              <p>Vamos configurar cada uma separadamente nas próximas etapas.</p>
            </div>

            <div className="secretaria-areas">
              {AREAS_FUTURAS.map((area, indice) => (
                <article key={area.titulo}>
                  <span>0{indice + 1}</span>
                  <div>
                    <h3>{area.titulo}</h3>
                    <p>{area.descricao}</p>
                  </div>
                  <small>Próxima etapa</small>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
