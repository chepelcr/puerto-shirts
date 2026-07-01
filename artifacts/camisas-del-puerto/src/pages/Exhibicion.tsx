import { useMemo, useState } from "react";
import { useListInventario } from "@workspace/api-client-react";
import { Store, Search, Shirt, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { resolveImg } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";

type Filtro = "todas" | "exhibicion" | "maleta";

export default function Exhibicion() {
  const { data, isLoading } = useListInventario();

  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [q, setQ] = useState("");

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
        subtitle="Vista de dónde están las camisetas hoy"
      />

      <p className="text-sm text-muted-foreground -mt-2">
        Solo lectura. La exhibición se maneja desde cada camiseta (Desglose por
        talla), y se guarda todo en maletas al cerrar la tienda desde el
        Resumen.
      </p>

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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
