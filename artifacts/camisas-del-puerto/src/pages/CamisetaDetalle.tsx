import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCamisetaDetalle,
  useListMaletas,
  useListLotes,
  useIngresarInventario,
  useTrasladarInventario,
  Talla,
} from "@workspace/api-client-react";
import type { DesgloseTalla } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ArrowLeft, ImageIcon, Plus, ArrowLeftRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage, money, resolveImg } from "@/lib/format";

const TALLAS: Talla[] = ["S", "M", "L", "XL", "XXL", "XXXL"];
const STOCK_BAJO = 3;

export default function CamisetaDetalle() {
  const params = useParams();
  const id = Number(params.id);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useGetCamisetaDetalle(id);
  const { data: maletas } = useListMaletas();
  const { data: lotes } = useListLotes();

  const ingresar = useIngresarInventario();
  const trasladar = useTrasladarInventario();

  const invalidate = () => qc.invalidateQueries();

  // Ingreso form (camiseta fija por contexto)
  const [openIngreso, setOpenIngreso] = useState(false);
  const [ing, setIng] = useState({
    loteId: "",
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
          camisetaId: id,
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

  // Traslado state
  const [trasItem, setTrasItem] = useState<DesgloseTalla | null>(null);
  const [trasCant, setTrasCant] = useState("1");
  const [trasDestino, setTrasDestino] = useState("");

  const submitTraslado = () => {
    if (!trasItem || !trasDestino) return;
    trasladar.mutate(
      {
        data: {
          inventarioId: trasItem.inventarioId,
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

  if (isLoading) {
    return (
      <p className="text-muted-foreground animate-pulse">Cargando detalle...</p>
    );
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Camiseta no encontrada.</p>
        <Link href="/camisetas">
          <Button variant="secondary" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        </Link>
      </div>
    );
  }

  const img = resolveImg(data.urlImagen);

  return (
    <div className="space-y-6">
      <Link href="/camisetas">
        <Button variant="ghost" className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Camisetas
        </Button>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-card-border overflow-hidden md:col-span-1">
          {img ? (
            <div className="aspect-square w-full bg-black">
              <img
                src={img}
                alt={data.nombreEquipo ?? ""}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-square w-full bg-muted/20 flex items-center justify-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground opacity-40" />
            </div>
          )}
        </Card>

        <div className="md:col-span-2 space-y-4">
          <div>
            <h1 className="text-3xl font-display text-foreground tracking-tight">
              {data.nombreEquipo}
            </h1>
            <p className="text-muted-foreground mt-1">{data.descripcion}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-card border-card-border">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">
                  Unidades totales
                </div>
                <div className="text-2xl font-bold">{data.totalUnidades}</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-card-border">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">
                  Utilidad proyectada
                </div>
                <div className="text-2xl font-bold text-primary">
                  {money(data.utilidadTotal)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-display text-foreground">
            Desglose por talla
          </h2>
          <Dialog open={openIngreso} onOpenChange={setOpenIngreso}>
            <DialogTrigger asChild>
              <Button onClick={openIngresoDialog} className="gap-2">
                <Plus className="h-4 w-4" /> Ingresar stock
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ingresar stock · {data.nombreEquipo}</DialogTitle>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Maleta</Label>
                    <Select
                      value={ing.maletaId}
                      onValueChange={(v) =>
                        setIng((s) => ({ ...s, maletaId: v }))
                      }
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
        </div>

        {!data.desglose.length ? (
          <p className="text-muted-foreground">Sin inventario registrado.</p>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Talla</TableHead>
                  <TableHead>Maleta</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Utilidad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.desglose.map((d) => (
                  <TableRow key={d.inventarioId}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {d.talla}
                        {d.cantidadDisponible < STOCK_BAJO && (
                          <Badge className="bg-destructive/20 text-destructive text-xs">
                            Bajo
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{d.codigoMaleta}</TableCell>
                    <TableCell className="text-muted-foreground">
                      #{d.loteId}
                      {d.nombreProveedor ? ` · ${d.nombreProveedor}` : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      {d.cantidadDisponible}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {money(d.costoUnidad)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(d.precioVenta)}
                    </TableCell>
                    <TableCell className="text-right text-primary font-medium">
                      {money(d.utilidadProyectada)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          disabled={d.cantidadDisponible < 1}
                          onClick={() => {
                            setTrasItem(d);
                            setTrasCant("1");
                            setTrasDestino("");
                          }}
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5" /> Trasladar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Traslado dialog */}
      <Dialog open={!!trasItem} onOpenChange={(o) => !o && setTrasItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trasladar a otra maleta</DialogTitle>
          </DialogHeader>
          {trasItem && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {data.nombreEquipo} · Talla {trasItem.talla} · Origen:{" "}
                {trasItem.codigoMaleta} · Disp: {trasItem.cantidadDisponible}
              </p>
              <div className="space-y-2">
                <Label>Maleta destino</Label>
                <Select value={trasDestino} onValueChange={setTrasDestino}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar maleta" />
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
                <Label>Cantidad a trasladar</Label>
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
