import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MessageCircle, TrendingUp, Users, ShoppingBag, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ClienteRanking {
  cliente: string;
  telefone: string;
  vendedor_dono: string;
  total_compras: number;
  total_gasto: number;
  ultima_compra: string;
  perfil_produtos?: string;
}

interface KPIs {
  totalVendas: number;
  totalClientes: number;
  ticketMedio: number;
  totalAtendimentos: number;
}

export default function Vendedoras() {
  const [clientes, setClientes] = useState<ClienteRanking[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<ClienteRanking[]>([]);
  const [kpis, setKpis] = useState<KPIs>({ totalVendas: 0, totalClientes: 0, ticketMedio: 0, totalAtendimentos: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankingData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setClientesFiltrados(clientes);
    } else {
      const filtered = clientes.filter(
        (c) =>
          c.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.vendedor_dono.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setClientesFiltrados(filtered);
    }
  }, [searchTerm, clientes]);

  const fetchRankingData = async () => {
    setLoading(true);
    try {
      // Buscar ranking da view otimizada
      const { data: rankingData, error: rankingError } = await supabase
        .from('gemini_vw_ranking_clientes')
        .select('*')
        .not('cliente_nome', 'in', '("Cliente Import","Consumidor final")')
        .order('total_gasto_real', { ascending: false })
        .limit(100);

      if (rankingError) throw rankingError;

      // Buscar vendedores por cliente para determinar vendedor dono e última venda
      const { data: vendasData, error: vendasError } = await supabase
        .from('gemini_vendas_geral')
        .select('nome, vendedor, total_venda, data')
        .not('nome', 'in', '("Cliente Import","Consumidor final")')
        .not('nome', 'is', null)
        .order('data', { ascending: false });

      if (vendasError) throw vendasError;

      // Mapear última vendedora por cliente (quem atendeu por último)
      const ultimaVendedoraPorCliente = new Map<string, string>();

      (vendasData || []).forEach((venda: any) => {
        const clienteKey = venda.nome;
        // Como vendasData está ordenado por data desc, a primeira ocorrência é a mais recente
        if (!ultimaVendedoraPorCliente.has(clienteKey)) {
          ultimaVendedoraPorCliente.set(clienteKey, venda.vendedor || 'Sem vendedor');
        }
      });

      // Combinar dados do ranking com última vendedora
      const clientesArray: ClienteRanking[] = (rankingData || []).map((cliente: any) => {
        const vendedorDono = ultimaVendedoraPorCliente.get(cliente.cliente_nome) || 'Sem vendedor';
        
        return {
          cliente: cliente.cliente_nome,
          telefone: cliente.telefone || '',
          vendedor_dono: vendedorDono,
          total_compras: cliente.frequencia_compras || 0,
          total_gasto: cliente.total_gasto_real || 0,
          ultima_compra: cliente.ultima_compra || ''
        };
      });

      setClientes(clientesArray);
      setClientesFiltrados(clientesArray);

      // Calcular KPIs
      const totalVendas = clientesArray.reduce((sum, c) => sum + c.total_gasto, 0);
      const totalClientes = clientesArray.length;
      const totalAtendimentos = clientesArray.reduce((sum, c) => sum + c.total_compras, 0);
      const ticketMedio = totalClientes > 0 ? totalVendas / totalClientes : 0;

      setKpis({ totalVendas, totalClientes, ticketMedio, totalAtendimentos });
    } catch (error) {
      console.error("Erro ao buscar dados do ranking:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankingBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">🥇 #1</Badge>;
    if (index === 1) return <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 text-white">🥈 #2</Badge>;
    if (index === 2) return <Badge className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">🥉 #3</Badge>;
    return <Badge variant="outline">#{index + 1}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${name}! Como vai?`);
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Ranking de Clientes VIP
          </h1>
          <p className="text-muted-foreground mt-2">
            Clientes organizados por valor total investido (LTV)
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalVendas)}</div>
            <p className="text-xs text-muted-foreground">Da carteira total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes VIP</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalClientes}</div>
            <p className="text-xs text-muted-foreground">Na base</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.ticketMedio)}</div>
            <p className="text-xs text-muted-foreground">Por cliente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Atendimentos</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalAtendimentos}</div>
            <p className="text-xs text-muted-foreground">Total realizados</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar por cliente ou vendedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking Completo</CardTitle>
          <CardDescription>
            Lista completa de clientes ordenados por valor investido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Ranking</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor Responsável</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-center">Compras</TableHead>
                  <TableHead className="text-center">Última Compra</TableHead>
                  <TableHead className="text-center">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  clientesFiltrados.map((cliente, index) => (
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell>{getRankingBadge(index)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{cliente.cliente}</div>
                          {cliente.telefone && (
                            <div className="text-xs text-muted-foreground">{cliente.telefone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{cliente.vendedor_dono}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(cliente.total_gasto)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{cliente.total_compras}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {formatDate(cliente.ultima_compra)}
                      </TableCell>
                      <TableCell className="text-center">
                        {cliente.telefone && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => openWhatsApp(cliente.telefone, cliente.cliente)}
                            className="gap-2"
                          >
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
