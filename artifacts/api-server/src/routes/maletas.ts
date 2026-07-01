import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  maletasTable,
  inventarioTable,
  camisetasTable,
  equiposTable,
} from "@workspace/db";
import { CreateMaletaBody, UpdateMaletaBody } from "@workspace/api-zod";
import { num, parseId } from "../lib/http";

const router: IRouter = Router();

router.get("/maletas", async (_req: Request, res: Response) => {
  const rows = await db.select().from(maletasTable).orderBy(maletasTable.codigoMaleta);
  res.json(rows);
});

router.post("/maletas", async (req: Request, res: Response) => {
  const parsed = CreateMaletaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Datos inválidos" });
    return;
  }
  const [row] = await db.insert(maletasTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.get("/maletas/:id", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const [row] = await db.select().from(maletasTable).where(eq(maletasTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Maleta no encontrada" });
    return;
  }
  res.json(row);
});

router.get("/maletas/:id/contenido", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const rows = await db
    .select({
      inventarioId: inventarioTable.id,
      camisetaId: inventarioTable.camisetaId,
      nombreEquipo: equiposTable.nombreEquipo,
      urlImagen: camisetasTable.urlImagen,
      talla: inventarioTable.talla,
      cantidadDisponible: inventarioTable.cantidadDisponible,
      precioVenta: inventarioTable.precioVenta,
      costoUnidad: inventarioTable.costoUnidad,
    })
    .from(inventarioTable)
    .innerJoin(camisetasTable, eq(inventarioTable.camisetaId, camisetasTable.id))
    .innerJoin(equiposTable, eq(camisetasTable.equipoId, equiposTable.id))
    .where(eq(inventarioTable.maletaId, id));

  res.json(
    rows.map((r) => ({
      ...r,
      precioVenta: num(r.precioVenta),
      costoUnidad: num(r.costoUnidad),
    })),
  );
});

router.patch("/maletas/:id", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const parsed = UpdateMaletaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Datos inválidos" });
    return;
  }
  const [row] = await db
    .update(maletasTable)
    .set(parsed.data)
    .where(eq(maletasTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Maleta no encontrada" });
    return;
  }
  res.json(row);
});

router.delete("/maletas/:id", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const [row] = await db
    .delete(maletasTable)
    .where(eq(maletasTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Maleta no encontrada" });
    return;
  }
  res.status(204).end();
});

export default router;
