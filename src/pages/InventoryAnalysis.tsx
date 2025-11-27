import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getInventoryAnalytics } from '../services/dataService';
import { InventoryAnalytics } from '../types';
import { TrendingUp, Package } from 'lucide-react';

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
    if (sugestao === 'COMPRAR') return "default"; // Verde/Preto
    return "secondary"; // Cinza
  };

  // Extrair Marcas Únicas para o Filtro
  const marcas = ["Todas", ...Array.from(new Set(data.map(i => i.marca).filter(Boolean))).sort()];

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">
          Análise de Estoque e Vendas
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/50 backdrop-blur-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Valor em Estoque (Venda)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-slate-800">R$ {valorEstoque.toLocaleString('pt-BR')}</div></CardContent>
        </Card>
        <Card className="bg-white/50 backdrop-blur-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Peças Paradas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Package className="text-blue-500" size={20}/> {qtdEstoque}</div></CardContent>
        </Card>
        <Card className="bg-white/50 backdrop-blur-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Vendas (90 dias)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600 flex items-center gap-2"><TrendingUp size={20}/> {vendas90d}</div></CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="w-full sm:w-48">
          <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Marca</label>
          <Select value={filterMarca} onValueChange={setFilterMarca}>
            <SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger>
            <SelectContent>
              {marcas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Gênero</label>
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
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-bold text-slate-600">Marca / Grupo</TableHead>
              <TableHead className="font-bold text-slate-600">Estoque Atual</TableHead>
              <TableHead className="font-bold text-slate-600">Vendas (90d)</TableHead>
              <TableHead className="font-bold text-slate-600">Novidades</TableHead>
              <TableHead className="font-bold text-slate-600">Cobertura</TableHead>
              <TableHead className="text-center font-bold text-slate-600">Sugestão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((row, idx) => (
                <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="font-bold text-slate-800">{row.marca}</div>
                    <div className="text-xs text-slate-500 flex gap-2">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">{row.genero}</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">{row.departamento}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-800">{row.qtd_estoque_atual} peças</div>
                    <div className="text-xs text-slate-400">R$ {row.valor_estoque_venda.toLocaleString('pt-BR')}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-emerald-600">
                      {row.vendas_qtd_90d > 0 ? `+${row.vendas_qtd_90d}` : '0'} 
                    </div>
                    <div className="text-xs text-slate-400">R$ {row.vendas_valor_90d.toLocaleString('pt-BR')}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-slate-600">+{row.qtd_chegou_90d}</div>
                  </TableCell>
                  <TableCell>
                    <div className={`font-bold ${row.cobertura_dias && row.cobertura_dias > 365 ? 'text-red-500' : 'text-slate-700'}`}>
                      {row.cobertura_dias && row.cobertura_dias > 900 ? '∞' : row.cobertura_dias} dias
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getSugestaoColor(row.sugestao || 'MANTER')} className="font-bold px-3 py-1">
                      {row.sugestao}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  Nenhum dado encontrado para os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default InventoryAnalysis;
