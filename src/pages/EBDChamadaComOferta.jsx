import { notificar } from "../lib/feedback"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"
import EBDChamada from "./EBDChamada"
import "./EBDInternas.css"

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

export default function EBDChamadaComOferta({ user }) {
  const usuario = user || JSON.parse(localStorage.getItem("user") || "{}")

  const podeVerTudoEBD =
    usuario?.role === "Administrador" ||
    usuario?.role === "Dirigente" ||
    (usuario?.role === "EBD" && usuario?.turma_ebd === "Superintendente") ||
    usuario?.turma_ebd === "Superintendente"

  const turmasPermitidas = Array.isArray(usuario?.turmas_ebd)
    ? usuario.turmas_ebd
    : []

  const [turmas, setTurmas] = useState([])
  const [turmaId, setTurmaId] = useState("")
  const [trimestres, setTrimestres] = useState([])
  const [trimestreId, setTrimestreId] = useState("")
  const [aulas, setAulas] = useState([])
  const [aulaId, setAulaId] = useState("")
  const [valor, setValor] = useState("")
  const [salvando, setSalvando] = useState(false)

  const aulaSelecionada = useMemo(
    () => aulas.find((aula) => String(aula.id) === String(aulaId)),
    [aulas, aulaId]
  )

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    setTrimestres([])
    setTrimestreId("")
    setAulas([])
    setAulaId("")
    setValor("")
    if (turmaId) carregarTrimestres()
  }, [turmaId])

  useEffect(() => {
    setAulas([])
    setAulaId("")
    setValor("")
    if (trimestreId) carregarAulas()
  }, [trimestreId])

  useEffect(() => {
    if (!aulaSelecionada) {
      setValor("")
      return
    }

    setValor(
      aulaSelecionada.oferta_valor === null ||
        aulaSelecionada.oferta_valor === undefined
        ? ""
        : String(aulaSelecionada.oferta_valor).replace(".", ",")
    )
  }, [aulaSelecionada])

  async function carregarTurmas() {
    const { data, error } = await supabase
      .from("ebd_turmas")
      .select("id,nome,idade_min")
      .order("idade_min", { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    const permitidas = podeVerTudoEBD
      ? data || []
      : (data || []).filter((turma) => turmasPermitidas.includes(turma.id))

    setTurmas(permitidas)

    if (permitidas.length === 1) {
      setTurmaId(permitidas[0].id)
    }
  }

  async function carregarTrimestres() {
    const { data, error } = await supabase
      .from("ebd_trimestres")
      .select("id,nome,ano,numero,status")
      .eq("turma_id", turmaId)
      .order("ano", { ascending: false })
      .order("numero", { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setTrimestres(data || [])
    const ativo = (data || []).find((item) => item.status === "ativo")
    if (ativo) setTrimestreId(ativo.id)
  }

  async function carregarAulas() {
    const { data, error } = await supabase
      .from("ebd_aulas")
      .select(
        "id,data,numero_licao,tema,oferta_valor,oferta_registrada_por,oferta_registrada_em"
      )
      .eq("trimestre_id", trimestreId)
      .order("numero_licao", { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    setAulas(data || [])

    const hoje = new Date().toISOString().split("T")[0]
    const aulaHoje = (data || []).find((aula) => aula.data === hoje)
    if (aulaHoje) setAulaId(aulaHoje.id)
  }

  async function salvarOferta() {
    if (!aulaId) {
      notificar("Selecione a lição da chamada.")
      return
    }

    const normalizado = String(valor).trim().replace(/\./g, "").replace(",", ".")
    const numero = Number(normalizado)

    if (!Number.isFinite(numero) || numero < 0) {
      notificar("Digite um valor de oferta válido.")
      return
    }

    setSalvando(true)

    const registradoEm = new Date().toISOString()
    const registradoPor = usuario?.nome || usuario?.email || "Usuário"

    const { data, error } = await supabase
      .from("ebd_aulas")
      .update({
        oferta_valor: numero,
        oferta_registrada_por: registradoPor,
        oferta_registrada_em: registradoEm,
      })
      .eq("id", aulaId)
      .select("id,oferta_valor,oferta_registrada_por,oferta_registrada_em")
      .single()

    setSalvando(false)

    if (error || !data) {
      console.error(error)
      notificar("Não foi possível salvar a oferta. Atualize a página e tente novamente.")
      return
    }

    setAulas((anteriores) =>
      anteriores.map((aula) =>
        String(aula.id) === String(aulaId)
          ? {
              ...aula,
              oferta_valor: data.oferta_valor,
              oferta_registrada_por: data.oferta_registrada_por,
              oferta_registrada_em: data.oferta_registrada_em,
            }
          : aula
      )
    )

    notificar("Oferta registrada com sucesso!")
  }

  return (
    <>
      <div className="page ebd-subpage ebd-subpage--oferta" style={{ paddingBottom: 0 }}>
        <div className="form-card" style={{ borderLeft: "5px solid #16a34a" }}>
          <h2 style={{ marginTop: 0 }}>💰 Oferta do dia</h2>
          <p style={{ color: "#64748b", marginTop: 0 }}>
            Registre aqui o valor arrecadado na mesma lição em que a chamada será feita.
          </p>

          <label>Turma</label>
          <select
            value={turmaId}
            onChange={(event) => setTurmaId(event.target.value)}
            disabled={!podeVerTudoEBD && turmas.length <= 1}
          >
            <option value="">Selecione</option>
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome}
              </option>
            ))}
          </select>

          <label>Trimestre</label>
          <select
            value={trimestreId}
            onChange={(event) => setTrimestreId(event.target.value)}
            disabled={!turmaId}
          >
            <option value="">Selecione</option>
            {trimestres.map((trimestre) => (
              <option key={trimestre.id} value={trimestre.id}>
                {trimestre.nome} {trimestre.status === "ativo" ? "(Ativo)" : ""}
              </option>
            ))}
          </select>

          <label>Lição</label>
          <select
            value={aulaId}
            onChange={(event) => setAulaId(event.target.value)}
            disabled={!trimestreId}
          >
            <option value="">Selecione</option>
            {aulas.map((aula) => (
              <option key={aula.id} value={aula.id}>
                Lição {String(aula.numero_licao).padStart(2, "0")} - {new Date(`${aula.data}T12:00:00`).toLocaleDateString("pt-BR")}
                {aula.tema ? ` - ${aula.tema}` : ""}
              </option>
            ))}
          </select>

          <label>Valor da oferta</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="R$ 0,00"
            value={valor}
            onChange={(event) => setValor(event.target.value)}
            disabled={!aulaId}
          />

          {aulaSelecionada?.oferta_valor !== null &&
            aulaSelecionada?.oferta_valor !== undefined && (
              <div className="info-box" style={{ marginTop: 12 }}>
                Valor registrado: <strong>{formatarMoeda(aulaSelecionada.oferta_valor)}</strong>
                {aulaSelecionada.oferta_registrada_por && (
                  <>
                    <br />Por: {aulaSelecionada.oferta_registrada_por}
                  </>
                )}
              </div>
            )}

          <button
            type="button"
            onClick={salvarOferta}
            disabled={!aulaId || salvando}
            style={{ marginTop: 14, background: "#16a34a" }}
          >
            {salvando ? "Salvando oferta..." : "Salvar oferta do dia"}
          </button>
        </div>
      </div>

      <EBDChamada user={user} />
    </>
  )
}
