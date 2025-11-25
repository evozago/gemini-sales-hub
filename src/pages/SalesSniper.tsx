import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Search, Phone, MessageCircle, Filter } from "lucide-react";
import { toast } from "sonner";

export default function SalesSniper() {
  const [filters, setFilters] = useState({
    marca: "",
    tamanho: "",
    genero: "",
    categoria: "",
  });

  // Fetch distinct filter options
  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gemini_produtos")
        .select("marca")
        .not("marca", "is", null)
        .order("marca");
      if (error) throw error;
      return Array.from(new Set(data?.map((p) => p.marca).filter(Boolean)));
    },
  });

  const { data: sizes } = useQuery({
    queryKey: ["sizes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gemini_produtos")
        .select("tamanho")
        .not("tamanho", "is", null)
        .order("tamanho");
      if (error) throw error;
      return Array.from(new Set(data?.map((p) => p.tamanho).filter(Boolean)));
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gemini_produtos")
        .select("categoria_produto")
        .not("categoria_produto", "is", null)
        .order("categoria_produto");
      if (error) throw error;
      return Array.from(new Set(data?.map((p) => p.categoria_produto).filter(Boolean)));
    },
  });

  // Search for matching customers
  const { data: targets, isLoading, refetch } = useQuery({
    queryKey: ["sniper-targets", filters],
    queryFn: async () => {
      // First, get matching sales items
      let itemsQuery = supabase
        .from("gemini_vendas_itens")
        .select("nome, sku, tamanho, cor, referencia, data")
        .order("data", { ascending: false });

      if (filters.marca) {
        const { data: products } = await supabase
          .from("gemini_produtos")
          .select("sku")
          .ilike("marca", `%${filters.marca}%`);
        
        if (products && products.length > 0) {
          const skus = products.map((p) => p.sku);
          itemsQuery = itemsQuery.in("sku", skus);
        }
      }

      if (filters.tamanho) {
        itemsQuery = itemsQuery.ilike("tamanho", `%${filters.tamanho}%`);
      }

      if (filters.categoria) {
        const { data: products } = await supabase
          .from("gemini_produtos")
          .select("sku")
          .ilike("categoria_produto", `%${filters.categoria}%`);
        
        if (products && products.length > 0) {
          const skus = products.map((p) => p.sku);
          itemsQuery = itemsQuery.in("sku", skus);
        }
      }

      if (filters.genero) {
        const { data: products } = await supabase
          .from("gemini_produtos")
          .select("sku")
          .ilike("genero", `%${filters.genero}%`);
        
        if (products && products.length > 0) {
          const skus = products.map((p) => p.sku);
          itemsQuery = itemsQuery.in("sku", skus);
        }
      }

      const { data: items, error: itemsError } = await itemsQuery.limit(100);
      if (itemsError) throw itemsError;

      if (!items || items.length === 0) return [];

      // Get unique customer names
      const customerNames = Array.from(new Set(items.map((item) => item.nome).filter(Boolean)));

      // Fetch customer contact info
      const { data: customers, error: customersError } = await supabase
        .from("gemini_clientes")
        .select("nome, telefone, cpf")
        .in("nome", customerNames)
        .not("telefone", "is", null);

      if (customersError) throw customersError;

      // Match customers with their purchases
      const customerMap = new Map();
      customers?.forEach((customer) => {
        const customerItems = items.filter((item) => item.nome === customer.nome);
        if (customerItems.length > 0) {
          customerMap.set(customer.telefone, {
            nome: customer.nome,
            telefone: customer.telefone,
            lastPurchase: customerItems[0].data,
            items: customerItems,
          });
        }
      });

      return Array.from(customerMap.values());
    },
    enabled: false,
  });

  const handleSearch = () => {
    if (!filters.marca && !filters.tamanho && !filters.genero && !filters.categoria) {
      toast.error("Please select at least one filter");
      return;
    }
    refetch();
  };

  const handleWhatsApp = (telefone: string, nome: string) => {
    const cleanPhone = telefone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá ${nome}! Temos novidades que podem interessar você baseadas no seu histórico de compras. 😊`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">GeminiCRM</h1>
              <p className="text-sm text-muted-foreground mt-1">Sales Intelligence Platform</p>
            </div>
            <nav className="flex gap-6">
              <a href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Dashboard
              </a>
              <a href="/analytics" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Analytics
              </a>
              <a href="/sniper" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Sales Sniper
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">Sales Sniper</h2>
          </div>
          <p className="text-muted-foreground">
            Find the perfect customers for your products based on their purchase history
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Target Filters
            </CardTitle>
            <CardDescription>Select product characteristics to find matching customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Brand</label>
                <Select value={filters.marca || "all"} onValueChange={(value) => setFilters({ ...filters, marca: value === "all" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands?.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Size</label>
                <Select value={filters.tamanho || "all"} onValueChange={(value) => setFilters({ ...filters, tamanho: value === "all" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sizes</SelectItem>
                    {sizes?.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Gender</label>
                <Select value={filters.genero || "all"} onValueChange={(value) => setFilters({ ...filters, genero: value === "all" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Unissex">Unissex</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Category</label>
                <Select
                  value={filters.categoria || "all"}
                  onValueChange={(value) => setFilters({ ...filters, categoria: value === "all" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSearch} className="w-full md:w-auto" disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? "Searching..." : "Find Targets"}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {targets && targets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Found {targets.length} Potential Customers</CardTitle>
              <CardDescription>Customers who match your search criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {targets.map((customer, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">{customer.nome}</h3>
                        <Badge variant="secondary">
                          {customer.items.length} {customer.items.length === 1 ? "match" : "matches"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {customer.telefone}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last purchase: {new Date(customer.lastPurchase).toLocaleDateString("pt-PT")}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleWhatsApp(customer.telefone, customer.nome)}
                      variant="default"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {targets && targets.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No customers found</h3>
              <p className="text-muted-foreground">Try adjusting your filters to find more matches</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
