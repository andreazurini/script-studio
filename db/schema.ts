import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const scripts = pgTable("scripts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  format: text("format", { enum: ["Reel", "Video lungo", "Lezione"] }).notNull(),
  status: text("status", { enum: ["Bozza", "Da rivedere", "Pronto"] })
    .notNull()
    .default("Bozza"),
  source: text("source").notNull(),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
