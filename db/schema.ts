import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
