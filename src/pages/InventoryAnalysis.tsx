import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input"; // Componente de Input para busca
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getInventoryAnalytics } from '../services/dataService';
import { InventoryAnalytics } from '../types';
import { TrendingUp, Package, Search, Filter } from 'lucide-react';

const InventoryAnalysis = () => {
  const [data, setData] = useState<InventoryAnalytics[]>([]);
  const [filteredData, setFilteredData] = useState<InventoryAnalytics[]>([]);
  
  // Estados dos Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMarca, setFilterMarca] = useState("Todas");
  const [filterGenero, setFilterGenero] = useState("Todos");
  const [filterCategoria, setFilterCategoria] = useState("Todas");

  useEffect(() => {
    loadData();
  }, []);

  // O Efeito "Acumulativo" acontece aqui:
  useEffect(() => {
    let result = data;

    // 1. Filtro de Marca
    if (filterMarca !== "Todas") {
      result = result.filter(i => i.marca === filterMarca);
    }

    // 2. Filtro de Gênero
    if (filterGenero !== "Todos") {
      result = result.filter(i => i.genero === filterGenero);
    }

    // 3. Filtro de Categoria (Novo)
    if (filterCategoria !== "Todas") {
      result = result.filter(i => i.categoria_produto === filterCategoria);
    }

    // 4. Busca Textual (Pesquisa em tudo)
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(i => 
        i.marca?.toLowerCase().includes(lowerQuery) ||
        i.categoria_produto?.toLowerCase().includes(lowerQuery) ||
        i.departamento?.toLowerCase().includes(lowerQuery) ||
        i.genero?.toLowerCase().includes(lowerQuery)
      );
    }

    setFilteredData(result);
  }, [filterMarca, filterGenero, filterCategoria, searchQuery, data]);

  const loadData = async () => {
    const result = await getInventoryAnalytics();
    setData(result);
    setFilteredData(result);
  };

  // Extração de listas únicas para os Dropdowns
  const marcas = ["Todas", ...Array.from(new Set(data.map(i => i.marca).filter(Boolean))).sort()];
  const categorias = ["Todas", ...Array.from(new Set(data.map(i => i.categoria_produto).filter(Boolean))).sort()];

  // Cálculos de KPI baseados nos dados FILTRADOS
  const valorEstoque = filteredData.reduce((acc, curr) => acc + curr.valor_estoque_venda, 0);
  const qtdEstoque = filteredData.reduce((acc, curr) => acc + curr.qtd_estoque_atual, 0);
  const vendas90d = filteredData.reduce((acc, curr) => acc + curr.vendas_qtd_90d, 0);

  const getSugestaoColor = (sugestao: string) => {
    if (sugestao === 'LIQUIDAR') return "destructive"; 
    if (sugestao === 'COMPRAR') return "default";
    return "secondary";
  };

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-800">
          Gestão de Estoque
        </h1>
        
        {/* Barra de Pesquisa Rápida */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Pesquisar marca, categoria..." 
            className="pl-10 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* KPIs Dinâmicos (Mudam conforme o filtro) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white hover:shadow-md transition-all border-l-4 border-l-blue-500">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Valor Filtrado (Venda)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-slate-800">R$ {valorEstoque.toLocaleString('pt-BR')}</div></CardContent>
        </Card>
        <Card className="bg-white hover:shadow-md transition-all border-l-4 border-l-orange-500">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Peças no Estoque</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Package className="text-orange-500" size={20}/> {qtdEstoque}</div></CardContent>
        </Card>
        <Card className="bg-white hover:shadow-md transition-all border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Vendas (90 dias)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600 flex items-center gap-2"><TrendingUp size={20}/> {vendas90d}</div></CardContent>
        </Card>
      </div>

      {/* Área de Filtros Avançados */}
      <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">
          <Filter size={16} /> Filtros Acumulativos
        </div>
        <div className="flex flex-wrap gap-4">
          
          {/* Filtro Marca */}
          <div className="w-full sm:w-48">
            <Select value={filterMarca} onValueChange={setFilterMarca}>
              <SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger>
              <SelectContent>
                {marcas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Gênero */}
          <div className="w-full sm:w-48">
            <Select value={filterGenero} onValueChange={setFilterGenero}>
              <SelectTrigger><SelectValue placeholder="Gênero" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos Gêneros</SelectItem>
                <SelectItem value="MENINA">Menina</SelectItem>
                <SelectItem value="MENINO">Menino</SelectItem>
                <SelectItem value="UNISSEX">Unissex</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Categoria (NOVO) */}
          <div className="w-full sm:w-48">
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-bold text-slate-600">Detalhes do Grupo</TableHead>
              <TableHead className="font-bold text-slate-600 text-right">Estoque</TableHead>
              <TableHead className="font-bold text-slate-600 text-right">Vendas (90d)</TableHead>
              <TableHead className="font-bold text-slate-600 text-center">Giro (Dias)</TableHead>
              <TableHead className="text-center font-bold text-slate-600">Diagnóstico</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((row, idx) => (
                <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <TableCell>
                    <div className="font-bold text-slate-800 text-base">{row.categoria_produto}</div>
                    <div className="text-xs text-slate-500 font-medium">{row.marca} • {row.genero}</div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="font-bold text-slate-700">{row.qtd_estoque_atual} un</div>
                    <div className="text-xs text-slate-400">R$ {row.valor_estoque_venda.toLocaleString('pt-BR')}</div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="font-bold text-emerald-600">
                      {row.vendas_qtd_90d} un
                    </div>
                    <div className="text-xs text-slate-400">R$ {row.vendas_valor_90d.toLocaleString('pt-BR')}</div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <div className={`font-bold inline-block px-2 py-1 rounded ${
                      row.cobertura_dias && row.cobertura_dias > 365 ? 'bg-red-50 text-red-600' : 'text-slate-700'
                    }`}>
                      {row.cobertura_dias && row.cobertura_dias > 900 ? '> 2 anos' : `${row.cobertura_dias} dias`}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Badge variant={getSugestaoColor(row.sugestao || 'MANTER')} className="font-bold px-3 py-1 shadow-sm">
                      {row.sugestao}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search size={30} className="opacity-20" />
                    <p>Nenhum resultado encontrado com esses filtros.</p>
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
