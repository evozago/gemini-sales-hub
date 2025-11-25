import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, BarChart4, PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import { BarChart, Bar, LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function Analytics() {
  // Fetch monthly analysis
  const { data: monthlyData } = useQuery({
    queryKey: ["monthly-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gemini_vw_analise_mensal")
        .select("*")
        .order("mes_ano", { ascending: true });
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
        .order("faturamento_bruto", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

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
              <a href="/analytics" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
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
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart4 className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">Advanced Analytics</h2>
          </div>
          <p className="text-muted-foreground">
            Deep dive into your sales data and performance metrics
          </p>
        </div>

        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="categories">Category Performance</TabsTrigger>
            <TabsTrigger value="trends">Trends Analysis</TabsTrigger>
            <TabsTrigger value="comparison">Comparative View</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue by Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Performance</CardTitle>
                  <CardDescription>Gross revenue by product category</CardDescription>
                </CardHeader>
                <CardContent className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="categoria_produto"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        angle={-45}
                        textAnchor="end"
                        height={100}
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
                      <Legend />
                      <Bar dataKey="faturamento_bruto" fill="hsl(var(--chart-1))" name="Gross Revenue" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Profit by Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Profit Analysis</CardTitle>
                  <CardDescription>Estimated profit margins by category</CardDescription>
                </CardHeader>
                <CardContent className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="categoria_produto"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        angle={-45}
                        textAnchor="end"
                        height={100}
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
                      <Legend />
                      <Bar dataKey="lucro_estimado" fill="hsl(var(--chart-2))" name="Estimated Profit" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Units Sold */}
              <Card>
                <CardHeader>
                  <CardTitle>Units Performance</CardTitle>
                  <CardDescription>Total pieces sold by category</CardDescription>
                </CardHeader>
                <CardContent className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="categoria_produto"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="pecas_vendidas" fill="hsl(var(--chart-3))" name="Units Sold" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Average Price */}
              <Card>
                <CardHeader>
                  <CardTitle>Price Analysis</CardTitle>
                  <CardDescription>Average price per piece by category</CardDescription>
                </CardHeader>
                <CardContent className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="categoria_produto"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `€${value.toFixed(0)}`}
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
                      <Legend />
                      <Bar dataKey="preco_medio_peca" fill="hsl(var(--chart-4))" name="Avg Price" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
                <CardDescription>Net revenue evolution over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ReLineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes_ano" stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="faturamento_liquido_real"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={3}
                      name="Net Revenue"
                      dot={{ fill: "hsl(var(--chart-1))", r: 4 }}
                    />
                  </ReLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transaction Volume</CardTitle>
                <CardDescription>Number of transactions per month</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes_ano" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="total_atendimentos"
                      fill="hsl(var(--chart-2))"
                      name="Transactions"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Profit</CardTitle>
                <CardDescription>Comparative analysis by category</CardDescription>
              </CardHeader>
              <CardContent className="h-[600px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="categoria_produto"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={100}
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
                    <Legend />
                    <Bar dataKey="faturamento_bruto" fill="hsl(var(--chart-1))" name="Revenue" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lucro_estimado" fill="hsl(var(--chart-2))" name="Profit" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
