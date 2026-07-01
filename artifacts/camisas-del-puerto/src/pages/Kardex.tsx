import { useState } from "react";
import {
  useListKardex,
  useListCamisetas,
} from "@workspace/api-client-react";
import { TipoMovimiento } from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, ArrowRight } from "lucide-react";
import { money, fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";

const tipoLabel: Record<string, string> = {
  entrada: "Entrada",
  venta: "Venta",
  traslado: "Traslado",
};

function tipoBadge(tipo: string) {
  if (tipo === "entrada")
    return <Badge className="bg-secondary text-secondary-foreground">Entrada</Badge>;
  if (tipo === "venta")
    return <Badge className="bg-primary text-primary-foreground">Venta</Badge>;
  return <Badge variant="outline">Traslado</Badge>;
}

export default function Kardex() {
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroCamiseta, setFiltroCamiseta] = useState<string>("todas");

  const params: { tipoMovimiento?: TipoMovimiento; camisetaId?: number } = {};
  if (filtroTipo !== "todos")
    params.tipoMovimiento = filtroTipo as TipoMovimiento;
  if (filtroCamiseta !== "todas") params.camisetaId = Number(filtroCamiseta);

  const { data: movimientos, isLoading } = useListKardex(
    Object.keys(params).length ? params : undefined,
  );
  const { data: camisetas } = useListCamisetas();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kardex"
        icon={History}
        subtitle="Historial de movimientos"
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="venta">Venta</SelectItem>
              <SelectItem value="traslado">Traslado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Select value={filtroCamiseta} onValueChange={setFiltroCamiseta}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las camisetas</SelectItem>
              {camisetas?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nombreEquipo} — {c.descripcion}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground animate-pulse">Cargando...</p>
      ) : !movimientos?.length ? (
        <p className="text-muted-foreground">No hay movimientos registrados.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Camiseta</TableHead>
                <TableHead>Talla</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="text-right">Precio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                    {fmtDate(m.fecha)}
                  </TableCell>
                  <TableCell>{tipoBadge(m.tipoMovimiento)}</TableCell>
                  <TableCell className="font-medium">{m.nombreEquipo}</TableCell>
                  <TableCell>{m.talla}</TableCell>
                  <TableCell className="text-right">{m.cantidad}</TableCell>
                  <TableCell className="text-sm">
                    {m.tipoMovimiento === "traslado" ? (
                      <span className="flex items-center gap-1">
                        {m.codigoMaleta}
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        {m.codigoMaletaDestino}
                      </span>
                    ) : (
                      m.codigoMaleta ?? "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {m.precioUnitario != null ? money(m.precioUnitario) : "-"}
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
