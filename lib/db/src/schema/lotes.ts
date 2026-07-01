import {
  pgTable,
  serial,
  integer,
  date,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { proveedoresTable } from "./proveedores";
import { tipoCompraEnum } from "./enums";

export const lotesTable = pgTable("lotes", {
  id: serial("id").primaryKey(),
  proveedorId: integer("proveedor_id")
    .notNull()
    .references(() => proveedoresTable.id),
  fechaIngreso: date("fecha_ingreso").notNull(),
  tipoCompra: tipoCompraEnum("tipo_compra").notNull(),
  costoTotal: numeric("costo_total", { precision: 12, scale: 2 }).notNull(),
});

export const insertLoteSchema = createInsertSchema(lotesTable).omit({
  id: true,
});
export type InsertLote = z.infer<typeof insertLoteSchema>;
export type Lote = typeof lotesTable.$inferSelect;
