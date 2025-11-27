import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getInventoryItems } from '../services/dataService'; // IMPORTANTE: Função nova
import { InventoryItem } from '../types'; // IMPORTANTE: Tipo novo
import { TrendingUp, Package, Search, Filter, AlertCircle } from 'lucide-react';

const InventoryAnalysis = () => {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [filteredData, setFilteredData] = useState<InventoryItem[]>([]);
  
  // Estados dos Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMarca, setFilterMarca] = useState("Todas");
  const [filterCategoria, setFilterCategoria] = useState("Todas");

  useEffect(() => {
    loadData();
  }, []);

  // Lógica de Filtro Acumulativo (Texto + Marca + Categoria)
  useEffect(() => {
    let result = data;

    // 1. Filtro de Texto (Nome, SKU, etc)
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(i => 
        i.nome_produto?.toLowerCase().includes(lowerQuery) ||
        i.sku?.toLowerCase().includes(lowerQuery) ||
        i.marca?.toLowerCase().includes(lowerQuery) ||
        i.categoria_produto?.toLowerCase().includes(lowerQuery)
      );
    }

    // 2. Filtro de Marca
    if (filterMarca !== "Todas") {
      result = result.filter(i => i.marca === filterMarca);
    }

    // 3. Filtro de Categoria
    if (filterCategoria !== "Todas") {
      result = result.filter(i => i.categoria_produto === filterCategoria);
    }

    setFilteredData(result);
  }, [searchQuery, filterMarca, filterCategoria, data]);

  const loadData = async () => {
    const result = await getInventoryItems();
    setData(result);
    setFilteredData(result);
  };

  // Listas Únicas para os Dropdowns
  const marcas = ["Todas", ...Array.from(new Set(data.map(i => i.marca).filter(Boolean))).sort()];
  const categorias = ["Todas", ...Array.from(new Set(data.map(i => i.categoria_produto).filter(Boolean))).sort()];

  // KPIs Dinâmicos (Calculados sobre o que está na tela)
  const valorEstoque = filteredData.reduce((acc, curr) => acc + curr.total_valor_estoque, 0);
  const qtdEstoque = filteredData.reduce((acc, curr) => acc + curr.estoque_atual, 0);
  const vendas90d = filteredData.reduce((acc, curr) => acc + curr.vendas_90d, 0);

  const getSugestaoColor = (sugestao: string) => {
    if (sugestao === 'LIQUIDAR') return "destructive"; 
    if (sugestao === 'COMPRAR') return "default";
    return "secondary";
  };

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-800">
          Análise de Estoque Detalhada
        </h1>
        
        {/* Barra de Pesquisa Principal */}
        <div className="relative w-full md:w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Ex: 'Vestido Anime', 'Sunga', 'Tam 6'..." 
            className="pl-10 bg-white border-slate-200 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* KPIs Dinâmicos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Valor Filtrado (Venda)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-slate-800">R$ {valorEstoque.toLocaleString('pt-BR')}</div></CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Qtd Peças (Filtro)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Package className="text-orange-500" size={20}/> {qtdEstoque}</div></CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Vendas (90 dias)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600 flex items-center gap-2"><TrendingUp size={20}/> {vendas90d}</div></CardContent>
        </Card>
      </div>

      {/* Filtros Extras */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-bold uppercase tracking-wider mr-2">
          <Filter size={16} /> Filtros:
        </div>
        
        <div className="w-48">
          <Select value={filterMarca} onValueChange={setFilterMarca}>
            <SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger>
            <SelectContent>
              {marcas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-bold text-slate-600 w-[40%]">Produto</TableHead>
              <TableHead className="font-bold text-slate-600 text-center">Tam</TableHead>
              <TableHead className="font-bold text-slate-600 text-right">Estoque</TableHead>
              <TableHead className="font-bold text-slate-600 text-right">Vendas (Total)</TableHead>
              <TableHead className="font-bold text-slate-600 text-right">Vendas (90d)</TableHead>
              <TableHead className="text-center font-bold text-slate-600">Sugestão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((row, idx) => (
                <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <TableCell>
                    <div className="font-bold text-slate-800 text-sm line-clamp-1" title={row.nome_produto}>{row.nome_produto}</div>
                    <div className="text-xs text-slate-500 font-medium flex gap-2 mt-1">
                      <span className="bg-slate-100 px-1.5 rounded text-slate-600">{row.marca}</span>
                      <span className="bg-slate-100 px-1.5 rounded text-slate-600">{row.categoria_produto}</span>
                      <span className="text-slate-400">SKU: {row.sku}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center font-medium text-slate-700">
                    {row.tamanho}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className={`font-bold ${row.estoque_atual === 0 ? 'text-red-400' : 'text-slate-700'}`}>
                      {row.estoque_atual} un
                    </div>
                    <div className="text-[10px] text-slate-400">R$ {row.total_valor_estoque.toLocaleString('pt-BR')}</div>
                  </TableCell>
                  
                  <TableCell className="text-right text-slate-600">
                    {row.vendas_total_hist}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="font-bold text-emerald-600">
                      {row.vendas_90d}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    {row.sugestao !== 'MANTER' ? (
                      <Badge variant={getSugestaoColor(row.sugestao || 'MANTER')} className="font-bold text-[10px] px-2 py-0.5">
                        {row.sugestao}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle size={30} className="opacity-20" />
                    <p>Nenhum produto encontrado para "{searchQuery}".</p>
                  </div>
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
