import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInventario,
  useSetExposicion,
  useResetExposicion,
} from "@workspace/api-client-react";
import type { InventarioItem } from "@workspace/api-client-react";
import { Store, Archive, Search, Shirt, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage, resolveImg } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";

type Filtro = "todas" | "exhibicion" | "maleta";

export default function Exhibicion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useListInventario();
  const setExpo = useSetExposicion();
  const reset = useResetExposicion();

  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [q, setQ] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const items = useMemo(
    () => (data ?? []).filter((i) => i.cantidadDisponible > 0),
    [data],
  );
  const enExhibicion = items.filter((i) => i.expuesto).length;
  const enMaleta = items.length - enExhibicion;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => {
      if (filtro === "exhibicion" && !i.expuesto) return false;
      if (filtro === "maleta" && i.expuesto) return false;
      if (
        term &&
        !`${i.nombreEquipo ?? ""} ${i.talla} ${i.codigoMaleta ?? ""}`
          .toLowerCase()
          .includes(term)
      )
        return false;
      return true;
    });
  }, [items, filtro, q]);

  const toggle = (item: InventarioItem, next: boolean) => {
    setPendingId(item.id);
    setExpo.mutate(
      { id: item.id, data: { expuesto: next } },
      {
        onSuccess: () => qc.invalidateQueries(),
        onError: (e) =>
          toast({
            title: "Error",
            description: apiErrorMessage(e, "No se pudo actualizar"),
            variant: "destructive",
          }),
        onSettled: () => setPendingId(null),
      },
    );
  };

  const doReset = () => {
    reset.mutate(undefined, {
      onSuccess: (r) => {
        qc.invalidateQueries();
        setConfirmReset(false);
        toast({
          title: "Todo guardado en maletas",
          description: `${r.actualizados} línea(s) volvieron a su maleta.`,
        });
      },
      onError: (e) =>
        toast({
          title: "Error",
          description: apiErrorMessage(e, "No se pudo cerrar el día"),
          variant: "destructive",
        }),
    });
  };

  const filtros: { key: Filtro; label: string }[] = [
    { key: "todas", label: "Todas" },
    { key: "exhibicion", label: "En exhibición" },
    { key: "maleta", label: "En maleta" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exhibición"
        icon={Store}
        subtitle="Dónde están las camisetas hoy"
      >
        <Button
          variant="secondary"
          className="gap-2"
          disabled={enExhibicion === 0 || reset.isPending}
          onClick={() => setConfirmReset(true)}
        >
          <Archive className="h-4 w-4" /> Guardar todo en maletas
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card border-card-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Shirt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-display text-2xl text-primary leading-none">
                {enExhibicion}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                En exhibición
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-white/5 p-2">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="font-display text-2xl leading-none">
                {enMaleta}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Guardadas en maleta
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
          {filtros.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filtro === f.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar equipo, talla o maleta..."
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground animate-pulse">Cargando...</p>
      ) : !filtered.length ? (
        <p className="text-muted-foreground">
          No hay camisetas que coincidan con el filtro.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((i) => {
            const img = resolveImg(i.urlImagen);
            return (
              <Card
                key={i.id}
                className={`bg-card border-card-border transition-colors ${
                  i.expuesto ? "border-primary/50" : ""
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {img ? (
                      <img
                        src={img}
                        alt=""
                        className="w-12 h-12 rounded object-cover bg-black shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-black/40 flex items-center justify-center shrink-0">
                        <Shirt className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {i.nombreEquipo}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{i.talla}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {i.cantidadDisponible} u.
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <div>
                      {i.expuesto ? (
                        <Badge className="bg-primary/15 text-primary hover:bg-primary/15 gap-1">
                          <Store className="h-3 w-3" /> En exhibición
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Briefcase className="h-3 w-3" />{" "}
                          {i.codigoMaleta ?? "Maleta"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Exhibida
                      </span>
                      <Switch
                        checked={i.expuesto}
                        disabled={pendingId === i.id}
                        onCheckedChange={(v) => toggle(i, v)}
                        aria-label={`Exhibir ${i.nombreEquipo} ${i.talla}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Guardar todo en maletas</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcarán las {enExhibicion} línea(s) en exhibición como
              guardadas en su maleta. Úsalo al cerrar la caja al final del día.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doReset} disabled={reset.isPending}>
              Guardar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
