export const ROTAS_SITE = {
  "/": "inicio",
  "/quem-somos": "quem-somos",
  "/onde-estamos": "onde-estamos",
  "/departamentos": "departamentos",
  "/programacao": "programacao",
  "/contribuicao": "contribuicao",
};

export const NAVEGACAO_SITE = [
  { rota: "/", pagina: "inicio", label: "Início" },
  { rota: "/quem-somos", pagina: "quem-somos", label: "Quem somos" },
  { rota: "/onde-estamos", pagina: "onde-estamos", label: "Onde estamos" },
  { rota: "/departamentos", pagina: "departamentos", label: "Departamentos" },
  { rota: "/programacao", pagina: "programacao", label: "Programação" },
  { rota: "/contribuicao", pagina: "contribuicao", label: "Contribuição" },
];

export const TITULOS_SITE = {
  inicio: "AD Jacaré | Assembleia de Deus em Cabreúva",
  "quem-somos": "Quem somos | AD Jacaré",
  "onde-estamos": "Onde estamos | AD Jacaré",
  departamentos: "Departamentos | AD Jacaré",
  programacao: "Programação | AD Jacaré",
  contribuicao: "Contribuição | AD Jacaré",
};

export const DESCRICOES_SITE = {
  inicio:
    "Site oficial da Assembleia de Deus, Ministério do Belém, Congregação do Jacaré, em Cabreúva.",
  "quem-somos":
    "Conheça a história e a identidade da Assembleia de Deus, Congregação do Jacaré.",
  "onde-estamos":
    "Endereço e orientações para visitar a AD Jacaré, em Cabreúva.",
  departamentos:
    "Conheça os departamentos que integram a Congregação do Jacaré.",
  programacao: "Confira os cultos e encontros semanais da AD Jacaré.",
  contribuicao: "Informações oficiais para dízimos e ofertas da AD Jacaré.",
};

export const CULTOS = [
  {
    id: "segunda-oracao",
    diaSemana: 1,
    dia: "Segunda-feira",
    abreviado: "SEG",
    horario: "19h30",
    hora: 19,
    minuto: 30,
    titulo: "Congresso de Oração",
  },
  {
    id: "segunda-circulo",
    diaSemana: 1,
    dia: "Segunda-feira",
    abreviado: "SEG",
    horario: "20h10",
    hora: 20,
    minuto: 10,
    titulo: "Ensaio do Círculo de Oração",
  },
  {
    id: "terca-oracao",
    diaSemana: 2,
    dia: "Terça-feira",
    abreviado: "TER",
    horario: "14h",
    hora: 14,
    minuto: 0,
    titulo: "Oração",
  },
  {
    id: "quarta-ensino",
    diaSemana: 3,
    dia: "Quarta-feira",
    abreviado: "QUA",
    horario: "19h30",
    hora: 19,
    minuto: 30,
    titulo: "Culto de Ensino",
  },
  {
    id: "sexta-culto",
    diaSemana: 5,
    dia: "Sexta-feira",
    abreviado: "SEX",
    horario: "19h30",
    hora: 19,
    minuto: 30,
    titulo: "Culto",
  },
  {
    id: "domingo-ebd",
    diaSemana: 0,
    dia: "Domingo",
    abreviado: "DOM",
    horario: "9h",
    hora: 9,
    minuto: 0,
    titulo: "Escola Bíblica Dominical",
  },
  {
    id: "domingo-culto",
    diaSemana: 0,
    dia: "Domingo",
    abreviado: "DOM",
    horario: "18h30",
    hora: 18,
    minuto: 30,
    titulo: "Culto",
  },
];

export const DEPARTAMENTOS = [
  {
    numero: "01",
    nome: "Escola Bíblica Dominical",
    sigla: "EBD",
    descricao:
      "Ensino bíblico aos domingos, com classes organizadas por faixa etária.",
  },
  {
    numero: "02",
    nome: "Adolescentes e Jovens",
    sigla: "J&A",
    descricao:
      "Departamento dedicado aos adolescentes e jovens da congregação.",
  },
  {
    numero: "03",
    nome: "Círculo de Oração",
    sigla: "COFEMP",
    descricao: "Oração e comunhão, com encontro e ensaio às segundas-feiras.",
  },
  {
    numero: "04",
    nome: "Departamento Infantil",
    sigla: "INFANTIL",
    descricao: "Atividades e ensino voltados às crianças da igreja.",
  },
  {
    numero: "05",
    nome: "Assistência Social",
    sigla: "SOCIAL",
    descricao: "Ações de cuidado e assistência realizadas pela congregação.",
  },
  {
    numero: "06",
    nome: "Além-Mar",
    sigla: "MISSÕES",
    descricao: "Frente missionária da congregação.",
  },
  {
    numero: "07",
    nome: "Mídia",
    sigla: "MÍDIA",
    descricao: "Comunicação, projeção, transmissão e apoio técnico.",
  },
];

const DIA_POR_ABREVIACAO = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function partesEmSaoPaulo(data) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);

  const valores = Object.fromEntries(
    partes
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value])
  );

  return {
    diaSemana: DIA_POR_ABREVIACAO[valores.weekday],
    minutos: Number(valores.hour) * 60 + Number(valores.minute),
  };
}

export function obterProximosCultos(agora = new Date(), limite = 3) {
  const atual = partesEmSaoPaulo(agora);

  return CULTOS.map((culto) => {
    const minutosCulto = culto.hora * 60 + culto.minuto;
    let diasAte = (culto.diaSemana - atual.diaSemana + 7) % 7;

    if (diasAte === 0 && minutosCulto < atual.minutos) {
      diasAte = 7;
    }

    return {
      ...culto,
      diasAte,
      ordem: diasAte * 24 * 60 + minutosCulto,
      quando: diasAte === 0 ? "Hoje" : diasAte === 1 ? "Amanhã" : culto.dia,
    };
  })
    .sort((a, b) => a.ordem - b.ordem)
    .slice(0, limite);
}
