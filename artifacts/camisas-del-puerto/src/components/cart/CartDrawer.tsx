import { useMemo } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInventario,
  useRegistrarVenta,
} from "@workspace/api-client-react";
import type { InventarioItem } from "@workspace/api-client-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage, money, resolveImg } from "@/lib/format";
import { useCart } from "@/context/CartContext";

export function CartDrawer() {
  const {
    carrito,
    totalUnidades,
    abierto,
    setAbierto,
    abrir,
    setCantidad,
    quitar,
    limpiar,
  } = useCart();
  const { data: inventario } = useListInventario();
  const vender = useRegistrarVenta();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const porId = useMemo(() => {
    const m = new Map<number, InventarioItem>();
    (inventario ?? []).forEach((i) => m.set(i.id, i));
    return m;
  }, [inventario]);

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
          limpiar();
          setAbierto(false);
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
    <>
      {/* Botón flotante del carrito */}
      <button
        onClick={abrir}
        aria-label="Abrir carrito"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:brightness-110 transition"
      >
        <ShoppingCart className="h-6 w-6" />
        {totalUnidades > 0 && (
          <span className="absolute -top-1 -right-1 min-w-6 h-6 px-1.5 rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center">
            {totalUnidades}
          </span>
        )}
      </button>

      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col p-0"
        >
          <SheetHeader className="p-4 border-b border-border text-left">
            <SheetTitle className="flex items-center gap-2 font-display">
              <ShoppingCart className="h-5 w-5 text-primary" /> Carrito de venta
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {lineas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <ShoppingCart className="h-12 w-12 opacity-30 mb-3" />
                <p className="text-sm">Tu carrito está vacío.</p>
                <p className="text-xs mt-1">
                  Agregá camisetas desde el detalle de cada modelo.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lineas.map(({ item, cantidad }) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="h-12 w-12 rounded bg-black/40 overflow-hidden shrink-0 flex items-center justify-center">
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
                        Talla {item.talla} · {item.codigoMaleta} ·{" "}
                        {money(item.precioVenta)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() =>
                          setCantidad(item.id, cantidad - 1, item.cantidadDisponible)
                        }
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-6 text-center text-sm">{cantidad}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={cantidad >= item.cantidadDisponible}
                        onClick={() =>
                          setCantidad(item.id, cantidad + 1, item.cantidadDisponible)
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => quitar(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border p-4 space-y-3">
            <div className="space-y-1">
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
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
