import test from "node:test";
import assert from "node:assert/strict";
import {
  CULTOS,
  ROTAS_SITE,
  obterProximosCultos,
} from "../src/igreja/siteData.js";

test("site público mantém as páginas institucionais e a programação", () => {
  assert.equal(ROTAS_SITE["/quem-somos"], "quem-somos");
  assert.equal(ROTAS_SITE["/onde-estamos"], "onde-estamos");
  assert.equal(ROTAS_SITE["/departamentos"], "departamentos");
  assert.equal(ROTAS_SITE["/programacao"], "programacao");
  assert.equal(ROTAS_SITE["/contribuicao"], "contribuicao");
});

test("programação semanal preserva todos os horários oficiais", () => {
  assert.deepEqual(
    CULTOS.map(({ dia, horario, titulo }) => [dia, horario, titulo]),
    [
      ["Segunda-feira", "19h30", "Congresso de Oração"],
      ["Segunda-feira", "20h10", "Ensaio do Círculo de Oração"],
      ["Terça-feira", "14h", "Oração"],
      ["Quarta-feira", "19h30", "Culto de Ensino"],
      ["Sexta-feira", "19h30", "Culto"],
      ["Domingo", "9h", "Escola Bíblica Dominical"],
      ["Domingo", "18h30", "Culto"],
    ]
  );
});

test("próximo encontro considera o horário de São Paulo", () => {
  const antesDoEnsino = new Date("2026-07-29T21:00:00.000Z");
  const duranteSegunda = new Date("2026-08-03T22:45:00.000Z");
  const domingoAposEbd = new Date("2026-08-02T13:00:00.000Z");

  assert.equal(obterProximosCultos(antesDoEnsino, 1)[0].id, "quarta-ensino");
  assert.equal(obterProximosCultos(duranteSegunda, 1)[0].id, "segunda-circulo");
  assert.equal(obterProximosCultos(domingoAposEbd, 1)[0].id, "domingo-culto");
});
