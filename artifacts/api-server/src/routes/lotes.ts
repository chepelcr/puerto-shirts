import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, sql, asc, type SQL } from "drizzle-orm";
import {
  db,
  lotesTable,
  proveedoresTable,
  inventarioTable,
  camisetasTable,
  equiposTable,
} from "@workspace/db";
import { CreateLoteBody, UpdateLoteBody } from "@workspace/api-zod";
import { num, parseId, toDateString } from "../lib/http";
import { ObjectStorageService } from "../lib/objectStorage";
import { buildLoteReportPdf } from "../lib/pdf";

const router: IRouter = Router();
const objectStorage = new ObjectStorageService();

// Aggregate a lote's inventory by camiseta + talla: how many were originally
// bought vs. how many are still in stock (summed across every maleta). No profit
// here — this feeds the proveedor-facing lote report.
async function loadLoteDetalle(id: number) {
  const [lote] = await db
    .select({
      id: lotesTable.id,
      proveedorId: lotesTable.proveedorId,
      nombreProveedor: proveedoresTable.nombre,
      fechaIngreso: lotesTable.fechaIngreso,
      tipoCompra: lotesTable.tipoCompra,
      costoTotal: lotesTable.costoTotal,
    })
    .from(lotesTable)
    .innerJoin(proveedoresTable, eq(lotesTable.proveedorId, proveedoresTable.id))
    .where(eq(lotesTable.id, id));
  if (!lote) return null;

  const grouped = await db
    .select({
      camisetaId: inventarioTable.camisetaId,
      nombreEquipo: equiposTable.nombreEquipo,
      descripcion: camisetasTable.descripcion,
      urlImagen: camisetasTable.urlImagen,
      talla: inventarioTable.talla,
      cantidadInicial: sql<number>`coalesce(sum(${inventarioTable.cantidadInicial}), 0)::int`,
      cantidadDisponible: sql<number>`coalesce(sum(${inventarioTable.cantidadDisponible}), 0)::int`,
      costoLinea: sql<number>`coalesce(sum(${inventarioTable.cantidadInicial} * ${inventarioTable.costoUnidad}), 0)::float`,
    })
    .from(inventarioTable)
    .innerJoin(camisetasTable, eq(inventarioTable.camisetaId, camisetasTable.id))
    .innerJoin(equiposTable, eq(camisetasTable.equipoId, equiposTable.id))
    .where(eq(inventarioTable.loteId, id))
    .groupBy(
      inventarioTable.camisetaId,
      equiposTable.nombreEquipo,
      camisetasTable.descripcion,
      camisetasTable.urlImagen,
      inventarioTable.talla,
    )
    .orderBy(asc(equiposTable.nombreEquipo), asc(inventarioTable.talla));

  let totalInicial = 0;
  let totalDisponible = 0;
  const items = grouped.map((g) => {
    totalInicial += g.cantidadInicial;
    totalDisponible += g.cantidadDisponible;
    return {
      camisetaId: g.camisetaId,
      nombreEquipo: g.nombreEquipo,
      descripcion: g.descripcion,
      urlImagen: g.urlImagen,
      talla: g.talla,
      cantidadInicial: g.cantidadInicial,
      cantidadDisponible: g.cantidadDisponible,
      costoUnidad:
        g.cantidadInicial > 0
          ? Math.round((g.costoLinea / g.cantidadInicial) * 100) / 100
          : 0,
    };
  });

  return {
    ...lote,
    costoTotal: num(lote.costoTotal),
    totalInicial,
    totalDisponible,
    totalVendido: totalInicial - totalDisponible,
    items,
  };
}

/**
 * @swagger
 * /api/lotes:
 *   get:
 *     summary: List lotes
 *     tags: [Lotes]
 *     parameters:
 *       - { in: query, name: tipoCompra, required: false, schema: { type: string, enum: [contado, credito] } }
 *       - { in: query, name: proveedorId, required: false, schema: { type: integer } }
 *     responses:
 *       200: { description: List of lotes }
 *   post:
 *     summary: Create a lote
 *     tags: [Lotes]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object } } }
 *     responses:
 *       201: { description: Created }
 *       422: { description: Validation error }
 * /api/lotes/{id}:
 *   get:
 *     summary: Get a lote by id
 *     tags: [Lotes]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Lote }
 *       404: { description: Not found }
 *   patch:
 *     summary: Update a lote
 *     tags: [Lotes]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object } } }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 *       422: { description: Validation error }
 *   delete:
 *     summary: Delete a lote
 *     tags: [Lotes]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Not found }
 */
