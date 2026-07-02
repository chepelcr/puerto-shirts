import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, proveedoresTable } from "@workspace/db";
import { CreateProveedorBody, UpdateProveedorBody } from "@workspace/api-zod";
import { parseId } from "../lib/http";

const router: IRouter = Router();

/**
 * @swagger
 * /api/proveedores:
 *   get:
 *     summary: List proveedores
 *     tags: [Proveedores]
 *     responses:
 *       200: { description: List of proveedores }
 *   post:
 *     summary: Create a proveedor
 *     tags: [Proveedores]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object } } }
 *     responses:
 *       201: { description: Created }
 *       422: { description: Validation error }
 * /api/proveedores/{id}:
 *   get:
 *     summary: Get a proveedor by id
 *     tags: [Proveedores]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Proveedor }
 *       404: { description: Not found }
 *   patch:
 *     summary: Update a proveedor
 *     tags: [Proveedores]
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
 *     summary: Delete a proveedor
 *     tags: [Proveedores]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Not found }
 */
router.get("/proveedores", async (_req: Request, res: Response) => {
  const rows = await db.select().from(proveedoresTable).orderBy(proveedoresTable.nombre);
  res.json(rows);
});

router.post("/proveedores", async (req: Request, res: Response) => {
  const parsed = CreateProveedorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Datos inválidos" });
    return;
  }
  const [row] = await db.insert(proveedoresTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.get("/proveedores/:id", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const [row] = await db.select().from(proveedoresTable).where(eq(proveedoresTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Proveedor no encontrado" });
    return;
  }
  res.json(row);
});

router.patch("/proveedores/:id", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const parsed = UpdateProveedorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Datos inválidos" });
    return;
  }
  const [row] = await db
    .update(proveedoresTable)
    .set(parsed.data)
    .where(eq(proveedoresTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Proveedor no encontrado" });
    return;
  }
  res.json(row);
});

router.delete("/proveedores/:id", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const [row] = await db
    .delete(proveedoresTable)
    .where(eq(proveedoresTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Proveedor no encontrado" });
    return;
  }
  res.status(204).end();
});

export default router;
