import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Users, DollarSign, Target } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Index() {
  // Fetch monthly analysis
  const { data: monthlyData } = useQuery({
    queryKey: ["monthly-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gemini_vw_analise_mensal")
        .select("*")
        .order("mes_ano", { ascending: true })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch category analytics
  const { data: categoryData } = useQuery({
    queryKey: ["category-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gemini_vw_analytics_categorias")
        .select("*")
        .order("faturamento_bruto", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch customer ranking
  const { data: customerRanking } = useQuery({
    queryKey: ["customer-ranking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gemini_vw_ranking_clientes")
        .select("*")
        .order("total_gasto_real", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate KPIs
  const totalRevenue = monthlyData?.reduce((sum, item) => sum + (item.faturamento_liquido_real || 0), 0) || 0;
  const totalProfit = categoryData?.reduce((sum, item) => sum + (item.lucro_estimado || 0), 0) || 0;
  const totalCustomers = customerRanking?.length || 0;
  const avgTicket = totalRevenue / (monthlyData?.reduce((sum, item) => sum + (item.total_atendimentos || 0), 0) || 1);

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
              <a href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Dashboard
              </a>
              <a href="/analytics" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Analytics
              </a>
              <a href="/sniper" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Sales Sniper
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-chart-1" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                €{totalRevenue.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Last 12 months</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                €{totalProfit.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Gross margin</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Ticket</CardTitle>
              <BarChart3 className="h-4 w-4 text-chart-3" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                €{avgTicket.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Customers</CardTitle>
              <Users className="h-4 w-4 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{totalCustomers}</div>
              <p className="text-xs text-muted-foreground mt-1">High-value clients</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="customers">Top Customers</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly net revenue over the last year</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="mes_ano"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value: number) =>
                        `€${value.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="faturamento_liquido_real"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Category</CardTitle>
                  <CardDescription>Top 10 performing categories</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        type="category"
                        dataKey="categoria_produto"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        formatter={(value: number) =>
                          `€${value.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`
                        }
                      />
                      <Bar dataKey="faturamento_bruto" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Profit Distribution</CardTitle>
                  <CardDescription>Estimated profit by category</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData?.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ categoria_produto, percent }) =>
                          `${categoria_produto} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={120}
                        fill="hsl(var(--chart-1))"
                        dataKey="lucro_estimado"
                      >
                        {categoryData?.slice(0, 5).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        formatter={(value: number) =>
                          `€${value.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>Highest spending customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customerRanking?.map((customer, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{customer.cliente_nome}</p>
                          <p className="text-sm text-muted-foreground">{customer.cidade}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">
                          €{(customer.total_gasto_real || 0).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-muted-foreground">{customer.frequencia_compras} purchases</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sales Sniper CTA */}
        <Card className="mt-8 bg-gradient-to-r from-primary/10 to-chart-2/10 border-primary/20">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Sales Sniper</h3>
                <p className="text-muted-foreground">
                  Target customers based on their purchase history and preferences
                </p>
              </div>
              <a
                href="/sniper"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <Target className="h-5 w-5" />
                Launch Sniper
              </a>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
