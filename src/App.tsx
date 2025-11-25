import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Link, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Analytics from "./pages/Analytics";
import SalesSniper from "./pages/SalesSniper";
import Vendedoras from "./pages/Vendedoras";
import Clientes from "./pages/Clientes";
import NotFound from "./pages/NotFound";
import { NavLink } from "./components/NavLink";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  GeminiCRM
                </Link>
                <nav className="flex gap-6">
                  <NavLink to="/">Dashboard</NavLink>
                  <NavLink to="/analytics">Analytics</NavLink>
                  <NavLink to="/vendedoras">Ranking Clientes</NavLink>
                  <NavLink to="/clientes">Clientes</NavLink>
                  <NavLink to="/sniper">Sales Sniper</NavLink>
                </nav>
              </div>
            </div>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/vendedoras" element={<Vendedoras />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/sniper" element={<SalesSniper />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
