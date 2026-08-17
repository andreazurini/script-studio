"use server";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { scripts } from "@/db/schema";
import { parseScriptInput, type ScriptInput } from "@/db/validate";

export type ScriptRow = typeof scripts.$inferSelect;

export async function listScripts(): Promise<ScriptRow[]> {
  return db.select().from(scripts).orderBy(asc(scripts.createdAt));
}

export async function createScript(input: Partial<ScriptInput> & { id?: string }): Promise<ScriptRow> {
  const { id, ...rest } = input;
  const parsed = parseScriptInput(rest) as ScriptInput;
  const [row] = await db.insert(scripts).values(id ? { id, ...parsed } : parsed).returning();
  return row;
}

export async function updateScript(
  id: string,
  patch: Partial<ScriptInput>,
): Promise<ScriptRow> {
  const parsed = parseScriptInput(patch, { partial: true });
  const [row] = await db
    .update(scripts)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(scripts.id, id))
    .returning();
  if (!row) throw new Error(`Script ${id} non trovato.`);
  return row;
}

export async function deleteScript(id: string): Promise<void> {
  await db.delete(scripts).where(eq(scripts.id, id));
}

export async function duplicateScript(id: string): Promise<ScriptRow> {
  const [original] = await db.select().from(scripts).where(eq(scripts.id, id));
  if (!original) throw new Error(`Script ${id} non trovato.`);
  // Values come from an existing valid row, so re-running parseScriptInput is
  // unnecessary — the only change is the title suffix, and validate.ts has no
  // max length on title (just a non-empty check), so it can't push the copy
  // past a constraint the original already satisfied.
  const [row] = await db
    .insert(scripts)
    .values({
      title: `${original.title} (copia)`,
      body: original.body,
      format: original.format,
      status: original.status,
      source: original.source,
      tags: original.tags,
    })
    .returning();
  return row;
}
