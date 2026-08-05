import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8")
const abas = readFileSync(
  new URL("../src/components/SecretariaAbas.jsx", import.meta.url),
  "utf8",
)
const schema = readFileSync(
  new URL("../supabase/secretaria_completa.sql", import.meta.url),
  "utf8",
)
const registros = readFileSync(
  new URL("../src/pages/SecretariaRegistros.jsx", import.meta.url),
  "utf8",
)
const membros = readFileSync(new URL("../src/pages/Membros.jsx", import.meta.url), "utf8")
const estilos = readFileSync(new URL("../src/pages/Secretaria.css", import.meta.url), "utf8")

test("módulo da Secretaria possui todas as páginas planejadas", () => {
  for (const rota of [
    "/secretaria",
    "/membros",
    "/secretaria/movimentacoes",
    "/secretaria/documentos",
    "/secretaria/datas",
  ]) {
    assert.match(app, new RegExp(rota.replaceAll("/", "\\/")))
    assert.match(abas, new RegExp(rota.replaceAll("/", "\\/")))
  }
})

test("estrutura da Secretaria preserva histórico sem vínculo de cônjuge", () => {
  assert.match(schema, /create table if not exists public\.membro_funcoes/)
  assert.match(schema, /create table if not exists public\.secretaria_movimentacoes/)
  assert.match(schema, /create table if not exists public\.secretaria_documentos/)
  assert.match(schema, /create table if not exists public\.secretaria_datas_importantes/)
  assert.doesNotMatch(schema.toLocaleLowerCase("pt-BR"), /c[oô]njuge|casamento/)
})

test("funções enviadas foram incluídas no cadastro pesquisável", () => {
  for (const funcao of [
    "1º Líder de Comunicação",
    "Professor(a) Escola Dominical",
    "1º Responsável pelo Som",
    "2º Superintendente da EBD",
  ]) {
    assert.ok(schema.includes(funcao))
  }
})

test("banco limita cada membro a uma única função ativa", () => {
  assert.match(
    schema,
    /create unique index membro_funcoes_ativo_unique\s+on public\.membro_funcoes \(membro_id\)\s+where ativo = true/,
  )
})

test("documentos possuem texto editável e responsáveis pela assinatura", () => {
  for (const campo of [
    "conteudo text",
    "assinante_1_nome text",
    "assinante_1_cargo text",
    "assinante_2_nome text",
    "assinante_2_cargo text",
  ]) {
    assert.ok(schema.includes(campo))
  }
})

test("Secretaria usa avisos internos e layout responsivo próprio", () => {
  assert.doesNotMatch(registros, /\balert\s*\(|\bconfirm\s*\(/)
  assert.doesNotMatch(membros, /\balert\s*\(|\bconfirm\s*\(/)
  assert.match(registros, /<Confirmacao/)
  assert.match(estilos, /@media \(max-width: 700px\)/)
  assert.match(estilos, /\.secretaria-tabela td::before/)
})
