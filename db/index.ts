import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL non è impostata. Configurala con la connection string del Postgres Railway.",
    );
  }
  return url;
}

const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ?? new Pool({ connectionString: requireDatabaseUrl(), max: 5 });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

pool.on("error", (error) => {
  console.error("Errore imprevisto dal pool Postgres:", error);
});

export const db = drizzle(pool, { schema });
