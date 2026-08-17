import { integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { FORMATS, STATUSES } from "./validate.ts";

export const scripts = pgTable("scripts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  // `format`/`status` are validated at the application layer (see db/validate.ts,
  // used by every write path — Server Actions and later the MCP server) rather
  // than enforced by a DB constraint. Deliberate choice, not an oversight.
  format: text("format", { enum: FORMATS }).notNull(),
  status: text("status", { enum: STATUSES }).notNull().default("Bozza"),
  source: text("source").notNull(),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tabelle Auth.js (login magic link, Fase 2 — vedi docs/superpowers/plans/2026-08-17-fase2-login-ux.md).
// Forma e nomi delle colonne seguono lo schema Postgres di default di @auth/drizzle-adapter
// (node_modules/@auth/drizzle-adapter/src/lib/pg.ts, funzione defineTables), non inventati:
// è la forma richiesta perché l'adapter possa leggere/scrivere queste tabelle senza mapping custom.

export const users = pgTable("user", {
  // Auth.js's Drizzle adapter expects `users.id` as `text`, not Postgres-native `uuid` like
  // `scripts.id`; keep this type when Fase 3 adds `provider_keys.user_id` as its foreign key target.
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compositePk: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  }),
);

// Presente per completezza di tipo dell'adapter Auth.js (DefaultPostgresSchema si aspetta
// sessionsTable anche se opzionale). A runtime resta vuota: questa app usa
// `session: { strategy: "jwt" }` (vedi auth.ts, Fase 2 task 4), quindi le sessioni vivono nel
// cookie firmato, non in questa tabella.
export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// A differenza di sessionsTable, questa è funzionalmente necessaria: il flusso magic link del
// provider Email/Resend la usa per emettere e verificare il token, anche se il tipo TS
// dell'adapter la marca opzionale.
export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({ columns: [verificationToken.identifier, verificationToken.token] }),
  }),
);
