import { Link, useParams } from "wouter";
import {
  useGetLoteDetalle,
  useGenerarReporteLote,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileDown, Boxes } from "lucide-react";
import { money, fmtDate, apiErrorMessage } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function LoteDetalle() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();
  const { data, isLoading } = useGetLoteDetalle(id);
  const generar = useGenerarReporteLote();

  const descargarPdf = () => {
    generar.mutate(
      { id },
      {
        onSuccess: (res) => {
          window.open(res.url, "_blank", "noopener,noreferrer");
          toast({ title: "Reporte generado" });
        },
        onError: (e) =>
          toast({
            title: "Error",
            description: apiErrorMessage(e, "No se pudo generar el reporte"),
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <Link href="/lotes">
        <Button variant="ghost" className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Lotes
        </Button>
      </Link>

      {isLoading ? (
        <p className="text-muted-foreground animate-pulse">Cargando...</p>
      ) : !data ? (
        <p className="text-muted-foreground">Lote no encontrado.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Boxes className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-2xl md:text-3xl font-display text-foreground tracking-tight">
                  Lote #{data.id}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {data.nombreProveedor} · {fmtDate(data.fechaIngreso)}{" "}
                  <Badge
                    variant={
                      data.tipoCompra === "contado" ? "secondary" : "outline"
                    }
                    className="ml-1 align-middle"
                  >
                    {data.tipoCompra === "contado" ? "Contado" : "Crédito"}
                  </Badge>
                </p>
              </div>
            </div>
            <Button
              onClick={descargarPdf}
              disabled={generar.isPending}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              {generar.isPending ? "Generando..." : "Descargar PDF"}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-card border-card-border">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Costo total</div>
                <div className="text-xl md:text-2xl font-bold">
                  {money(data.costoTotal)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-card-border">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">
                  Cantidad inicial
                </div>
                <div className="text-xl md:text-2xl font-bold">
                  {data.totalInicial}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-card-border">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Stock actual</div>
                <div className="text-xl md:text-2xl font-bold">
                  {data.totalDisponible}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-card-border">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">
                  Vendidas / movidas
                </div>
                <div className="text-xl md:text-2xl font-bold text-primary">
                  {data.totalVendido}
                </div>
              </CardContent>
            </Card>
          </div>

          {data.items.length === 0 ? (
            <p className="text-muted-foreground">
              Este lote todavía no tiene camisetas ingresadas.
            </p>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Talla</TableHead>
                    <TableHead className="text-right">Inicial</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Costo unit.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((it) => (
                    <TableRow key={`${it.camisetaId}-${it.talla}`}>
                      <TableCell className="font-medium">
                        {it.nombreEquipo}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {it.descripcion ?? "-"}
                      </TableCell>
                      <TableCell>{it.talla}</TableCell>
                      <TableCell className="text-right">
                        {it.cantidadInicial}
                      </TableCell>
                      <TableCell className="text-right">
                        {it.cantidadDisponible}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {money(it.costoUnidad)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
