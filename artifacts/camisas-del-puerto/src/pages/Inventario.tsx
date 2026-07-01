import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInventario,
  useListCamisetas,
  useListMaletas,
  useListLotes,
  useIngresarInventario,
  useRegistrarVenta,
  useTrasladarInventario,
} from "@workspace/api-client-react";
import { Talla } from "@workspace/api-client-react";
import type { InventarioItem } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, DollarSign, ArrowLeftRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage, money, resolveImg } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";

const TALLAS: Talla[] = ["S", "M", "L", "XL", "XXL", "XXXL"];
const STOCK_BAJO = 3;

export default function Inventario() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [fCamiseta, setFCamiseta] = useState("todas");
  const [fMaleta, setFMaleta] = useState("todas");

  const params: { camisetaId?: number; maletaId?: number } = {};
  if (fCamiseta !== "todas") params.camisetaId = Number(fCamiseta);
  if (fMaleta !== "todas") params.maletaId = Number(fMaleta);

  const { data: items, isLoading } = useListInventario(
    Object.keys(params).length ? params : undefined,
  );
  const { data: camisetas } = useListCamisetas();
  const { data: maletas } = useListMaletas();
  const { data: lotes } = useListLotes();

  const ingresar = useIngresarInventario();
  const vender = useRegistrarVenta();
  const trasladar = useTrasladarInventario();

  const invalidate = () => qc.invalidateQueries();

  // Ingreso form
  const [openIngreso, setOpenIngreso] = useState(false);
  const [ing, setIng] = useState({
    loteId: "",
    camisetaId: "",
    maletaId: "",
    talla: "M" as Talla,
    costoUnidad: "",
    precioVenta: "",
    cantidad: "",
  });

  const precioInvalido =
    ing.precioVenta !== "" &&
    ing.costoUnidad !== "" &&
    Number(ing.precioVenta) <= Number(ing.costoUnidad);

  const openIngresoDialog = () => {
    setIng({
      loteId: "",
      camisetaId: "",
      maletaId: "",
      talla: "M",
      costoUnidad: "",
      precioVenta: "",
      cantidad: "",
    });
    setOpenIngreso(true);
  };

  const submitIngreso = () => {
    if (
      !ing.loteId ||
      !ing.camisetaId ||
      !ing.maletaId ||
      !ing.costoUnidad ||
      !ing.precioVenta ||
      !ing.cantidad
    )
      return;
    if (precioInvalido) return;
    ingresar.mutate(
      {
        data: {
          loteId: Number(ing.loteId),
          camisetaId: Number(ing.camisetaId),
          maletaId: Number(ing.maletaId),
          talla: ing.talla,
          costoUnidad: Number(ing.costoUnidad),
          precioVenta: Number(ing.precioVenta),
          cantidad: Number(ing.cantidad),
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setOpenIngreso(false);
          toast({ title: "Inventario ingresado" });
        },
        onError: (e) =>
          toast({
            title: "Error",
            description: apiErrorMessage(e, "No se pudo ingresar"),
            variant: "destructive",
          }),
      },
    );
  };

  // Venta / Traslado state
  const [ventaItem, setVentaItem] = useState<InventarioItem | null>(null);
  const [ventaCant, setVentaCant] = useState("1");
  const [trasItem, setTrasItem] = useState<InventarioItem | null>(null);
  const [trasCant, setTrasCant] = useState("1");
  const [trasDestino, setTrasDestino] = useState("");

  const submitVenta = () => {
    if (!ventaItem) return;
    vender.mutate(
      { data: { inventarioId: ventaItem.id, cantidad: Number(ventaCant) } },
      {
        onSuccess: (r) => {
          invalidate();
          setVentaItem(null);
          toast({
            title: "Venta registrada",
            description: `Total: ${money(r.totalVenta)} · Restante: ${r.cantidadRestante}`,
          });
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

  const submitTraslado = () => {
    if (!trasItem || !trasDestino) return;
    trasladar.mutate(
      {
        data: {
          inventarioId: trasItem.id,
          maletaDestinoId: Number(trasDestino),
          cantidad: Number(trasCant),
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setTrasItem(null);
          toast({ title: "Traslado realizado" });
        },
        onError: (e) =>
          toast({
            title: "Error",
            description: apiErrorMessage(e, "No se pudo trasladar"),
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Inventario" icon={Package} subtitle="Existencias por talla y maleta">
        <Dialog open={openIngreso} onOpenChange={setOpenIngreso}>
          <DialogTrigger asChild>
            <Button onClick={openIngresoDialog} className="gap-2">
              <Plus className="h-4 w-4" /> Ingresar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ingresar inventario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Lote</Label>
                <Select
                  value={ing.loteId}
                  onValueChange={(v) => setIng((s) => ({ ...s, loteId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar lote" />
                  </SelectTrigger>
                  <SelectContent>
                    {lotes?.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>
                        #{l.id} · {l.nombreProveedor} · {money(l.costoTotal)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Camiseta</Label>
                <Select
                  value={ing.camisetaId}
                  onValueChange={(v) => setIng((s) => ({ ...s, camisetaId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar camiseta" />
                  </SelectTrigger>
                  <SelectContent>
                    {camisetas?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nombreEquipo} — {c.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Maleta</Label>
                  <Select
                    value={ing.maletaId}
                    onValueChange={(v) => setIng((s) => ({ ...s, maletaId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Maleta" />
                    </SelectTrigger>
                    <SelectContent>
                      {maletas?.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.codigoMaleta}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Talla</Label>
                  <Select
                    value={ing.talla}
                    onValueChange={(v) =>
                      setIng((s) => ({ ...s, talla: v as Talla }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TALLAS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Costo unidad</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ing.costoUnidad}
                    onChange={(e) =>
                      setIng((s) => ({ ...s, costoUnidad: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio venta</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ing.precioVenta}
                    onChange={(e) =>
                      setIng((s) => ({ ...s, precioVenta: e.target.value }))
                    }
                  />
                </div>
              </div>
              {precioInvalido && (
                <p className="text-sm text-destructive">
                  El precio de venta debe ser mayor al costo unitario.
                </p>
              )}
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="1"
                  value={ing.cantidad}
                  onChange={(e) =>
                    setIng((s) => ({ ...s, cantidad: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={submitIngreso}
                disabled={ingresar.isPending || precioInvalido}
              >
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex flex-wrap gap-3">
        <div className="w-56">
          <Select value={fCamiseta} onValueChange={setFCamiseta}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las camisetas</SelectItem>
              {camisetas?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nombreEquipo} — {c.descripcion}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={fMaleta} onValueChange={setFMaleta}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las maletas</SelectItem>
              {maletas?.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.codigoMaleta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground animate-pulse">Cargando...</p>
      ) : !items?.length ? (
        <p className="text-muted-foreground">No hay existencias registradas.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Camiseta</TableHead>
                <TableHead>Talla</TableHead>
                <TableHead>Maleta</TableHead>
                <TableHead className="text-right">Disp.</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Utilidad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      {resolveImg(it.urlImagen) && (
                        <img
                          src={resolveImg(it.urlImagen)!}
                          alt=""
                          className="w-8 h-8 rounded object-cover bg-black"
                        />
                      )}
                      <span className="font-medium">{it.nombreEquipo}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      {it.talla}
                      {it.cantidadDisponible < STOCK_BAJO && (
                        <Badge className="bg-destructive/20 text-destructive text-xs">
                          Bajo
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>{it.codigoMaleta}</TableCell>
                  <TableCell className="text-right">
                    {it.cantidadDisponible}
                  </TableCell>
                  <TableCell className="text-right">
                    {money(it.precioVenta)}
                  </TableCell>
                  <TableCell className="text-right text-primary">
                    {money(it.utilidadProyectada)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1"
                        disabled={it.cantidadDisponible < 1}
                        onClick={() => {
                          setVentaItem(it);
                          setVentaCant("1");
                        }}
                      >
                        <DollarSign className="h-3.5 w-3.5" /> Vender
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        disabled={it.cantidadDisponible < 1}
                        onClick={() => {
                          setTrasItem(it);
                          setTrasCant("1");
                          setTrasDestino("");
                        }}
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Venta dialog */}
      <Dialog open={!!ventaItem} onOpenChange={(o) => !o && setVentaItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar venta</DialogTitle>
          </DialogHeader>
          {ventaItem && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {ventaItem.nombreEquipo} · Talla {ventaItem.talla} ·{" "}
                {ventaItem.codigoMaleta} · Disp: {ventaItem.cantidadDisponible}
              </p>
              <div className="space-y-2">
                <Label>Cantidad a vender</Label>
                <Input
                  type="number"
                  min="1"
                  max={ventaItem.cantidadDisponible}
                  value={ventaCant}
                  onChange={(e) => setVentaCant(e.target.value)}
                />
              </div>
              <p className="text-sm">
                Total estimado:{" "}
                <span className="text-primary font-bold">
                  {money(ventaItem.precioVenta * Number(ventaCant || 0))}
                </span>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={submitVenta} disabled={vender.isPending}>
              Confirmar venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Traslado dialog */}
      <Dialog open={!!trasItem} onOpenChange={(o) => !o && setTrasItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trasladar inventario</DialogTitle>
          </DialogHeader>
          {trasItem && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {trasItem.nombreEquipo} · Talla {trasItem.talla} · Desde{" "}
                {trasItem.codigoMaleta} · Disp: {trasItem.cantidadDisponible}
              </p>
              <div className="space-y-2">
                <Label>Maleta destino</Label>
                <Select value={trasDestino} onValueChange={setTrasDestino}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {maletas
                      ?.filter((m) => m.id !== trasItem.maletaId)
                      .map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.codigoMaleta}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="1"
                  max={trasItem.cantidadDisponible}
                  value={trasCant}
                  onChange={(e) => setTrasCant(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={submitTraslado}
              disabled={trasladar.isPending || !trasDestino}
            >
              Confirmar traslado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
