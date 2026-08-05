import test from "node:test"
import assert from "node:assert/strict"
import {
  calcularResumoSecretaria,
  ordenarFuncoes,
} from "../src/lib/secretaria.js"

test("calcula os indicadores da visão geral da Secretaria", () => {
  const resumo = calcularResumoSecretaria(
    [
      {
        situacao_cadastral: "Ativo",
        data_nascimento: "1990-08-10",
        telefone: "11999999999",
        batizado_aguas: true,
      },
      {
        situacao_cadastral: "Desativado",
        data_nascimento: null,
        telefone: "",
        batizado_aguas: false,
      },
      {
        situacao_cadastral: "Bloqueado",
        data_nascimento: "2000-01-05",
        telefone: null,
        batizado_aguas: true,
      },
    ],
    new Date("2026-08-05T12:00:00-03:00"),
  )

  assert.deepEqual(resumo, {
    total: 3,
    ativos: 1,
    desativados: 1,
    bloqueados: 1,
    batizados: 2,
    aniversariantes: 1,
    cadastrosIncompletos: 2,
  })
})

test("ordena funções pelo nome do cargo e mantém primeiro e segundo juntos", () => {
  const funcoes = ordenarFuncoes([
    { nome: "2º Líder de Jovens" },
    { nome: "1º Guardador de Ofertas" },
    { nome: "Auxiliar Dep. Infantil" },
    { nome: "1º Líder de Jovens" },
    { nome: "2º Guardador de Ofertas" },
  ])

  assert.deepEqual(
    funcoes.map((funcao) => funcao.nome),
    [
      "Auxiliar Dep. Infantil",
      "1º Guardador de Ofertas",
      "2º Guardador de Ofertas",
      "1º Líder de Jovens",
      "2º Líder de Jovens",
    ],
  )
})
