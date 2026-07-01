import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMaletas,
  useCreateMaleta,
  useUpdateMaleta,
  useDeleteMaleta,
  useGetMaletaContenido,
} from "@workspace/api-client-react";
import type { Maleta } from "@workspace/api-client-react";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Briefcase, PackageOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage, money, resolveImg } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";

function ContenidoDialog({
  maleta,
  onClose,
}: {
  maleta: Maleta;
  onClose: () => void;
}) {
  const { data, isLoading } = useGetMaletaContenido(maleta.id);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Contenido — {maleta.codigoMaleta}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-muted-foreground animate-pulse py-6">Cargando...</p>
        ) : !data?.length ? (
          <p className="text-muted-foreground py-6">Esta maleta está vacía.</p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Camiseta</TableHead>
                  <TableHead>Talla</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.inventarioId}>
                    <TableCell className="flex items-center gap-2">
                      {resolveImg(c.urlImagen) && (
                        <img
                          src={resolveImg(c.urlImagen)!}
                          alt=""
                          className="w-8 h-8 rounded object-cover bg-black"
                        />
                      )}
                      <span className="font-medium">{c.nombreEquipo}</span>
                    </TableCell>
                    <TableCell>{c.talla}</TableCell>
                    <TableCell className="text-right">
                      {c.cantidadDisponible}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(c.precioVenta)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Maletas() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: maletas, isLoading } = useListMaletas();
  const create = useCreateMaleta();
  const update = useUpdateMaleta();
  const remove = useDeleteMaleta();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Maleta | null>(null);
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [verContenido, setVerContenido] = useState<Maleta | null>(null);

  const invalidate = () => qc.invalidateQueries();

  const openNew = () => {
    setEditing(null);
    setCodigo("");
    setDescripcion("");
    setOpen(true);
  };
  const openEdit = (m: Maleta) => {
    setEditing(m);
    setCodigo(m.codigoMaleta);
    setDescripcion(m.descripcion ?? "");
    setOpen(true);
  };

  const submit = () => {
    if (!codigo.trim()) return;
    const data = { codigoMaleta: codigo, descripcion: descripcion || undefined };
    const onDone = {
      onSuccess: () => {
        invalidate();
        setOpen(false);
        toast({ title: editing ? "Maleta actualizada" : "Maleta creada" });
      },
      onError: (e: unknown) =>
        toast({
          title: "Error",
          description: apiErrorMessage(e, "No se pudo guardar"),
          variant: "destructive",
        }),
    };
    if (editing) update.mutate({ id: editing.id, data }, onDone);
    else create.mutate({ data }, onDone);
  };

  const del = (m: Maleta) => {
    if (!confirm(`¿Eliminar maleta "${m.codigoMaleta}"?`)) return;
    remove.mutate(
      { id: m.id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Maleta eliminada" });
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
      <PageHeader title="Maletas" icon={Briefcase} subtitle="Ubicaciones de inventario">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Nueva
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar maleta" : "Nueva maleta"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ej: MAL-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Descripción</Label>
                <Input
                  id="desc"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Bodega principal"
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
      ) : !maletas?.length ? (
        <p className="text-muted-foreground">No hay maletas registradas.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {maletas.map((m) => (
            <Card key={m.id} className="bg-card border-card-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-lg text-primary tracking-wide">
                      {m.codigoMaleta}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {m.descripcion || "Sin descripción"}
                    </div>
                  </div>
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1 flex-1"
                    onClick={() => setVerContenido(m)}
                  >
                    <PackageOpen className="h-4 w-4" /> Contenido
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(m)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => del(m)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {verContenido && (
        <ContenidoDialog
          maleta={verContenido}
          onClose={() => setVerContenido(null)}
        />
      )}
    </div>
  );
}
