import { Link, useParams } from "wouter";
import { useGetCamisetaDetalle } from "@workspace/api-client-react";
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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { money, resolveImg } from "@/lib/format";

const STOCK_BAJO = 3;

export default function CamisetaDetalle() {
  const params = useParams();
  const id = Number(params.id);
  const { data, isLoading } = useGetCamisetaDetalle(id);

  if (isLoading) {
    return (
      <p className="text-muted-foreground animate-pulse">Cargando detalle...</p>
    );
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Camiseta no encontrada.</p>
        <Link href="/camisetas">
          <Button variant="secondary" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        </Link>
      </div>
    );
  }

  const img = resolveImg(data.urlImagen);

  return (
    <div className="space-y-6">
      <Link href="/camisetas">
        <Button variant="ghost" className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Camisetas
        </Button>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-card-border overflow-hidden md:col-span-1">
          {img ? (
            <div className="aspect-square w-full bg-black">
              <img
                src={img}
                alt={data.nombreEquipo ?? ""}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-square w-full bg-muted/20 flex items-center justify-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground opacity-40" />
            </div>
          )}
        </Card>

        <div className="md:col-span-2 space-y-4">
          <div>
            <h1 className="text-3xl font-display text-foreground tracking-tight">
              {data.nombreEquipo}
            </h1>
            <p className="text-muted-foreground mt-1">{data.descripcion}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-card border-card-border">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">
                  Unidades totales
                </div>
                <div className="text-2xl font-bold">{data.totalUnidades}</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-card-border">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">
                  Utilidad proyectada
                </div>
                <div className="text-2xl font-bold text-primary">
                  {money(data.utilidadTotal)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-display text-foreground mb-3">
          Desglose por talla
        </h2>
        {!data.desglose.length ? (
          <p className="text-muted-foreground">Sin inventario registrado.</p>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Talla</TableHead>
                  <TableHead>Maleta</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Utilidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.desglose.map((d) => (
                  <TableRow key={d.inventarioId}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {d.talla}
                        {d.cantidadDisponible < STOCK_BAJO && (
                          <Badge className="bg-destructive/20 text-destructive text-xs">
                            Bajo
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{d.codigoMaleta}</TableCell>
                    <TableCell className="text-right">
                      {d.cantidadDisponible}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {money(d.costoUnidad)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(d.precioVenta)}
                    </TableCell>
                    <TableCell className="text-right text-primary font-medium">
                      {money(d.utilidadProyectada)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
