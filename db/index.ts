// db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL non è impostata. Configurala con la connection string del Postgres Railway.",
    );
  }
  return url;
}

const pool = new Pool({ connectionString: requireDatabaseUrl() });

export const db = drizzle(pool, { schema });
