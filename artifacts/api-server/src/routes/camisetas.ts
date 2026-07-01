import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  camisetasTable,
  equiposTable,
  inventarioTable,
  maletasTable,
  lotesTable,
  proveedoresTable,
} from "@workspace/db";
import { CreateCamisetaBody, UpdateCamisetaBody } from "@workspace/api-zod";
import { num, parseId } from "../lib/http";

const router: IRouter = Router();

router.get("/camisetas", async (_req: Request, res: Response) => {
  const rows = await db
    .select({
      id: camisetasTable.id,
      equipoId: camisetasTable.equipoId,
      nombreEquipo: equiposTable.nombreEquipo,
      urlImagen: camisetasTable.urlImagen,
      descripcion: camisetasTable.descripcion,
    })
    .from(camisetasTable)
    .innerJoin(equiposTable, eq(camisetasTable.equipoId, equiposTable.id))
    .orderBy(equiposTable.nombreEquipo);
  res.json(rows);
});

router.post("/camisetas", async (req: Request, res: Response) => {
  const parsed = CreateCamisetaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Datos inválidos" });
    return;
  }
  const [row] = await db.insert(camisetasTable).values(parsed.data).returning();
  const [equipo] = await db
    .select()
    .from(equiposTable)
    .where(eq(equiposTable.id, row.equipoId));
  res.status(201).json({ ...row, nombreEquipo: equipo?.nombreEquipo ?? null });
});

router.get("/camisetas/:id", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const [row] = await db
    .select({
      id: camisetasTable.id,
      equipoId: camisetasTable.equipoId,
      nombreEquipo: equiposTable.nombreEquipo,
      urlImagen: camisetasTable.urlImagen,
      descripcion: camisetasTable.descripcion,
    })
    .from(camisetasTable)
    .innerJoin(equiposTable, eq(camisetasTable.equipoId, equiposTable.id))
    .where(eq(camisetasTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Camiseta no encontrada" });
    return;
  }
  res.json(row);
});

router.get("/camisetas/:id/detalle", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const [camiseta] = await db
    .select({
      id: camisetasTable.id,
      equipoId: camisetasTable.equipoId,
      nombreEquipo: equiposTable.nombreEquipo,
      urlImagen: camisetasTable.urlImagen,
      descripcion: camisetasTable.descripcion,
    })
    .from(camisetasTable)
    .innerJoin(equiposTable, eq(camisetasTable.equipoId, equiposTable.id))
    .where(eq(camisetasTable.id, id));

  if (!camiseta) {
    res.status(404).json({ error: "Camiseta no encontrada" });
    return;
  }

  const lines = await db
    .select({
      inventarioId: inventarioTable.id,
      talla: inventarioTable.talla,
      cantidadDisponible: inventarioTable.cantidadDisponible,
      expuesto: inventarioTable.expuesto,
      costoUnidad: inventarioTable.costoUnidad,
      precioVenta: inventarioTable.precioVenta,
      maletaId: inventarioTable.maletaId,
      codigoMaleta: maletasTable.codigoMaleta,
      loteId: inventarioTable.loteId,
      nombreProveedor: proveedoresTable.nombre,
    })
    .from(inventarioTable)
    .innerJoin(maletasTable, eq(inventarioTable.maletaId, maletasTable.id))
    .innerJoin(lotesTable, eq(inventarioTable.loteId, lotesTable.id))
    .innerJoin(
      proveedoresTable,
      eq(lotesTable.proveedorId, proveedoresTable.id),
    )
    .where(eq(inventarioTable.camisetaId, id));

  let totalUnidades = 0;
  let utilidadTotal = 0;
  const desglose = lines.map((l) => {
    const costo = num(l.costoUnidad);
    const precio = num(l.precioVenta);
    const utilidad = (precio - costo) * l.cantidadDisponible;
    totalUnidades += l.cantidadDisponible;
    utilidadTotal += utilidad;
    return {
      inventarioId: l.inventarioId,
      talla: l.talla,
      cantidadDisponible: l.cantidadDisponible,
      expuesto: l.expuesto,
      costoUnidad: costo,
      precioVenta: precio,
      utilidadProyectada: utilidad,
      maletaId: l.maletaId,
      codigoMaleta: l.codigoMaleta,
      loteId: l.loteId,
      nombreProveedor: l.nombreProveedor,
    };
  });

  res.json({ ...camiseta, totalUnidades, utilidadTotal, desglose });
});

router.patch("/camisetas/:id", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const parsed = UpdateCamisetaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Datos inválidos" });
    return;
  }
  const [row] = await db
    .update(camisetasTable)
    .set(parsed.data)
    .where(eq(camisetasTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Camiseta no encontrada" });
    return;
  }
  const [equipo] = await db
    .select()
    .from(equiposTable)
    .where(eq(equiposTable.id, row.equipoId));
  res.json({ ...row, nombreEquipo: equipo?.nombreEquipo ?? null });
});

router.delete("/camisetas/:id", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const [row] = await db
    .delete(camisetasTable)
    .where(eq(camisetasTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Camiseta no encontrada" });
    return;
  }
  res.status(204).end();
});

export default router;
