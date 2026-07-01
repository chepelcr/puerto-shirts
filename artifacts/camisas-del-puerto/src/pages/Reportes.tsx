import { Link } from "wouter";
import { useGetReporteVentasDiarias } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, ChevronRight, ShoppingCart, TrendingUp } from "lucide-react";
import { money } from "@/lib/format";

function fmtDia(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("es-CR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Reportes() {
  const { data, isLoading } = useGetReporteVentasDiarias();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl md:text-3xl font-display text-foreground tracking-tight">
            Reportes de ventas
          </h1>
          <p className="text-sm text-muted-foreground">
            Un reporte por día. Tocá un día para ver las camisetas vendidas.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground animate-pulse">
          Cargando reportes...
        </p>
      ) : !data || data.length === 0 ? (
        <Card className="bg-card border-card-border">
          <CardContent className="p-8 text-center text-muted-foreground">
            <ShoppingCart className="h-10 w-10 opacity-30 mx-auto mb-2" />
            <p>Todavía no hay ventas registradas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((dia) => (
            <Link key={dia.fecha} href={`/reportes/${dia.fecha}`}>
              <Card className="bg-card border-card-border hover:ring-2 hover:ring-primary/50 transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium capitalize truncate">
                      {fmtDia(dia.fecha)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dia.numVentas} venta(s) · {dia.totalCamisetas} camiseta(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{money(dia.total)}</p>
                    <p className="text-xs text-primary flex items-center justify-end gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {money(dia.utilidad)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
