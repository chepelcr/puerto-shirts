import {
  db,
  proveedoresTable,
  equiposTable,
  maletasTable,
  camisetasTable,
  lotesTable,
  inventarioTable,
  kardexTable,
} from "@workspace/db";

async function seed() {
  console.log("Limpiando datos existentes...");
  await db.delete(kardexTable);
  await db.delete(inventarioTable);
  await db.delete(camisetasTable);
  await db.delete(lotesTable);
  await db.delete(maletasTable);
  await db.delete(equiposTable);
  await db.delete(proveedoresTable);

  console.log("Insertando proveedores...");
  const proveedores = await db
    .insert(proveedoresTable)
    .values([
      { nombre: "Distribuidora Deportiva del Sur" },
      { nombre: "Importaciones Fútbol Total" },
    ])
    .returning();

  console.log("Insertando maletas...");
  const maletas = await db
    .insert(maletasTable)
    .values([
      { codigoMaleta: "MAL-001", descripcion: "Bodega principal" },
      { codigoMaleta: "MAL-002", descripcion: "Venta ambulante - Puerto" },
    ])
    .returning();

  console.log("Insertando equipos...");
  const equipos = await db
    .insert(equiposTable)
    .values([
      { nombreEquipo: "FC Barcelona" },
      { nombreEquipo: "Real Madrid CF" },
      { nombreEquipo: "Selección Colombia" },
    ])
    .returning();

  console.log("Insertando camisetas...");
  const camisetas = await db
    .insert(camisetasTable)
    .values([
      {
        equipoId: equipos[0].id,
        urlImagen: "/camisetas/barca-local.png",
        descripcion: "Camiseta local temporada 2025/26",
      },
      {
        equipoId: equipos[0].id,
        urlImagen: "/camisetas/barca-visitante.png",
        descripcion: "Camiseta visitante temporada 2025/26",
      },
      {
        equipoId: equipos[1].id,
        urlImagen: "/camisetas/madrid-local.png",
        descripcion: "Camiseta local temporada 2025/26",
      },
      {
        equipoId: equipos[1].id,
        urlImagen: "/camisetas/madrid-visitante.png",
        descripcion: "Camiseta tercera equipación 2025/26",
      },
      {
        equipoId: equipos[2].id,
        urlImagen: "/camisetas/colombia-local.png",
        descripcion: "Camiseta oficial selección 2025",
      },
    ])
    .returning();

  console.log("Insertando lotes...");
  const lotes = await db
    .insert(lotesTable)
    .values([
      {
        proveedorId: proveedores[0].id,
        fechaIngreso: "2025-05-15",
        tipoCompra: "contado",
        costoTotal: "1250.00",
      },
      {
        proveedorId: proveedores[1].id,
        fechaIngreso: "2025-06-10",
        tipoCompra: "credito",
        costoTotal: "980.00",
      },
    ])
    .returning();

  console.log("Insertando inventario...");
  type Talla = "S" | "M" | "L" | "XL" | "XXL" | "XXXL";
  const inventarioValues: {
    camisetaId: number;
    loteId: number;
    maletaId: number;
    talla: Talla;
    costoUnidad: string;
    precioVenta: string;
    cantidadDisponible: number;
  }[] = [];

  const plan: {
    camiseta: number;
    lote: number;
    maleta: number;
    costo: string;
    precio: string;
    tallas: { talla: Talla; cantidad: number }[];
  }[] = [
    {
      camiseta: 0,
      lote: 0,
      maleta: 0,
      costo: "18.00",
      precio: "35.00",
      tallas: [
        { talla: "S", cantidad: 6 },
        { talla: "M", cantidad: 10 },
        { talla: "L", cantidad: 8 },
        { talla: "XL", cantidad: 2 },
      ],
    },
    {
      camiseta: 1,
      lote: 0,
      maleta: 0,
      costo: "18.00",
      precio: "34.00",
      tallas: [
        { talla: "M", cantidad: 5 },
        { talla: "L", cantidad: 4 },
        { talla: "XL", cantidad: 1 },
      ],
    },
    {
      camiseta: 2,
      lote: 0,
      maleta: 1,
      costo: "20.00",
      precio: "40.00",
      tallas: [
        { talla: "S", cantidad: 4 },
        { talla: "M", cantidad: 7 },
        { talla: "L", cantidad: 6 },
        { talla: "XXL", cantidad: 2 },
      ],
    },
    {
      camiseta: 3,
      lote: 1,
      maleta: 1,
      costo: "20.00",
      precio: "42.00",
      tallas: [
        { talla: "M", cantidad: 3 },
        { talla: "L", cantidad: 2 },
      ],
    },
    {
      camiseta: 4,
      lote: 1,
      maleta: 0,
      costo: "16.00",
      precio: "38.00",
      tallas: [
        { talla: "S", cantidad: 9 },
        { talla: "M", cantidad: 12 },
        { talla: "L", cantidad: 11 },
        { talla: "XL", cantidad: 5 },
        { talla: "XXL", cantidad: 1 },
      ],
    },
  ];

  for (const p of plan) {
    for (const t of p.tallas) {
      inventarioValues.push({
        camisetaId: camisetas[p.camiseta].id,
        loteId: lotes[p.lote].id,
        maletaId: maletas[p.maleta].id,
        talla: t.talla,
        costoUnidad: p.costo,
        precioVenta: p.precio,
        cantidadDisponible: t.cantidad,
      });
    }
  }

  await db.insert(inventarioTable).values(inventarioValues);

  console.log("Registrando movimientos de entrada en kardex...");
  await db.insert(kardexTable).values(
    inventarioValues.map((inv) => ({
      tipoMovimiento: "entrada" as const,
      camisetaId: inv.camisetaId,
      talla: inv.talla,
      cantidad: inv.cantidadDisponible,
      maletaId: inv.maletaId,
      precioUnitario: inv.costoUnidad,
    })),
  );

  console.log("Seed completado con éxito.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
