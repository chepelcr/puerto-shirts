import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Camisetas from "@/pages/Camisetas";
import CamisetaDetalle from "@/pages/CamisetaDetalle";
import Maletas from "@/pages/Maletas";
import Lotes from "@/pages/Lotes";
import Equipos from "@/pages/Equipos";
import Proveedores from "@/pages/Proveedores";
import Kardex from "@/pages/Kardex";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/camisetas" component={Camisetas} />
        <Route path="/camisetas/:id" component={CamisetaDetalle} />
        <Route path="/maletas" component={Maletas} />
        <Route path="/lotes" component={Lotes} />
        <Route path="/equipos" component={Equipos} />
        <Route path="/proveedores" component={Proveedores} />
        <Route path="/kardex" component={Kardex} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("dark");
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
