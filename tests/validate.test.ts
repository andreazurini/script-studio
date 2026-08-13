import assert from "node:assert/strict";
import test from "node:test";
import { parseScriptInput } from "../db/validate.ts";

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
