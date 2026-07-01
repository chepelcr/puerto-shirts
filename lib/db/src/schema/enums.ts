import { pgEnum } from "drizzle-orm/pg-core";

export const tipoCompraEnum = pgEnum("tipo_compra", ["contado", "credito"]);

export const tallaEnum = pgEnum("talla", ["S", "M", "L", "XL", "XXL", "XXXL"]);

export const tipoMovimientoEnum = pgEnum("tipo_movimiento", [
  "entrada",
  "venta",
  "traslado",
]);
