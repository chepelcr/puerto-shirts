import { Router, type IRouter, type Request, type Response } from "express";
import { sql, eq, desc, asc, inArray } from "drizzle-orm";
import {
  db,
  ventasTable,
  ventaDetallesTable,
  camisetasTable,
  equiposTable,
  maletasTable,
} from "@workspace/db";
import { num } from "../lib/http";

const router: IRouter = Router();

const fechaDia = sql<string>`to_char(${ventasTable.fecha} AT TIME ZONE 'America/Costa_Rica', 'YYYY-MM-DD')`;

/**
 * @swagger
 * /api/reportes/ventas-diarias:
 *   get:
 *     summary: Daily sales report (aggregated per day)
 *     tags: [Reportes]
 *     responses:
 *       200: { description: Daily sales rows }
 * /api/reportes/ventas-diarias/{fecha}:
 *   get:
 *     summary: Sales detail for a specific day
 *     tags: [Reportes]
 *     parameters:
 *       - { in: path, name: fecha, required: true, schema: { type: string }, description: "Date (YYYY-MM-DD)" }
 *     responses:
 *       200: { description: Sales detail for the day }
 *       422: { description: Invalid date }
 */
router.get("/reportes/ventas-diarias", async (_req: Request, res: Response) => {
  const rows = await db
    .select({
      fecha: fechaDia,
      numVentas: sql<number>`count(*)::int`,
      totalCamisetas: sql<number>`coalesce(sum(${ventasTable.totalCamisetas}), 0)::int`,
      total: sql<number>`coalesce(sum(${ventasTable.total}), 0)::float`,
      utilidad: sql<number>`coalesce(sum(${ventasTable.utilidad}), 0)::float`,
    })
    .from(ventasTable)
    .groupBy(fechaDia)
    .orderBy(desc(fechaDia));

  res.json(rows);
});

router.get(
  "/reportes/ventas-diarias/:fecha",
  async (req: Request, res: Response) => {
    const fecha = String(req.params.fecha);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      res.status(422).json({ error: "Fecha inválida (formato YYYY-MM-DD)" });
      return;
    }

    const ventas = await db
      .select({
        id: ventasTable.id,
        totalCamisetas: ventasTable.totalCamisetas,
        total: ventasTable.total,
        utilidad: ventasTable.utilidad,
        fecha: ventasTable.fecha,
      })
      .from(ventasTable)
      .where(sql`${fechaDia} = ${fecha}`)
      .orderBy(asc(ventasTable.fecha));

    const ventaIds = ventas.map((v) => v.id);

    const detalles = ventaIds.length
      ? await db
          .select({
            id: ventaDetallesTable.id,
            ventaId: ventaDetallesTable.ventaId,
            camisetaId: ventaDetallesTable.camisetaId,
            nombreEquipo: equiposTable.nombreEquipo,
            descripcion: camisetasTable.descripcion,
            urlImagen: camisetasTable.urlImagen,
            talla: ventaDetallesTable.talla,
            cantidad: ventaDetallesTable.cantidad,
            precioUnitario: ventaDetallesTable.precioUnitario,
            subtotal: ventaDetallesTable.subtotal,
            utilidad: ventaDetallesTable.utilidad,
            maletaId: ventaDetallesTable.maletaId,
            codigoMaleta: maletasTable.codigoMaleta,
          })
          .from(ventaDetallesTable)
          .innerJoin(
            camisetasTable,
            eq(ventaDetallesTable.camisetaId, camisetasTable.id),
          )
          .innerJoin(equiposTable, eq(camisetasTable.equipoId, equiposTable.id))
          .leftJoin(
            maletasTable,
            eq(ventaDetallesTable.maletaId, maletasTable.id),
          )
          .where(inArray(ventaDetallesTable.ventaId, ventaIds))
          .orderBy(asc(ventaDetallesTable.id))
      : [];

    const itemsPorVenta = new Map<number, typeof detalles>();
    for (const d of detalles) {
      const list = itemsPorVenta.get(d.ventaId) ?? [];
      list.push(d);
      itemsPorVenta.set(d.ventaId, list);
    }

    let totalCamisetas = 0;
    let total = 0;
    let utilidad = 0;
    const ventasOut = ventas.map((v) => {
      totalCamisetas += v.totalCamisetas;
      total += num(v.total);
      utilidad += num(v.utilidad);
      return {
        id: v.id,
        fecha: v.fecha.toISOString(),
        totalCamisetas: v.totalCamisetas,
        total: num(v.total),
        utilidad: num(v.utilidad),
        items: (itemsPorVenta.get(v.id) ?? []).map((d) => ({
          id: d.id,
          camisetaId: d.camisetaId,
          nombreEquipo: d.nombreEquipo,
          descripcion: d.descripcion,
          urlImagen: d.urlImagen,
          talla: d.talla,
          cantidad: d.cantidad,
          precioUnitario: num(d.precioUnitario),
          subtotal: num(d.subtotal),
          utilidad: num(d.utilidad),
          maletaId: d.maletaId,
          codigoMaleta: d.codigoMaleta,
        })),
      };
    });

    res.json({
      fecha,
      numVentas: ventas.length,
      totalCamisetas,
      total,
      utilidad,
      ventas: ventasOut,
    });
  },
);

export default router;
