import { Router, type IRouter, type Request, type Response } from "express";
import { sql, eq, and, desc, asc } from "drizzle-orm";
import {
  db,
  kardexTable,
  camisetasTable,
  equiposTable,
  maletasTable,
} from "@workspace/db";
import { num } from "../lib/http";

const router: IRouter = Router();

const TZ = "America/Costa_Rica";

const fechaDia = sql<string>`to_char(${kardexTable.fecha} AT TIME ZONE ${TZ}, 'YYYY-MM-DD')`;

router.get("/reportes/ventas-diarias", async (_req: Request, res: Response) => {
  const rows = await db
    .select({
      fecha: fechaDia,
      totalCamisetas: sql<number>`sum(${kardexTable.cantidad})::int`,
      totalVenta: sql<number>`coalesce(sum(${kardexTable.cantidad} * ${kardexTable.precioUnitario}), 0)::float`,
      numTransacciones: sql<number>`count(*)::int`,
    })
    .from(kardexTable)
    .where(eq(kardexTable.tipoMovimiento, "venta"))
    .groupBy(fechaDia)
    .orderBy(desc(fechaDia));

  res.json(rows);
});

router.get(
  "/reportes/ventas-diarias/:fecha",
  async (req: Request, res: Response) => {
    const fecha = req.params.fecha;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      res.status(422).json({ error: "Fecha inválida (formato YYYY-MM-DD)" });
      return;
    }

    const rows = await db
      .select({
        id: kardexTable.id,
        camisetaId: kardexTable.camisetaId,
        nombreEquipo: equiposTable.nombreEquipo,
        descripcion: camisetasTable.descripcion,
        urlImagen: camisetasTable.urlImagen,
        talla: kardexTable.talla,
        cantidad: kardexTable.cantidad,
        precioUnitario: kardexTable.precioUnitario,
        maletaId: kardexTable.maletaId,
        codigoMaleta: maletasTable.codigoMaleta,
        fecha: kardexTable.fecha,
      })
      .from(kardexTable)
      .innerJoin(camisetasTable, eq(kardexTable.camisetaId, camisetasTable.id))
      .innerJoin(equiposTable, eq(camisetasTable.equipoId, equiposTable.id))
      .leftJoin(maletasTable, eq(kardexTable.maletaId, maletasTable.id))
      .where(
        and(
          eq(kardexTable.tipoMovimiento, "venta"),
          sql`${fechaDia} = ${fecha}`,
        ),
      )
      .orderBy(asc(kardexTable.fecha));

    let totalCamisetas = 0;
    let totalVenta = 0;
    const ventas = rows.map((r) => {
      const precio = num(r.precioUnitario);
      const subtotal = precio * r.cantidad;
      totalCamisetas += r.cantidad;
      totalVenta += subtotal;
      return {
        id: r.id,
        camisetaId: r.camisetaId,
        nombreEquipo: r.nombreEquipo,
        descripcion: r.descripcion,
        urlImagen: r.urlImagen,
        talla: r.talla,
        cantidad: r.cantidad,
        precioUnitario: precio,
        subtotal,
        maletaId: r.maletaId,
        codigoMaleta: r.codigoMaleta,
        fecha: r.fecha.toISOString(),
      };
    });

    res.json({ fecha, totalCamisetas, totalVenta, ventas });
  },
);

export default router;
