import {
  pgTable,
  serial,
  integer,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { camisetasTable } from "./camisetas";
import { lotesTable } from "./lotes";
import { maletasTable } from "./maletas";
import { tallaEnum } from "./enums";

export const inventarioTable = pgTable("inventario", {
  id: serial("id").primaryKey(),
  camisetaId: integer("camiseta_id")
    .notNull()
    .references(() => camisetasTable.id),
  loteId: integer("lote_id")
    .notNull()
    .references(() => lotesTable.id),
  maletaId: integer("maleta_id")
    .notNull()
    .references(() => maletasTable.id),
  talla: tallaEnum("talla").notNull(),
  costoUnidad: numeric("costo_unidad", { precision: 12, scale: 2 }).notNull(),
  precioVenta: numeric("precio_venta", { precision: 12, scale: 2 }).notNull(),
  cantidadDisponible: integer("cantidad_disponible").notNull().default(0),
  expuesto: boolean("expuesto").notNull().default(false),
});

export const insertInventarioSchema = createInsertSchema(inventarioTable).omit({
  id: true,
});
export type InsertInventario = z.infer<typeof insertInventarioSchema>;
export type Inventario = typeof inventarioTable.$inferSelect;
