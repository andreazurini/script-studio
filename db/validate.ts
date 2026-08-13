export type ScriptFormat = "Reel" | "Video lungo" | "Lezione";
export type ScriptStatus = "Bozza" | "Da rivedere" | "Pronto";

const FORMATS: ScriptFormat[] = ["Reel", "Video lungo", "Lezione"];
const STATUSES: ScriptStatus[] = ["Bozza", "Da rivedere", "Pronto"];

export type ScriptInput = {
  title: string;
  body: string;
  format: ScriptFormat;
  status: ScriptStatus;
  source: string;
  tags: string[];
};

export function parseScriptInput(
  input: Partial<ScriptInput>,
  options: { partial?: boolean } = {},
): Partial<ScriptInput> {
  const result: Partial<ScriptInput> = {};

  if (input.title !== undefined || !options.partial) {
    const title = (input.title ?? "").trim();
    if (!title) throw new Error("Il titolo non può essere vuoto.");
    result.title = title;
  }
  if (input.body !== undefined || !options.partial) {
    result.body = input.body ?? "";
  }
  if (input.format !== undefined || !options.partial) {
    const format = input.format ?? "Reel";
    if (!FORMATS.includes(format)) throw new Error(`Formato non valido: ${format}`);
    result.format = format;
  }
  if (input.status !== undefined || !options.partial) {
    const status = input.status ?? "Bozza";
    if (!STATUSES.includes(status)) throw new Error(`Stato non valido: ${status}`);
    result.status = status;
  }
  if (input.source !== undefined || !options.partial) {
    result.source = input.source ?? "Scritto in Script Studio";
  }
  if (input.tags !== undefined || !options.partial) {
    result.tags = input.tags ?? [];
  }

  return result;
}
