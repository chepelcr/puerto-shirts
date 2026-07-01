import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Shirt, 
  Briefcase, 
  Users, 
  Truck, 
  History,
  BarChart3,
  Store,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CartDrawer } from "@/components/cart/CartDrawer";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/reportes", label: "Reportes", icon: BarChart3 },
    { href: "/camisetas", label: "Camisetas", icon: Shirt },
    { href: "/exhibicion", label: "Exhibición", icon: Store },
    { href: "/maletas", label: "Maletas", icon: Briefcase },
    { href: "/lotes", label: "Lotes", icon: Truck },
    { href: "/equipos", label: "Equipos", icon: Users },
    { href: "/proveedores", label: "Proveedores", icon: Users },
    { href: "/kardex", label: "Kardex", icon: History },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Shark Logo" className="w-8 h-8 object-contain" />
          <span className="font-display font-bold text-lg tracking-wide text-primary">CAMISAS DEL PUERTO</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-card border-r border-border p-0 w-64">
            <SheetHeader className="p-4 border-b border-border text-left">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Shark Logo" className="w-10 h-10 object-contain" />
                <SheetTitle className="font-display text-primary text-xl uppercase tracking-wider">Blue Book</SheetTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">La pasión del fútbol en cada lote.</p>
            </SheetHeader>
            <div className="flex flex-col py-4">
              {navItems.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${isActive ? "text-primary bg-primary/10 border-r-2 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-card border-r border-border sticky top-0 h-screen overflow-y-auto">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Shark Logo" className="w-12 h-12 object-contain" />
            <h1 className="font-display font-bold text-2xl tracking-wide text-primary leading-tight">CAMISAS<br/>DEL PUERTO</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-medium">La pasión del fútbol en cada lote.</p>
        </div>
        <div className="flex flex-col py-4 flex-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${isActive ? "text-primary bg-primary/10 border-r-2 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer"}`}>
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden p-4 md:p-8">
        <div className="max-w-6xl mx-auto pb-24">
          {children}
        </div>
      </main>

      <CartDrawer />
    </div>
  );
}
