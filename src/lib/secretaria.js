export function calcularResumoSecretaria(membros = [], hoje = new Date()) {
  const mesAtual = hoje.getMonth() + 1

  return membros.reduce(
    (resumo, membro) => {
      const situacao = membro.situacao_cadastral || "Ativo"
      const mesNascimento = membro.data_nascimento
        ? Number(membro.data_nascimento.split("-")[1])
        : null

      resumo.total += 1

      if (situacao === "Ativo") resumo.ativos += 1
      if (situacao === "Desativado") resumo.desativados += 1
      if (situacao === "Bloqueado") resumo.bloqueados += 1
      if (membro.batizado_aguas) resumo.batizados += 1
      if (mesNascimento === mesAtual) resumo.aniversariantes += 1

      if (!membro.telefone || !membro.data_nascimento) {
        resumo.cadastrosIncompletos += 1
      }

      return resumo
    },
    {
      total: 0,
      ativos: 0,
      desativados: 0,
      bloqueados: 0,
      batizados: 0,
      aniversariantes: 0,
      cadastrosIncompletos: 0,
    },
  )
}

export function formatarDataSecretaria(data) {
  if (!data) return "Data não informada"

  const dataSegura = /^\d{4}-\d{2}-\d{2}$/.test(data)
    ? new Date(`${data}T12:00:00`)
    : new Date(data)

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(dataSegura)
}

export function ordenarFuncoes(funcoes = []) {
  return [...funcoes].sort((a, b) => {
    const nomeA = a.nome.replace(/^\d+º\s*/, "")
    const nomeB = b.nome.replace(/^\d+º\s*/, "")
    const porNome = nomeA.localeCompare(nomeB, "pt-BR", { sensitivity: "base" })

    return porNome || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })
  })
}

const MODELOS_DOCUMENTOS = {
  "Carta de recomendação": "A Assembleia de Deus, Bairro Jacaré, por meio desta, recomenda o(a) irmão(ã) {nome}, membro desta congregação, à {finalidade}. Solicitamos que seja recebido(a) com amor cristão e comunhão fraterna, na graça e na paz de nosso Senhor Jesus Cristo.",
  "Declaração de membro": "Declaramos, para os devidos fins, que {nome} encontra-se regularmente cadastrado(a) como membro da Assembleia de Deus, Bairro Jacaré. A presente declaração é emitida a pedido do(a) interessado(a), para {finalidade}.",
  Certificado: "A Assembleia de Deus, Bairro Jacaré, confere o presente certificado a {nome}, em reconhecimento a {finalidade}.",
  Outro: "A Assembleia de Deus, Bairro Jacaré, declara, para os devidos fins, que {nome}: {finalidade}.",
}

export function modeloDocumentoSecretaria(tipo) {
  return MODELOS_DOCUMENTOS[tipo] || MODELOS_DOCUMENTOS.Outro
}

export function preencherDocumentoSecretaria(modelo, { nome, finalidade }) {
  return String(modelo || "")
    .replaceAll("{nome}", nome || "[NOME DO MEMBRO]")
    .replaceAll("{finalidade}", finalidade || "[FINALIDADE DO DOCUMENTO]")
}

export function codigoDocumentoSecretaria(id = "") {
  return id ? `ADJ-${id.replaceAll("-", "").slice(0, 10).toUpperCase()}` : ""
}
