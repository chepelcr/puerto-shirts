import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListLotes,
  useCreateLote,
  useDeleteLote,
  useListProveedores,
} from "@workspace/api-client-react";
import { TipoCompra } from "@workspace/api-client-react";
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
import { Plus, Trash2, Boxes } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage, money, fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";

export default function Lotes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const { data: lotes, isLoading } = useListLotes(
    filtroTipo === "todos"
      ? undefined
      : { tipoCompra: filtroTipo as TipoCompra },
  );
  const { data: proveedores } = useListProveedores();
  const create = useCreateLote();
  const remove = useDeleteLote();

  const [open, setOpen] = useState(false);
  const [proveedorId, setProveedorId] = useState<string>("");
  const [fechaIngreso, setFechaIngreso] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [tipoCompra, setTipoCompra] = useState<TipoCompra>("contado");
  const [costoTotal, setCostoTotal] = useState("");

  const invalidate = () => qc.invalidateQueries();

  const openNew = () => {
    setProveedorId("");
    setFechaIngreso(new Date().toISOString().slice(0, 10));
    setTipoCompra("contado");
    setCostoTotal("");
    setOpen(true);
  };

  const submit = () => {
    if (!proveedorId || !costoTotal) return;
    create.mutate(
      {
        data: {
          proveedorId: Number(proveedorId),
          fechaIngreso,
          tipoCompra,
          costoTotal: Number(costoTotal),
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setOpen(false);
          toast({ title: "Lote registrado" });
        },
        onError: (e) =>
          toast({
            title: "Error",
            description: apiErrorMessage(e, "No se pudo registrar"),
            variant: "destructive",
          }),
      },
    );
  };

  const del = (id: number) => {
    if (!confirm("¿Eliminar este lote?")) return;
    remove.mutate(
      { id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Lote eliminado" });
        },
        onError: (e) =>
          toast({
            title: "Error",
            description: apiErrorMessage(e, "No se pudo eliminar"),
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Lotes" icon={Boxes} subtitle="Compras a proveedores">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Nuevo lote
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo lote</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select value={proveedorId} onValueChange={setProveedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores?.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha de ingreso</Label>
                <Input
                  type="date"
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de compra</Label>
                <Select
                  value={tipoCompra}
                  onValueChange={(v) => setTipoCompra(v as TipoCompra)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contado">Contado</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Costo total</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costoTotal}
                  onChange={(e) => setCostoTotal(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={create.isPending}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="w-48">
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="contado">Contado</SelectItem>
            <SelectItem value="credito">Crédito</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground animate-pulse">Cargando...</p>
      ) : !lotes?.length ? (
        <p className="text-muted-foreground">No hay lotes registrados.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Costo total</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">
                    {l.nombreProveedor}
                  </TableCell>
                  <TableCell>{fmtDate(l.fechaIngreso)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        l.tipoCompra === "contado" ? "secondary" : "outline"
                      }
                    >
                      {l.tipoCompra === "contado" ? "Contado" : "Crédito"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {money(l.costoTotal)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => del(l.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
