import test from "node:test"
import assert from "node:assert/strict"
import {
  PERFIS,
  podePublicarComunicacao,
  temPermissao,
} from "../src/lib/permissions.js"

test("agenda e avisos só podem ser publicados pelos perfis autorizados", () => {
  for (const role of [
    PERFIS.ADMINISTRADOR,
    PERFIS.DIRIGENTE,
    PERFIS.SECRETARIA,
  ]) {
    assert.equal(podePublicarComunicacao({ role }), true)
  }

  for (const role of [PERFIS.MIDIA, PERFIS.EBD, PERFIS.SONOPLASTIA]) {
    assert.equal(podePublicarComunicacao({ role }), false)
  }
})

test("cofre de aplicativos é visível apenas para administração e mídia", () => {
  assert.equal(temPermissao({ role: PERFIS.ADMINISTRADOR }, "senhasAplicativos"), true)
  assert.equal(temPermissao({ role: PERFIS.MIDIA }, "senhasAplicativos"), true)
  assert.equal(temPermissao({ role: PERFIS.DIRIGENTE }, "senhasAplicativos"), false)
})

test("custos fixos mantém os três perfis de gestão", () => {
  assert.equal(temPermissao({ role: PERFIS.ADMINISTRADOR }, "custosFixos"), true)
  assert.equal(temPermissao({ role: PERFIS.DIRIGENTE }, "custosFixos"), true)
  assert.equal(temPermissao({ role: PERFIS.MIDIA }, "custosFixos"), true)
  assert.equal(temPermissao({ role: PERFIS.SECRETARIA }, "custosFixos"), false)
})

test("secretaria e membros são acessíveis aos três perfis responsáveis", () => {
  for (const role of [
    PERFIS.ADMINISTRADOR,
    PERFIS.DIRIGENTE,
    PERFIS.SECRETARIA,
  ]) {
    assert.equal(temPermissao({ role }, "secretaria"), true)
    assert.equal(temPermissao({ role }, "membros"), true)
  }

  assert.equal(temPermissao({ role: PERFIS.MIDIA }, "secretaria"), false)
  assert.equal(temPermissao({ role: PERFIS.MIDIA }, "membros"), false)
})

test("perfil desconhecido nunca recebe permissão implicitamente", () => {
  assert.equal(temPermissao({ role: "Outro" }, "senhasAplicativos"), false)
  assert.equal(temPermissao(null, "custosFixos"), false)
  assert.equal(temPermissao({ role: PERFIS.ADMINISTRADOR }, "inexistente"), false)
})