router.get("/lotes", async (req: Request, res: Response) => {
  const filters: SQL[] = [];
  const tipoCompra = req.query.tipoCompra;
  const proveedorId = req.query.proveedorId;
  if (tipoCompra === "contado" || tipoCompra === "credito") {
    filters.push(eq(lotesTable.tipoCompra, tipoCompra));
  }
  if (typeof proveedorId === "string" && proveedorId !== "") {
    const pid = Number(proveedorId);
    if (Number.isInteger(pid)) filters.push(eq(lotesTable.proveedorId, pid));
  }

  const rows = await db
    .select({
      id: lotesTable.id,
      proveedorId: lotesTable.proveedorId,
      nombreProveedor: proveedoresTable.nombre,
      fechaIngreso: lotesTable.fechaIngreso,
      tipoCompra: lotesTable.tipoCompra,
      costoTotal: lotesTable.costoTotal,
    })
    .from(lotesTable)
    .innerJoin(proveedoresTable, eq(lotesTable.proveedorId, proveedoresTable.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(lotesTable.fechaIngreso);

  res.json(rows.map((r) => ({ ...r, costoTotal: num(r.costoTotal) })));
});

router.post("/lotes", async (req: Request, res: Response) => {
  const parsed = CreateLoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Datos inválidos" });
    return;
  }
  const { costoTotal, fechaIngreso, ...rest } = parsed.data;
  const [row] = await db
    .insert(lotesTable)
    .values({
      ...rest,
      fechaIngreso: toDateString(fechaIngreso),
      // Costo total starts at 0 and accrues as stock is added via inventario/ingreso.
      costoTotal: String(costoTotal ?? 0),
    })
    .returning();
  res.status(201).json({ ...row, costoTotal: num(row.costoTotal) });
});

router.get("/lotes/:id", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const [row] = await db
    .select({
      id: lotesTable.id,
      proveedorId: lotesTable.proveedorId,
      nombreProveedor: proveedoresTable.nombre,
      fechaIngreso: lotesTable.fechaIngreso,
      tipoCompra: lotesTable.tipoCompra,
      costoTotal: lotesTable.costoTotal,
    })
    .from(lotesTable)
    .innerJoin(proveedoresTable, eq(lotesTable.proveedorId, proveedoresTable.id))
    .where(eq(lotesTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Lote no encontrado" });
    return;
  }
  res.json({ ...row, costoTotal: num(row.costoTotal) });
});

router.patch("/lotes/:id", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const parsed = UpdateLoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Datos inválidos" });
    return;
  }
  const { costoTotal, fechaIngreso, ...rest } = parsed.data;
  const values: Record<string, unknown> = { ...rest };
  if (costoTotal !== undefined) values.costoTotal = String(costoTotal);
  if (fechaIngreso !== undefined) values.fechaIngreso = toDateString(fechaIngreso);
  const [row] = await db
    .update(lotesTable)
    .set(values)
    .where(eq(lotesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Lote no encontrado" });
    return;
  }
  res.json({ ...row, costoTotal: num(row.costoTotal) });
});

/**
 * @swagger
 * /api/lotes/{id}/detalle:
 *   get:
 *     summary: Lote detail — original quantities vs current stock (no profit)
 *     tags: [Lotes]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Lote with per-camiseta original vs available stock }
 *       404: { description: Not found }
 * /api/lotes/{id}/reporte:
 *   post:
 *     summary: Generate a lote PDF report (stock, no profit) and store it in S3
 *     tags: [Lotes]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       201: { description: PDF generated; returns its public URL }
 *       404: { description: Not found }
 */
router.get("/lotes/:id/detalle", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const detalle = await loadLoteDetalle(id);
  if (!detalle) {
    res.status(404).json({ error: "Lote no encontrado" });
    return;
  }
  res.json(detalle);
});

router.post("/lotes/:id/reporte", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const detalle = await loadLoteDetalle(id);
  if (!detalle) {
    res.status(404).json({ error: "Lote no encontrado" });
    return;
  }

  try {
    const pdf = await buildLoteReportPdf({
      loteId: detalle.id,
      nombreProveedor: detalle.nombreProveedor,
      fechaIngreso: detalle.fechaIngreso,
      tipoCompra: detalle.tipoCompra,
      costoTotal: detalle.costoTotal,
      items: detalle.items.map((i) => ({
        nombreEquipo: i.nombreEquipo,
        descripcion: i.descripcion,
        talla: i.talla,
        cantidadInicial: i.cantidadInicial,
        cantidadDisponible: i.cantidadDisponible,
        costoUnidad: i.costoUnidad,
      })),
    });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const key = `reportes/lotes/lote-${id}-${stamp}.pdf`;
    const url = await objectStorage.uploadObject(key, pdf, "application/pdf");
    res.status(201).json({ url, key });
  } catch (err) {
    req.log.error({ err }, "Error generando reporte de lote");
    res.status(500).json({ error: "Error generando el reporte" });
  }
});

router.delete("/lotes/:id", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const [row] = await db
    .delete(lotesTable)
    .where(eq(lotesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Lote no encontrado" });
    return;
  }
  res.status(204).end();
});

export default router;
