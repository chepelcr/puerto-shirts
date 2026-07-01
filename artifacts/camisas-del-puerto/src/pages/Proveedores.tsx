import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProveedores,
  useCreateProveedor,
  useUpdateProveedor,
  useDeleteProveedor,
} from "@workspace/api-client-react";
import type { Proveedor } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";

export default function Proveedores() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: proveedores, isLoading } = useListProveedores();
  const create = useCreateProveedor();
  const update = useUpdateProveedor();
  const remove = useDeleteProveedor();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [nombre, setNombre] = useState("");

  const invalidate = () => qc.invalidateQueries();

  const openNew = () => {
    setEditing(null);
    setNombre("");
    setOpen(true);
  };

  const openEdit = (p: Proveedor) => {
    setEditing(p);
    setNombre(p.nombre);
    setOpen(true);
  };

  const submit = () => {
    if (!nombre.trim()) return;
    const onDone = {
      onSuccess: () => {
        invalidate();
        setOpen(false);
        toast({ title: editing ? "Proveedor actualizado" : "Proveedor creado" });
      },
      onError: (e: unknown) =>
        toast({
          title: "Error",
          description: apiErrorMessage(e, "No se pudo guardar"),
          variant: "destructive",
        }),
    };
    if (editing) {
      update.mutate({ id: editing.id, data: { nombre } }, onDone);
    } else {
      create.mutate({ data: { nombre } }, onDone);
    }
  };

  const del = (p: Proveedor) => {
    if (!confirm(`¿Eliminar proveedor "${p.nombre}"?`)) return;
    remove.mutate(
      { id: p.id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Proveedor eliminado" });
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
      <PageHeader title="Proveedores" icon={Truck}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Nuevo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar proveedor" : "Nuevo proveedor"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del proveedor"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={submit}
                disabled={create.isPending || update.isPending}
              >
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {isLoading ? (
        <p className="text-muted-foreground animate-pulse">Cargando...</p>
      ) : !proveedores?.length ? (
        <p className="text-muted-foreground">No hay proveedores registrados.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proveedores.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => del(p)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
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
  );
}
