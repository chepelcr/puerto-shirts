import { useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCamisetas,
  useCreateCamiseta,
  useListEquipos,
  useRequestUploadUrl,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Shirt, Upload, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage, resolveImg } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";

export default function Camisetas() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: camisetas, isLoading } = useListCamisetas();
  const { data: equipos } = useListEquipos();
  const create = useCreateCamiseta();
  const requestUpload = useRequestUploadUrl();
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [equipoId, setEquipoId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [urlImagen, setUrlImagen] = useState("");
  const [uploading, setUploading] = useState(false);

  const openNew = () => {
    setEquipoId("");
    setDescripcion("");
    setUrlImagen("");
    setOpen(true);
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const res = await requestUpload.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type },
      });
      const putRes = await fetch(res.uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) throw new Error("Fallo la subida");
      setUrlImagen(`/api/storage${res.objectPath}`);
      toast({ title: "Imagen subida" });
    } catch (e) {
      toast({
        title: "Error",
        description: apiErrorMessage(e, "No se pudo subir la imagen"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    if (!equipoId) return;
    create.mutate(
      {
        data: {
          equipoId: Number(equipoId),
          descripcion: descripcion || undefined,
          urlImagen: urlImagen || undefined,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries();
          setOpen(false);
          toast({ title: "Camiseta creada" });
        },
        onError: (e) =>
          toast({
            title: "Error",
            description: apiErrorMessage(e, "No se pudo crear"),
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Camisetas" icon={Shirt} subtitle="Catálogo de modelos">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Nueva
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva camiseta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Equipo</Label>
                <Select value={equipoId} onValueChange={setEquipoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipos?.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.nombreEquipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Camiseta local temporada 2025/26"
                />
              </div>
              <div className="space-y-2">
                <Label>Imagen</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? "Subiendo..." : "Subir imagen"}
                  </Button>
                  {urlImagen && (
                    <img
                      src={resolveImg(urlImagen)!}
                      alt="preview"
                      className="w-12 h-12 rounded object-cover bg-black"
                    />
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={submit}
                disabled={create.isPending || uploading}
              >
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {isLoading ? (
        <p className="text-muted-foreground animate-pulse">Cargando...</p>
      ) : !camisetas?.length ? (
        <p className="text-muted-foreground">No hay camisetas registradas.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {camisetas.map((c) => {
            const img = resolveImg(c.urlImagen);
            return (
              <Link key={c.id} href={`/camisetas/${c.id}`}>
                <Card className="bg-card border-card-border overflow-hidden cursor-pointer hover:ring-1 hover:ring-primary transition-all">
                  {img ? (
                    <div className="aspect-square w-full bg-black">
                      <img
                        src={img}
                        alt={c.nombreEquipo ?? ""}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square w-full bg-muted/20 flex items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-muted-foreground opacity-40" />
                    </div>
                  )}
                  <CardContent className="p-3">
                    <div className="font-bold leading-tight line-clamp-1">
                      {c.nombreEquipo}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {c.descripcion}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
