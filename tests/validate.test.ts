import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedEmail, parseScriptInput } from "../db/validate.ts";

function withAllowedEmail(t: import("node:test").TestContext, value: string | undefined) {
  const original = process.env.ALLOWED_EMAIL;
  if (value === undefined) delete process.env.ALLOWED_EMAIL;
  else process.env.ALLOWED_EMAIL = value;
  t.after(() => {
    if (original === undefined) delete process.env.ALLOWED_EMAIL;
    else process.env.ALLOWED_EMAIL = original;
  });
}

test("richiede un titolo non vuoto per un input completo", () => {
  assert.throws(
    () => parseScriptInput({ title: "   ", body: "", format: "Reel", status: "Bozza", source: "Test", tags: [] }),
    /titolo/i,
  );
});

test("applica i default quando i campi opzionali mancano", () => {
  const parsed = parseScriptInput({ title: "Nuovo copione" });
  assert.equal(parsed.title, "Nuovo copione");
  assert.equal(parsed.format, "Reel");
  assert.equal(parsed.status, "Bozza");
  assert.deepEqual(parsed.tags, []);
});

test("rifiuta un formato non valido", () => {
  assert.throws(
    () => parseScriptInput({ title: "X", format: "Podcast" as never }),
    /formato/i,
  );
});

test("in modalità partial non tocca i campi omessi", () => {
  const parsed = parseScriptInput({ status: "Pronto" }, { partial: true });
  assert.deepEqual(Object.keys(parsed), ["status"]);
});

test("isAllowedEmail accetta un match esatto con ALLOWED_EMAIL", (t) => {
  withAllowedEmail(t, "info@andreazurini.it");
  assert.equal(isAllowedEmail("info@andreazurini.it"), true);
});

test("isAllowedEmail rifiuta un indirizzo diverso", (t) => {
  withAllowedEmail(t, "info@andreazurini.it");
  assert.equal(isAllowedEmail("altro@example.com"), false);
});

test("isAllowedEmail ignora la differenza tra maiuscole e minuscole (env minuscola, input maiuscola)", (t) => {
  withAllowedEmail(t, "info@andreazurini.it");
  assert.equal(isAllowedEmail("INFO@ANDREAZURINI.IT"), true);
});

test("isAllowedEmail ignora la differenza tra maiuscole e minuscole (env maiuscola, input minuscola)", (t) => {
  withAllowedEmail(t, "INFO@ANDREAZURINI.IT");
  assert.equal(isAllowedEmail("info@andreazurini.it"), true);
});

test("isAllowedEmail rifiuta tutto se ALLOWED_EMAIL non è impostata (fail-closed)", (t) => {
  withAllowedEmail(t, undefined);
  assert.equal(isAllowedEmail("info@andreazurini.it"), false);
});

test("isAllowedEmail rifiuta tutto se ALLOWED_EMAIL è una stringa vuota (fail-closed)", (t) => {
  withAllowedEmail(t, "");
  assert.equal(isAllowedEmail("info@andreazurini.it"), false);
});

test("isAllowedEmail rifiuta tutto se ALLOWED_EMAIL è solo spazi bianchi (fail-closed)", (t) => {
  withAllowedEmail(t, "   ");
  assert.equal(isAllowedEmail(""), false);
});
