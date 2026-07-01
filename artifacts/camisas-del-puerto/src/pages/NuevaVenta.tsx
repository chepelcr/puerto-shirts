import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInventario,
  useRegistrarVenta,
} from "@workspace/api-client-react";
import type { InventarioItem } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Search,
  ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage, money, resolveImg } from "@/lib/format";

const STOCK_BAJO = 3;

export default function NuevaVenta() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: inventario, isLoading } = useListInventario();
  const vender = useRegistrarVenta();

  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState<Record<number, number>>({});

  const porId = useMemo(() => {
    const m = new Map<number, InventarioItem>();
    (inventario ?? []).forEach((i) => m.set(i.id, i));
    return m;
  }, [inventario]);

  const filtrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const items = (inventario ?? []).filter((i) => i.cantidadDisponible > 0);
    if (!q) return items;
    return items.filter(
      (i) =>
        (i.nombreEquipo ?? "").toLowerCase().includes(q) ||
        i.talla.toLowerCase().includes(q) ||
        (i.codigoMaleta ?? "").toLowerCase().includes(q),
    );
  }, [inventario, busqueda]);

  const setCantidad = (item: InventarioItem, cantidad: number) => {
    setCarrito((prev) => {
      const next = { ...prev };
      const max = item.cantidadDisponible;
      const c = Math.max(0, Math.min(cantidad, max));
      if (c <= 0) delete next[item.id];
      else next[item.id] = c;
      return next;
    });
  };

  const agregar = (item: InventarioItem) =>
    setCantidad(item, (carrito[item.id] ?? 0) + 1);

  const lineas = useMemo(
    () =>
      Object.entries(carrito)
        .map(([id, cantidad]) => {
          const item = porId.get(Number(id));
          return item ? { item, cantidad } : null;
        })
        .filter((x): x is { item: InventarioItem; cantidad: number } => !!x),
    [carrito, porId],
  );

  const totalUnidades = lineas.reduce((s, l) => s + l.cantidad, 0);
  const totalVenta = lineas.reduce(
    (s, l) => s + l.item.precioVenta * l.cantidad,
    0,
  );
  const totalUtilidad = lineas.reduce(
    (s, l) => s + (l.item.precioVenta - l.item.costoUnidad) * l.cantidad,
    0,
  );

  const confirmar = () => {
    if (lineas.length === 0) return;
    vender.mutate(
      {
        data: {
          items: lineas.map((l) => ({
            inventarioId: l.item.id,
            cantidad: l.cantidad,
          })),
        },
      },
      {
        onSuccess: (r) => {
          qc.invalidateQueries();
          setCarrito({});
          toast({
            title: "Venta registrada",
            description: `${r.totalCamisetas} camiseta(s) · ${money(r.totalVenta)}`,
          });
          navigate("/reportes");
        },
        onError: (e) =>
          toast({
            title: "Error",
            description: apiErrorMessage(e, "No se pudo registrar la venta"),
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingCart className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl md:text-3xl font-display text-foreground tracking-tight">
            Nueva venta
          </h1>
          <p className="text-sm text-muted-foreground">
            Agregá camisetas de cualquier equipo y talla al carrito.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Catálogo */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por equipo, talla o maleta..."
              className="pl-9"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {isLoading ? (
            <p className="text-muted-foreground animate-pulse">
              Cargando inventario...
            </p>
          ) : filtrado.length === 0 ? (
            <p className="text-muted-foreground">
              No hay inventario disponible para vender.
            </p>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Talla</TableHead>
                    <TableHead>Maleta</TableHead>
                    <TableHead className="text-right">Disp.</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrado.map((i) => {
                    const enCarrito = carrito[i.id] ?? 0;
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">
                          {i.nombreEquipo}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            {i.talla}
                            {i.cantidadDisponible < STOCK_BAJO && (
                              <Badge className="bg-destructive/20 text-destructive text-xs">
                                Bajo
                              </Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {i.codigoMaleta}
                        </TableCell>
                        <TableCell className="text-right">
                          {i.cantidadDisponible}
                        </TableCell>
                        <TableCell className="text-right">
                          {money(i.precioVenta)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1"
                            disabled={enCarrito >= i.cantidadDisponible}
                            onClick={() => agregar(i)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {enCarrito > 0 ? `En carrito: ${enCarrito}` : "Agregar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Carrito */}
        <div className="lg:col-span-1">
          <Card className="bg-card border-card-border lg:sticky lg:top-6">
            <CardContent className="p-4 space-y-4">
              <h2 className="font-display text-lg text-foreground flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" /> Carrito
              </h2>

              {lineas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <ImageIcon className="h-10 w-10 opacity-30 mb-2" />
                  <p className="text-sm">Aún no has agregado camisetas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lineas.map(({ item, cantidad }) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="h-10 w-10 rounded bg-black/40 overflow-hidden shrink-0 flex items-center justify-center">
                        {resolveImg(item.urlImagen) ? (
                          <img
                            src={resolveImg(item.urlImagen) as string}
                            alt={item.nombreEquipo ?? ""}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground opacity-40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.nombreEquipo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Talla {item.talla} · {money(item.precioVenta)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setCantidad(item, cantidad - 1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm">
                          {cantidad}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={cantidad >= item.cantidadDisponible}
                          onClick={() => setCantidad(item, cantidad + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setCantidad(item, 0)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1 pt-2 border-t border-border">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Camisetas</span>
                  <span>{totalUnidades}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Utilidad</span>
                  <span className="text-primary">{money(totalUtilidad)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{money(totalVenta)}</span>
                </div>
              </div>

              <Button
                className="w-full gap-2"
                disabled={lineas.length === 0 || vender.isPending}
                onClick={confirmar}
              >
                <ShoppingCart className="h-4 w-4" /> Confirmar venta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
