import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const equiposTable = pgTable("equipos", {
  id: serial("id").primaryKey(),
  nombreEquipo: text("nombre_equipo").notNull(),
});

export const insertEquipoSchema = createInsertSchema(equiposTable).omit({
  id: true,
});
export type InsertEquipo = z.infer<typeof insertEquipoSchema>;
export type Equipo = typeof equiposTable.$inferSelect;
