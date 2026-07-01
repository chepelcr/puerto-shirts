import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, equiposTable } from "@workspace/db";
import { CreateEquipoBody, UpdateEquipoBody } from "@workspace/api-zod";
import { parseId } from "../lib/http";

const router: IRouter = Router();

router.get("/equipos", async (_req: Request, res: Response) => {
  const rows = await db.select().from(equiposTable).orderBy(equiposTable.nombreEquipo);
  res.json(rows);
});

router.post("/equipos", async (req: Request, res: Response) => {
  const parsed = CreateEquipoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Datos inválidos" });
    return;
  }
  const [row] = await db.insert(equiposTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.get("/equipos/:id", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const [row] = await db.select().from(equiposTable).where(eq(equiposTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Equipo no encontrado" });
    return;
  }
  res.json(row);
});

router.patch("/equipos/:id", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const parsed = UpdateEquipoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Datos inválidos" });
    return;
  }
  const [row] = await db
    .update(equiposTable)
    .set(parsed.data)
    .where(eq(equiposTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Equipo no encontrado" });
    return;
  }
  res.json(row);
});

router.delete("/equipos/:id", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const [row] = await db
    .delete(equiposTable)
    .where(eq(equiposTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Equipo no encontrado" });
    return;
  }
  res.status(204).end();
});

export default router;
