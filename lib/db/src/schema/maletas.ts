import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const maletasTable = pgTable("maletas", {
  id: serial("id").primaryKey(),
  codigoMaleta: text("codigo_maleta").notNull(),
  descripcion: text("descripcion"),
});

export const insertMaletaSchema = createInsertSchema(maletasTable).omit({
  id: true,
});
export type InsertMaleta = z.infer<typeof insertMaletaSchema>;
export type Maleta = typeof maletasTable.$inferSelect;
