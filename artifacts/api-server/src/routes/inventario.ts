import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, type SQL } from "drizzle-orm";
import {
  db,
  inventarioTable,
  camisetasTable,
  equiposTable,
  maletasTable,
  kardexTable,
} from "@workspace/db";
import {
  IngresarInventarioBody,
  RegistrarVentaBody,
  TrasladarInventarioBody,
} from "@workspace/api-zod";
import { num } from "../lib/http";

const router: IRouter = Router();

router.get("/inventario", async (req: Request, res: Response) => {
  const filters: SQL[] = [];
  const camisetaId = req.query.camisetaId;
  const maletaId = req.query.maletaId;
  if (typeof camisetaId === "string" && camisetaId !== "") {
    const cid = Number(camisetaId);
    if (Number.isInteger(cid)) filters.push(eq(inventarioTable.camisetaId, cid));
  }
  if (typeof maletaId === "string" && maletaId !== "") {
    const mid = Number(maletaId);
    if (Number.isInteger(mid)) filters.push(eq(inventarioTable.maletaId, mid));
  }

  const rows = await db
    .select({
      id: inventarioTable.id,
      camisetaId: inventarioTable.camisetaId,
      loteId: inventarioTable.loteId,
      maletaId: inventarioTable.maletaId,
      talla: inventarioTable.talla,
      costoUnidad: inventarioTable.costoUnidad,
      precioVenta: inventarioTable.precioVenta,
      cantidadDisponible: inventarioTable.cantidadDisponible,
      nombreEquipo: equiposTable.nombreEquipo,
      urlImagen: camisetasTable.urlImagen,
      codigoMaleta: maletasTable.codigoMaleta,
    })
    .from(inventarioTable)
    .innerJoin(camisetasTable, eq(inventarioTable.camisetaId, camisetasTable.id))
    .innerJoin(equiposTable, eq(camisetasTable.equipoId, equiposTable.id))
    .innerJoin(maletasTable, eq(inventarioTable.maletaId, maletasTable.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(equiposTable.nombreEquipo);

  res.json(
    rows.map((r) => {
      const costo = num(r.costoUnidad);
      const precio = num(r.precioVenta);
      return {
        ...r,
        costoUnidad: costo,
        precioVenta: precio,
        utilidadProyectada: (precio - costo) * r.cantidadDisponible,
      };
    }),
  );
});

router.post("/inventario/ingreso", async (req: Request, res: Response) => {
  const parsed = IngresarInventarioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Datos inválidos" });
    return;
  }
  const data = parsed.data;

  if (data.precioVenta <= data.costoUnidad) {
    res.status(422).json({
      error: "El precio de venta debe ser mayor al costo unitario",
    });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(inventarioTable)
      .where(
        and(
          eq(inventarioTable.camisetaId, data.camisetaId),
          eq(inventarioTable.loteId, data.loteId),
          eq(inventarioTable.maletaId, data.maletaId),
          eq(inventarioTable.talla, data.talla),
        ),
      );

    let row;
    if (existing.length > 0) {
      const current = existing[0];
      [row] = await tx
        .update(inventarioTable)
        .set({
          cantidadDisponible: current.cantidadDisponible + data.cantidad,
          costoUnidad: String(data.costoUnidad),
          precioVenta: String(data.precioVenta),
        })
        .where(eq(inventarioTable.id, current.id))
        .returning();
    } else {
      [row] = await tx
        .insert(inventarioTable)
        .values({
          camisetaId: data.camisetaId,
          loteId: data.loteId,
          maletaId: data.maletaId,
          talla: data.talla,
          costoUnidad: String(data.costoUnidad),
          precioVenta: String(data.precioVenta),
          cantidadDisponible: data.cantidad,
        })
        .returning();
    }

    await tx.insert(kardexTable).values({
      tipoMovimiento: "entrada",
      camisetaId: data.camisetaId,
      talla: data.talla,
      cantidad: data.cantidad,
      maletaId: data.maletaId,
      precioUnitario: String(data.costoUnidad),
    });

    return row;
  });

  res.status(201).json({
    ...result,
    costoUnidad: num(result.costoUnidad),
    precioVenta: num(result.precioVenta),
  });
});

