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

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(data))
}

export function ordenarFuncoes(funcoes = []) {
  return [...funcoes].sort((a, b) => {
    const nomeA = a.nome.replace(/^\d+º\s*/, "")
    const nomeB = b.nome.replace(/^\d+º\s*/, "")
    const porNome = nomeA.localeCompare(nomeB, "pt-BR", { sensitivity: "base" })

    return porNome || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })
  })
}
