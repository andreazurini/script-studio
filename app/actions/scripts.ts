"use server";

import { asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { scripts } from "@/db/schema";
import { parseScriptInput, type ScriptInput } from "@/db/validate";

export type ScriptRow = typeof scripts.$inferSelect;

// Defense in depth: every exported function below is a Server Action, i.e. a
// directly callable endpoint independent of which page rendered it — a
// request that reaches one of these without going through the "/" route (and
// therefore without going through middleware.ts's auth check) must still be
// rejected here, not just assumed unreachable. Applied to all five actions,
// not only createScript/updateScript as the plan names explicitly: listScripts,
// deleteScript and duplicateScript are exactly as reachable this way, and
// deleteScript in particular is at least as sensitive as the two named here —
// leaving them unchecked would be an inconsistent gap, not a deliberate one.
export async function listScripts(): Promise<ScriptRow[]> {
  const session = await auth();
  if (!session) throw new Error("Non autenticato.");
  return db.select().from(scripts).orderBy(asc(scripts.createdAt));
}

export async function createScript(input: Partial<ScriptInput> & { id?: string }): Promise<ScriptRow> {
  const session = await auth();
  if (!session) throw new Error("Non autenticato.");
  const { id, ...rest } = input;
  const parsed = parseScriptInput(rest) as ScriptInput;
  const [row] = await db.insert(scripts).values(id ? { id, ...parsed } : parsed).returning();
  return row;
}

export async function updateScript(
  id: string,
  patch: Partial<ScriptInput>,
): Promise<ScriptRow> {
  const session = await auth();
  if (!session) throw new Error("Non autenticato.");
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
  const session = await auth();
  if (!session) throw new Error("Non autenticato.");
  await db.delete(scripts).where(eq(scripts.id, id));
}

export async function duplicateScript(id: string): Promise<ScriptRow> {
  const session = await auth();
  if (!session) throw new Error("Non autenticato.");
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
