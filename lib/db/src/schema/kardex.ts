import {
  pgTable,
  serial,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { camisetasTable } from "./camisetas";
import { maletasTable } from "./maletas";
import { tallaEnum, tipoMovimientoEnum } from "./enums";

export const kardexTable = pgTable("kardex", {
  id: serial("id").primaryKey(),
  tipoMovimiento: tipoMovimientoEnum("tipo_movimiento").notNull(),
  camisetaId: integer("camiseta_id")
    .notNull()
    .references(() => camisetasTable.id),
  talla: tallaEnum("talla").notNull(),
  cantidad: integer("cantidad").notNull(),
  maletaId: integer("maleta_id").references(() => maletasTable.id),
  maletaDestinoId: integer("maleta_destino_id").references(
    () => maletasTable.id,
  ),
  precioUnitario: numeric("precio_unitario", { precision: 12, scale: 2 }),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKardexSchema = createInsertSchema(kardexTable).omit({
  id: true,
  fecha: true,
});
export type InsertKardex = z.infer<typeof insertKardexSchema>;
export type MovimientoKardex = typeof kardexTable.$inferSelect;
