import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { equiposTable } from "./equipos";

export const camisetasTable = pgTable("camisetas", {
  id: serial("id").primaryKey(),
  equipoId: integer("equipo_id")
    .notNull()
    .references(() => equiposTable.id),
  urlImagen: text("url_imagen"),
  descripcion: text("descripcion"),
});

export const insertCamisetaSchema = createInsertSchema(camisetasTable).omit({
  id: true,
});
export type InsertCamiseta = z.infer<typeof insertCamisetaSchema>;
export type Camiseta = typeof camisetasTable.$inferSelect;
