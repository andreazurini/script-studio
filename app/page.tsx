// app/page.tsx
import { listScripts } from "@/app/actions/scripts";
import { ScriptStudio } from "@/app/script-studio";

export const dynamic = "force-dynamic";

export default async function Page() {
  const rows = await listScripts();
  const initialScripts = rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    format: row.format as "Reel" | "Video lungo" | "Lezione",
    status: row.status as "Bozza" | "Da rivedere" | "Pronto",
    source: row.source,
    tags: row.tags,
    updatedAt: new Date(row.updatedAt).toISOString(),
  }));
  return <ScriptStudio initialScripts={initialScripts} />;
}
