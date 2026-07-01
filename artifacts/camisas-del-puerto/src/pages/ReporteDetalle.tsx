import { Link, useParams } from "wouter";
import { useGetReporteVentasDiariasDetalle } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Clock } from "lucide-react";
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

function fmtHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Costa_Rica",
  });
}

export default function ReporteDetalle() {
  const params = useParams();
  const fecha = String(params.fecha);
  const { data, isLoading } = useGetReporteVentasDiariasDetalle(fecha);

  return (
    <div className="space-y-6">
      <Link href="/reportes">
        <Button variant="ghost" className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Reportes
        </Button>
      </Link>

      {isLoading ? (
        <p className="text-muted-foreground animate-pulse">Cargando...</p>
      ) : !data ? (
        <p className="text-muted-foreground">Reporte no encontrado.</p>
      ) : (
        <>
          <div>
            <h1 className="text-2xl md:text-3xl font-display text-foreground tracking-tight capitalize">
              {fmtDia(data.fecha)}
            </h1>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-card border-card-border">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Camisetas</div>
                <div className="text-xl md:text-2xl font-bold">
                  {data.totalCamisetas}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-card-border">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Ingresos</div>
                <div className="text-xl md:text-2xl font-bold">
                  {money(data.total)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-card-border">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Utilidad</div>
                <div className="text-xl md:text-2xl font-bold text-primary">
                  {money(data.utilidad)}
                </div>
              </CardContent>
            </Card>
          </div>

          {data.ventas.length === 0 ? (
            <p className="text-muted-foreground">Sin ventas este día.</p>
          ) : (
            <div className="space-y-4">
              {data.ventas.map((venta) => (
                <Card key={venta.id} className="bg-card border-card-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Venta #{venta.id} · {fmtHora(venta.fecha)}
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{money(venta.total)}</span>
                        <span className="text-xs text-primary ml-2">
                          util. {money(venta.utilidad)}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Equipo</TableHead>
                            <TableHead>Talla</TableHead>
                            <TableHead>Maleta</TableHead>
                            <TableHead className="text-right">Cant.</TableHead>
                            <TableHead className="text-right">Precio</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {venta.items.map((it) => (
                            <TableRow key={it.id}>
                              <TableCell className="font-medium">
                                {it.nombreEquipo}
                              </TableCell>
                              <TableCell>{it.talla}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {it.codigoMaleta ?? "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                {it.cantidad}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {money(it.precioUnitario)}
                              </TableCell>
                              <TableCell className="text-right">
                                {money(it.subtotal)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
