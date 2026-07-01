import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  db,
  kardexTable,
  camisetasTable,
  equiposTable,
  maletasTable,
} from "@workspace/db";
import { num } from "../lib/http";

const router: IRouter = Router();

router.get("/kardex", async (req: Request, res: Response) => {
  const maletaOrigen = alias(maletasTable, "maleta_origen");
  const maletaDestino = alias(maletasTable, "maleta_destino");

  const filters: SQL[] = [];
  const tipoMovimiento = req.query.tipoMovimiento;
  const camisetaId = req.query.camisetaId;
  if (
    tipoMovimiento === "entrada" ||
    tipoMovimiento === "venta" ||
    tipoMovimiento === "traslado"
  ) {
    filters.push(eq(kardexTable.tipoMovimiento, tipoMovimiento));
  }
  if (typeof camisetaId === "string" && camisetaId !== "") {
    const cid = Number(camisetaId);
    if (Number.isInteger(cid)) filters.push(eq(kardexTable.camisetaId, cid));
  }

  const rows = await db
    .select({
      id: kardexTable.id,
      tipoMovimiento: kardexTable.tipoMovimiento,
      camisetaId: kardexTable.camisetaId,
      nombreEquipo: equiposTable.nombreEquipo,
      talla: kardexTable.talla,
      cantidad: kardexTable.cantidad,
      maletaId: kardexTable.maletaId,
      codigoMaleta: maletaOrigen.codigoMaleta,
      maletaDestinoId: kardexTable.maletaDestinoId,
      codigoMaletaDestino: maletaDestino.codigoMaleta,
      precioUnitario: kardexTable.precioUnitario,
      fecha: kardexTable.fecha,
    })
    .from(kardexTable)
    .innerJoin(camisetasTable, eq(kardexTable.camisetaId, camisetasTable.id))
    .innerJoin(equiposTable, eq(camisetasTable.equipoId, equiposTable.id))
    .leftJoin(maletaOrigen, eq(kardexTable.maletaId, maletaOrigen.id))
    .leftJoin(maletaDestino, eq(kardexTable.maletaDestinoId, maletaDestino.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(kardexTable.fecha));

  res.json(
    rows.map((r) => ({
      ...r,
      precioUnitario: r.precioUnitario === null ? null : num(r.precioUnitario),
      fecha: r.fecha.toISOString(),
    })),
  );
});

export default router;
