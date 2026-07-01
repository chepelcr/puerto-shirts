import { Link } from "wouter";
import { useGetDashboardResumen } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shirt, Package, DollarSign, AlertTriangle } from "lucide-react";
import { money } from "@/lib/format";

export default function Dashboard() {
  const { data: resumen, isLoading } = useGetDashboardResumen();

  if (isLoading) {
    return <div className="text-muted-foreground p-8 animate-pulse text-center">Cargando dashboard...</div>;
  }

  if (!resumen) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display text-foreground tracking-tight">Resumen General</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-card-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Modelos</CardTitle>
            <Shirt className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen.totalModelos}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unidades</CardTitle>
            <Package className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen.totalUnidades}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilidad Proyectada</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{money(resumen.utilidadTotalProyectada)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Bajo</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${resumen.modelosStockBajo > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${resumen.modelosStockBajo > 0 ? "text-destructive" : ""}`}>{resumen.modelosStockBajo}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-display text-foreground mb-4">Stock por Camiseta</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumen.cards.map((card) => (
            <Link key={card.camisetaId} href={`/camisetas/${card.camisetaId}`}>
            <Card className={`bg-card border-card-border overflow-hidden cursor-pointer transition-shadow hover:ring-1 hover:ring-primary ${card.tieneStockBajo ? 'ring-1 ring-destructive' : ''}`}>
              {card.urlImagen ? (
                <div className="h-48 w-full bg-black relative">
                  <img 
                    src={card.urlImagen.startsWith('http') || card.urlImagen.startsWith('/') ? card.urlImagen : `/api/storage${card.urlImagen}`} 
                    alt={card.nombreEquipo || "Camiseta"} 
                    className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                  />
                </div>
              ) : (
                <div className="h-48 w-full bg-muted/20 flex items-center justify-center">
                  <Shirt className="h-12 w-12 text-muted-foreground opacity-50" />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg leading-tight line-clamp-2">{card.nombreEquipo || "Sin Equipo"}</h3>
                  {card.tieneStockBajo && (
                    <span className="bg-destructive/20 text-destructive text-xs px-2 py-1 rounded font-bold">¡STOCK BAJO!</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground line-clamp-1 mb-4">{card.descripcion}</div>
                <div className="flex justify-between items-center text-sm border-t border-border pt-3">
                  <span className="font-medium">{card.totalUnidades} und.</span>
                  <span className="text-primary font-bold">{money(card.utilidadProyectada)}</span>
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
