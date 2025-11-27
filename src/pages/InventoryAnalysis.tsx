import React, { useEffect, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getInventoryAnalytics } from '../services/dataService';
import { InventoryAnalytics } from '../types';
import { TrendingDown, TrendingUp, Package, AlertTriangle } from 'lucide-react';

const InventoryAnalysis = () => {
  const [data, setData] = useState<InventoryAnalytics[]>([]);
  const [filteredData, setFilteredData] = useState<InventoryAnalytics[]>([]);
  const [filterMarca, setFilterMarca] = useState("Todas");
  const [filterGenero, setFilterGenero] = useState("Todos");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = data;
    if (filterMarca !== "Todas") result = result.filter(i => i.marca === filterMarca);
    if (filterGenero !== "Todos") result = result.filter(i => i.genero === filterGenero);
    setFilteredData(result);
  }, [filterMarca, filterGenero, data]);

  const loadData = async () => {
    const result = await getInventoryAnalytics();
    setData(result);
    setFilteredData(result);
  };

  // KPIs Rápidos
  const valorEstoque = filteredData.reduce((acc, curr) => acc + curr.valor_estoque_venda, 0);
  const qtdEstoque = filteredData.reduce((acc, curr) => acc + curr.qtd_estoque_atual, 0);
  const vendas90d = filteredData.reduce((acc, curr) => acc + curr.vendas_qtd_90d, 0);

  const getSugestaoColor = (sugestao: string) => {
    if (sugestao === 'LIQUIDAR') return "destructive"; // Vermelho
    if (sugestao === 'COMPRAR') return "default"; // Verde/Preto (Padrão)
    return "secondary"; // Cinza
  };

  // Extrair Marcas Únicas para o Filtro
  const marcas = ["Todas", ...Array.from(new Set(data.map(i => i.marca).filter(Boolean))).sort()];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#f8f9fa]">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
              <SidebarTrigger /> Análise de Stock e Vendas
            </h1>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Valor em Stock (Venda)</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">R$ {valorEstoque.toLocaleString('pt-BR')}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Peças Paradas</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold flex items-center gap-2"><Package size={20}/> {qtdEstoque}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Vendas (últimos 90 dias)</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-emerald-600 flex items-center gap-2"><TrendingUp size={20}/> {vendas90d}</div></CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="flex gap-4 mb-6 bg-white p-4 rounded-lg border shadow-sm">
            <div className="w-48">
              <label className="text-xs font-bold text-slate-500 mb-1 block">Marca</label>
              <Select value={filterMarca} onValueChange={setFilterMarca}>
                <SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger>
                <SelectContent>
                  {marcas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <label className="text-xs font-bold text-slate-500 mb-1 block">Gênero</label>
              <Select value={filterGenero} onValueChange={setFilterGenero}>
                <SelectTrigger><SelectValue placeholder="Gênero" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="MENINA">Menina</SelectItem>
                  <SelectItem value="MENINO">Menino</SelectItem>
                  <SelectItem value="UNISSEX">Unissex</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela Principal */}
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Marca / Grupo</TableHead>
                  <TableHead>Stock Atual</TableHead>
                  <TableHead>Vendas (90d)</TableHead>
                  <TableHead>Novidades (90d)</TableHead>
                  <TableHead>Cobertura (Dias)</TableHead>
                  <TableHead className="text-center">Sugestão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="font-bold text-slate-800">{row.marca}</div>
                      <div className="text-xs text-slate-500">{row.genero} • {row.departamento}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.qtd_estoque_atual} peças</div>
                      <div className="text-xs text-slate-400">R$ {row.valor_estoque_venda.toLocaleString('pt-BR')}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-emerald-600">{row.vendas_qtd_90d} vendidas</div>
                      <div className="text-xs text-slate-400">R$ {row.vendas_valor_90d.toLocaleString('pt-BR')}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-slate-600">+{row.qtd_chegou_90d} chegaram</div>
                    </TableCell>
                    <TableCell>
                      <div className={`font-bold ${row.cobertura_dias > 365 ? 'text-red-500' : 'text-slate-700'}`}>
                        {row.cobertura_dias > 900 ? '∞' : row.cobertura_dias} dias
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getSugestaoColor(row.sugestao || 'MANTER')} className="font-bold">
                        {row.sugestao}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default InventoryAnalysis;
