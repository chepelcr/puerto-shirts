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
import { inventarioTable } from "./inventario";
import { tallaEnum } from "./enums";

export const ventasTable = pgTable("ventas", {
  id: serial("id").primaryKey(),
  totalCamisetas: integer("total_camisetas").notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  utilidad: numeric("utilidad", { precision: 12, scale: 2 }).notNull(),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
});

export const ventaDetallesTable = pgTable("venta_detalles", {
  id: serial("id").primaryKey(),
  ventaId: integer("venta_id")
    .notNull()
    .references(() => ventasTable.id, { onDelete: "cascade" }),
  inventarioId: integer("inventario_id").references(() => inventarioTable.id),
  camisetaId: integer("camiseta_id")
    .notNull()
    .references(() => camisetasTable.id),
  talla: tallaEnum("talla").notNull(),
  maletaId: integer("maleta_id").references(() => maletasTable.id),
  cantidad: integer("cantidad").notNull(),
  costoUnidad: numeric("costo_unidad", { precision: 12, scale: 2 }).notNull(),
  precioUnitario: numeric("precio_unitario", {
    precision: 12,
    scale: 2,
  }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  utilidad: numeric("utilidad", { precision: 12, scale: 2 }).notNull(),
});

export const insertVentaSchema = createInsertSchema(ventasTable).omit({
  id: true,
  fecha: true,
});
export const insertVentaDetalleSchema = createInsertSchema(
  ventaDetallesTable,
).omit({ id: true });
export type InsertVenta = z.infer<typeof insertVentaSchema>;
export type InsertVentaDetalle = z.infer<typeof insertVentaDetalleSchema>;
export type Venta = typeof ventasTable.$inferSelect;
export type VentaDetalle = typeof ventaDetallesTable.$inferSelect;
