import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, type SQL } from "drizzle-orm";
import { db, lotesTable, proveedoresTable } from "@workspace/db";
import { CreateLoteBody, UpdateLoteBody } from "@workspace/api-zod";
import { num, parseId, toDateString } from "../lib/http";

const router: IRouter = Router();

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
      costoTotal: String(costoTotal),
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
