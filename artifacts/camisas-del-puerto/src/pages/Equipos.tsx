import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEquipos,
  useCreateEquipo,
  useUpdateEquipo,
  useDeleteEquipo,
} from "@workspace/api-client-react";
import type { Equipo } from "@workspace/api-client-react";
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
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";

export default function Equipos() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: equipos, isLoading } = useListEquipos();
  const create = useCreateEquipo();
  const update = useUpdateEquipo();
  const remove = useDeleteEquipo();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Equipo | null>(null);
  const [nombre, setNombre] = useState("");

  const invalidate = () => qc.invalidateQueries();

  const openNew = () => {
    setEditing(null);
    setNombre("");
    setOpen(true);
  };
  const openEdit = (e: Equipo) => {
    setEditing(e);
    setNombre(e.nombreEquipo);
    setOpen(true);
  };

  const submit = () => {
    if (!nombre.trim()) return;
    const onDone = {
      onSuccess: () => {
        invalidate();
        setOpen(false);
        toast({ title: editing ? "Equipo actualizado" : "Equipo creado" });
      },
      onError: (e: unknown) =>
        toast({
          title: "Error",
          description: apiErrorMessage(e, "No se pudo guardar"),
          variant: "destructive",
        }),
    };
    if (editing) {
      update.mutate({ id: editing.id, data: { nombreEquipo: nombre } }, onDone);
    } else {
      create.mutate({ data: { nombreEquipo: nombre } }, onDone);
    }
  };

  const del = (e: Equipo) => {
    if (!confirm(`¿Eliminar equipo "${e.nombreEquipo}"?`)) return;
    remove.mutate(
      { id: e.id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Equipo eliminado" });
        },
        onError: (err) =>
          toast({
            title: "Error",
            description: apiErrorMessage(err, "No se pudo eliminar"),
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Equipos" icon={Users}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Nuevo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar equipo" : "Nuevo equipo"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="nombreEquipo">Nombre del equipo</Label>
                <Input
                  id="nombreEquipo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: FC Barcelona"
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
      ) : !equipos?.length ? (
        <p className="text-muted-foreground">No hay equipos registrados.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipo</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.nombreEquipo}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => del(e)}
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
