export const PERFIS = {
  ADMINISTRADOR: "Administrador",
  DIRIGENTE: "Dirigente",
  MIDIA: "Mídia",
  SECRETARIA: "Secretaria",
  SUPORTE: "Suporte",
  TI: "TI",
  SONOPLASTIA: "Sonoplastia",
  PROJECAO: "Projeção",
  EBD: "EBD",
}

const REGRAS = {
  escala: [PERFIS.ADMINISTRADOR, PERFIS.DIRIGENTE, PERFIS.MIDIA],
  senhasAplicativos: [PERFIS.ADMINISTRADOR, PERFIS.MIDIA],
  custosFixos: [PERFIS.ADMINISTRADOR, PERFIS.DIRIGENTE, PERFIS.MIDIA],
  whatsapp: [
    PERFIS.ADMINISTRADOR,
    PERFIS.DIRIGENTE,
    PERFIS.MIDIA,
    PERFIS.SECRETARIA,
    PERFIS.SUPORTE,
    PERFIS.TI,
    PERFIS.SONOPLASTIA,
    PERFIS.PROJECAO,
  ],
  publicarComunicacao: [
    PERFIS.ADMINISTRADOR,
    PERFIS.DIRIGENTE,
    PERFIS.SECRETARIA,
  ],
  administrarUsuarios: [PERFIS.ADMINISTRADOR],
  secretaria: [
    PERFIS.ADMINISTRADOR,
    PERFIS.DIRIGENTE,
    PERFIS.SECRETARIA,
  ],
  membros: [PERFIS.ADMINISTRADOR, PERFIS.DIRIGENTE, PERFIS.SECRETARIA],
  gestao: [PERFIS.ADMINISTRADOR, PERFIS.DIRIGENTE],
}

export function temPermissao(user, recurso) {
  return REGRAS[recurso]?.includes(user?.role) ?? false
}

export function podePublicarComunicacao(user) {
  return temPermissao(user, "publicarComunicacao")
}