router.post("/inventario/venta", async (req: Request, res: Response) => {
  const parsed = RegistrarVentaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Datos inválidos" });
    return;
  }
  const { inventarioId, cantidad } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(inventarioTable)
        .where(eq(inventarioTable.id, inventarioId));

      if (!item) {
        throw new Error("NOT_FOUND");
      }
      if (item.cantidadDisponible < cantidad) {
        throw new Error("INSUFFICIENT");
      }

      const restante = item.cantidadDisponible - cantidad;
      await tx
        .update(inventarioTable)
        .set({ cantidadDisponible: restante })
        .where(eq(inventarioTable.id, inventarioId));

      const precio = num(item.precioVenta);
      await tx.insert(kardexTable).values({
        tipoMovimiento: "venta",
        camisetaId: item.camisetaId,
        talla: item.talla,
        cantidad,
        maletaId: item.maletaId,
        precioUnitario: String(precio),
      });

      return {
        inventarioId,
        cantidadVendida: cantidad,
        cantidadRestante: restante,
        totalVenta: precio * cantidad,
      };
    });

    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "NOT_FOUND") {
      res.status(422).json({ error: "Inventario no encontrado" });
      return;
    }
    if (message === "INSUFFICIENT") {
      res.status(422).json({ error: "Cantidad insuficiente en inventario" });
      return;
    }
    req.log.error({ err }, "Error registrando venta");
    res.status(500).json({ error: "Error registrando venta" });
  }
});

router.post("/inventario/traslado", async (req: Request, res: Response) => {
  const parsed = TrasladarInventarioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Datos inválidos" });
    return;
  }
  const { inventarioId, maletaDestinoId, cantidad } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const [origen] = await tx
        .select()
        .from(inventarioTable)
        .where(eq(inventarioTable.id, inventarioId));

      if (!origen) {
        throw new Error("NOT_FOUND");
      }
      if (origen.cantidadDisponible < cantidad) {
        throw new Error("INSUFFICIENT");
      }
      if (origen.maletaId === maletaDestinoId) {
        throw new Error("SAME_MALETA");
      }

      const [destinoMaleta] = await tx
        .select()
        .from(maletasTable)
        .where(eq(maletasTable.id, maletaDestinoId));
      if (!destinoMaleta) {
        throw new Error("DEST_NOT_FOUND");
      }

      await tx
        .update(inventarioTable)
        .set({ cantidadDisponible: origen.cantidadDisponible - cantidad })
        .where(eq(inventarioTable.id, inventarioId));

      const existingDest = await tx
        .select()
        .from(inventarioTable)
        .where(
          and(
            eq(inventarioTable.camisetaId, origen.camisetaId),
            eq(inventarioTable.loteId, origen.loteId),
            eq(inventarioTable.maletaId, maletaDestinoId),
            eq(inventarioTable.talla, origen.talla),
          ),
        );

      let destino;
      if (existingDest.length > 0) {
        [destino] = await tx
          .update(inventarioTable)
          .set({
            cantidadDisponible: existingDest[0].cantidadDisponible + cantidad,
          })
          .where(eq(inventarioTable.id, existingDest[0].id))
          .returning();
      } else {
        [destino] = await tx
          .insert(inventarioTable)
          .values({
            camisetaId: origen.camisetaId,
            loteId: origen.loteId,
            maletaId: maletaDestinoId,
            talla: origen.talla,
            costoUnidad: origen.costoUnidad,
            precioVenta: origen.precioVenta,
            cantidadDisponible: cantidad,
          })
          .returning();
      }

      await tx.insert(kardexTable).values({
        tipoMovimiento: "traslado",
        camisetaId: origen.camisetaId,
        talla: origen.talla,
        cantidad,
        maletaId: origen.maletaId,
        maletaDestinoId,
      });

      return {
        inventarioOrigenId: inventarioId,
        inventarioDestinoId: destino.id,
        cantidad,
      };
    });

    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "NOT_FOUND") {
      res.status(422).json({ error: "Inventario de origen no encontrado" });
      return;
    }
    if (message === "DEST_NOT_FOUND") {
      res.status(422).json({ error: "Maleta de destino no encontrada" });
      return;
    }
    if (message === "INSUFFICIENT") {
      res.status(422).json({ error: "Cantidad insuficiente en inventario" });
      return;
    }
    if (message === "SAME_MALETA") {
      res.status(422).json({ error: "La maleta de destino debe ser diferente" });
      return;
    }
    req.log.error({ err }, "Error registrando traslado");
    res.status(500).json({ error: "Error registrando traslado" });
  }
});

export default router;
