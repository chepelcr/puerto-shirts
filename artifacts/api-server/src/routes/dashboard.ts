import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  camisetasTable,
  equiposTable,
  inventarioTable,
} from "@workspace/db";
import { num } from "../lib/http";

const STOCK_BAJO_UMBRAL = 3;

const router: IRouter = Router();

router.get("/dashboard/resumen", async (_req: Request, res: Response) => {
  const camisetas = await db
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

  const inventario = await db
    .select({
      camisetaId: inventarioTable.camisetaId,
      talla: inventarioTable.talla,
      costoUnidad: inventarioTable.costoUnidad,
      precioVenta: inventarioTable.precioVenta,
      cantidadDisponible: inventarioTable.cantidadDisponible,
    })
    .from(inventarioTable);

  const byCamiseta = new Map<
    number,
    {
      totalUnidades: number;
      utilidadProyectada: number;
      porTalla: Map<string, number>;
    }
  >();

  for (const inv of inventario) {
    let agg = byCamiseta.get(inv.camisetaId);
    if (!agg) {
      agg = { totalUnidades: 0, utilidadProyectada: 0, porTalla: new Map() };
      byCamiseta.set(inv.camisetaId, agg);
    }
    const costo = num(inv.costoUnidad);
    const precio = num(inv.precioVenta);
    agg.totalUnidades += inv.cantidadDisponible;
    agg.utilidadProyectada += (precio - costo) * inv.cantidadDisponible;
    agg.porTalla.set(
      inv.talla,
      (agg.porTalla.get(inv.talla) ?? 0) + inv.cantidadDisponible,
    );
  }

  let totalUnidades = 0;
  let utilidadTotalProyectada = 0;
  let modelosStockBajo = 0;

  const cards = camisetas.map((c) => {
    const agg = byCamiseta.get(c.id);
    const stockPorTalla = agg
      ? Array.from(agg.porTalla.entries()).map(([talla, cantidad]) => ({
          talla,
          cantidad,
          stockBajo: cantidad < STOCK_BAJO_UMBRAL,
        }))
      : [];
    const tieneStockBajo = stockPorTalla.some((s) => s.stockBajo);
    const cardUnidades = agg?.totalUnidades ?? 0;
    const cardUtilidad = agg?.utilidadProyectada ?? 0;

    totalUnidades += cardUnidades;
    utilidadTotalProyectada += cardUtilidad;
    if (tieneStockBajo) modelosStockBajo += 1;

    return {
      camisetaId: c.id,
      equipoId: c.equipoId,
      nombreEquipo: c.nombreEquipo,
      urlImagen: c.urlImagen,
      descripcion: c.descripcion,
      totalUnidades: cardUnidades,
      utilidadProyectada: cardUtilidad,
      tieneStockBajo,
      stockPorTalla,
    };
  });

  res.json({
    totalModelos: camisetas.length,
    totalUnidades,
    utilidadTotalProyectada,
    modelosStockBajo,
    cards,
  });
});

export default router;
