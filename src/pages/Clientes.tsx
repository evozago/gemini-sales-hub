import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Edit, Phone, Mail, MapPin, Calendar, TrendingUp, ArrowUpDown, Filter } from "lucide-react";
import { toast } from "sonner";
import { ClientHistoryDialog } from "@/components/ClientHistoryDialog";

interface Cliente {
  id: number;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  cidade: string | null;
  uf: string | null;
  created_at: string | null;
  // Dados de vendas
  total_gasto?: number;
  frequencia_compras?: number;
  ultima_compra?: string;
  ultima_vendedora?: string;
}

interface EditingCliente extends Cliente {
  isEditing: boolean;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [editingCliente, setEditingCliente] = useState<EditingCliente | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [sortField, setSortField] = useState<keyof Cliente>("nome");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filterUF, setFilterUF] = useState<string>("all");
  const [filterCidade, setFilterCidade] = useState<string>("all");
  const [filterVendedora, setFilterVendedora] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [historyOpen, setHistoryOpen] = useState(false);

  // Estados para estatísticas
  const [stats, setStats] = useState({
    total: 0,
    comEmail: 0,
    comTelefone: 0,
    totalGasto: 0,
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    filterAndSortClientes();
  }, [clientes, searchTerm, sortField, sortDirection, filterUF, filterCidade, filterVendedora]);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      // Buscar TODOS os clientes em lotes (Supabase limita em 1000 por query)
      let allClientesData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: clientesBatch, error: clientesError } = await supabase
          .from("gemini_clientes")
          .select("*")
          .order("nome", { ascending: true })
          .range(from, from + pageSize - 1);

        if (clientesError) throw clientesError;

        if (clientesBatch && clientesBatch.length > 0) {
          allClientesData = [...allClientesData, ...clientesBatch];
          from += pageSize;
          hasMore = clientesBatch.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // Buscar TODOS os dados de vendas em lotes
      let allRankingData: any[] = [];
      from = 0;
      hasMore = true;

      while (hasMore) {
        const { data: rankingBatch, error: rankingError } = await supabase
          .from("gemini_vw_ranking_clientes")
          .select("*")
          .range(from, from + pageSize - 1);

        if (rankingError) throw rankingError;

        if (rankingBatch && rankingBatch.length > 0) {
          allRankingData = [...allRankingData, ...rankingBatch];
          from += pageSize;
          hasMore = rankingBatch.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // Buscar TODAS as vendas para determinar última vendedora
      let allVendasData: any[] = [];
      from = 0;
      hasMore = true;

      while (hasMore) {
        const { data: vendasBatch, error: vendasError } = await supabase
          .from("gemini_vendas_geral")
          .select("nome, vendedor, data")
          .not("nome", "in", '("Cliente Import","Consumidor final")')
          .not("nome", "is", null)
          .order("data", { ascending: false })
          .range(from, from + pageSize - 1);

        if (vendasError) throw vendasError;

        if (vendasBatch && vendasBatch.length > 0) {
          allVendasData = [...allVendasData, ...vendasBatch];
          from += pageSize;
          hasMore = vendasBatch.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // Mapear última vendedora por cliente
      const ultimaVendedoraPorCliente = new Map<string, string>();
      allVendasData.forEach((venda) => {
        const nomeCliente = venda.nome?.toLowerCase();
        if (nomeCliente && !ultimaVendedoraPorCliente.has(nomeCliente)) {
          ultimaVendedoraPorCliente.set(nomeCliente, venda.vendedor || "Sem vendedor");
        }
      });

      // Combinar dados
      const clientesComVendas = allClientesData.map((cliente) => {
        const vendaInfo = allRankingData.find(
          (r) => r.cliente_nome?.toLowerCase() === cliente.nome?.toLowerCase()
        );
        const nomeCliente = cliente.nome?.toLowerCase();
        return {
          ...cliente,
          total_gasto: vendaInfo?.total_gasto_real || 0,
          frequencia_compras: vendaInfo?.frequencia_compras || 0,
          ultima_compra: vendaInfo?.ultima_compra || null,
          ultima_vendedora: ultimaVendedoraPorCliente.get(nomeCliente) || "Sem vendedor",
        };
      });

      setClientes(clientesComVendas);

      // Calcular estatísticas
      setStats({
        total: clientesComVendas.length,
        comEmail: clientesComVendas.filter((c) => c.email).length,
        comTelefone: clientesComVendas.filter((c) => c.telefone).length,
        totalGasto: clientesComVendas.reduce((sum, c) => sum + (c.total_gasto || 0), 0),
      });

      console.log(`✅ Carregados ${clientesComVendas.length} clientes no total`);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortClientes = () => {
    let filtered = [...clientes];

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (cliente) =>
          cliente.nome?.toLowerCase().includes(term) ||
          cliente.telefone?.includes(term) ||
          cliente.email?.toLowerCase().includes(term) ||
          cliente.cpf?.includes(term)
      );
    }

    // Filtro por UF
    if (filterUF !== "all") {
      filtered = filtered.filter((cliente) => cliente.uf === filterUF);
    }

    // Filtro por Cidade
    if (filterCidade !== "all") {
      filtered = filtered.filter((cliente) => cliente.cidade === filterCidade);
    }

    // Filtro por Vendedora
    if (filterVendedora !== "all") {
      filtered = filtered.filter((cliente) => cliente.ultima_vendedora === filterVendedora);
    }

    // Ordenação
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === "asc" ? comparison : -comparison;
    });

    setFilteredClientes(filtered);
    setCurrentPage(1);
  };

  const handleSort = (field: keyof Cliente) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSaveCliente = async () => {
    if (!editingCliente) return;

    try {
      const { error } = await supabase
        .from("gemini_clientes")
        .update({
          nome: editingCliente.nome,
          cpf: editingCliente.cpf,
          email: editingCliente.email,
          telefone: editingCliente.telefone,
          data_nascimento: editingCliente.data_nascimento,
          cidade: editingCliente.cidade,
          uf: editingCliente.uf,
        })
        .eq("id", editingCliente.id);

      if (error) throw error;

      toast.success("Cliente atualizado com sucesso!");
      setEditingCliente(null);
      fetchClientes();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast.error("Erro ao salvar cliente");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return "-";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const openWhatsApp = (phone: string | null, name: string) => {
    if (!phone) {
      toast.error("Cliente sem telefone cadastrado");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(`Olá ${name}! Tudo bem?`);
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, "_blank");
  };

  const openClientHistory = (clientName: string) => {
    setSelectedClient(clientName);
    setHistoryOpen(true);
  };

  // Get unique UFs, Cidades and Vendedoras for filters
  const uniqueUFs = Array.from(new Set(clientes.map((c) => c.uf).filter(Boolean))).sort();
  const uniqueCidades = Array.from(
    new Set(
      clientes
        .filter((c) => filterUF === "all" || c.uf === filterUF)
        .map((c) => c.cidade)
        .filter(Boolean)
    )
  ).sort();
  const uniqueVendedoras = Array.from(
    new Set(clientes.map((c) => c.ultima_vendedora).filter(Boolean))
  ).sort();

  // Paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredClientes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-20">Carregando clientes...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Gestão de Clientes</h1>
        <p className="text-muted-foreground">Gerencie todos os seus clientes em um só lugar</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Com Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.comEmail}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((stats.comEmail / stats.total) * 100).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Com Telefone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.comTelefone}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((stats.comTelefone / stats.total) * 100).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{formatCurrency(stats.totalGasto)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone, email ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Select value={filterVendedora} onValueChange={setFilterVendedora}>
                <SelectTrigger>
                  <SelectValue placeholder="Vendedora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Vendedoras</SelectItem>
                  {uniqueVendedoras.map((vendedora) => (
                    <SelectItem key={vendedora} value={vendedora!}>
                      {vendedora}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filterUF} onValueChange={setFilterUF}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Estados</SelectItem>
                  {uniqueUFs.map((uf) => (
                    <SelectItem key={uf} value={uf!}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filterCidade} onValueChange={setFilterCidade}>
                <SelectTrigger>
                  <SelectValue placeholder="Cidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Cidades</SelectItem>
                  {uniqueCidades.map((cidade) => (
                    <SelectItem key={cidade} value={cidade!}>
                      {cidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>
                Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredClientes.length)} de {filteredClientes.length} clientes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por página:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Clientes */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("nome")}>
                    <div className="flex items-center gap-2">
                      Nome
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("ultima_vendedora")}>
                    <div className="flex items-center gap-2">
                      Vendedora
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("cidade")}>
                    <div className="flex items-center gap-2">
                      Localização
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("total_gasto")}>
                    <div className="flex items-center gap-2">
                      Total Gasto
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("frequencia_compras")}>
                    <div className="flex items-center gap-2">
                      Compras
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("ultima_compra")}>
                    <div className="flex items-center gap-2">
                      Última Compra
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell>
                      <div>
                        <div 
                          className="font-medium text-foreground cursor-pointer hover:text-primary underline"
                          onClick={() => openClientHistory(cliente.nome)}
                        >
                          {cliente.nome}
                        </div>
                        {cliente.cpf && (
                          <div className="text-sm text-muted-foreground">CPF: {cliente.cpf}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{cliente.ultima_vendedora}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {cliente.telefone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{formatPhone(cliente.telefone)}</span>
                          </div>
                        )}
                        {cliente.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{cliente.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cliente.cidade || cliente.uf ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {cliente.cidade}
                            {cliente.cidade && cliente.uf && " - "}
                            {cliente.uf}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground">
                        {formatCurrency(cliente.total_gasto || 0)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{cliente.frequencia_compras || 0} compras</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(cliente.ultima_compra)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openWhatsApp(cliente.telefone, cliente.nome)}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingCliente({ ...cliente, isEditing: true })}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Editar Cliente</DialogTitle>
                            </DialogHeader>
                            {editingCliente && (
                              <Tabs defaultValue="dados" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                  <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
                                  <TabsTrigger value="historico">Histórico de Compras</TabsTrigger>
                                </TabsList>
                                <TabsContent value="dados" className="space-y-4 mt-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                      <Label htmlFor="nome">Nome Completo</Label>
                                      <Input
                                        id="nome"
                                        value={editingCliente.nome}
                                        onChange={(e) =>
                                          setEditingCliente({ ...editingCliente, nome: e.target.value })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="cpf">CPF</Label>
                                      <Input
                                        id="cpf"
                                        value={editingCliente.cpf || ""}
                                        onChange={(e) =>
                                          setEditingCliente({ ...editingCliente, cpf: e.target.value })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                                      <Input
                                        id="data_nascimento"
                                        type="date"
                                        value={editingCliente.data_nascimento || ""}
                                        onChange={(e) =>
                                          setEditingCliente({
                                            ...editingCliente,
                                            data_nascimento: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="telefone">Telefone</Label>
                                      <Input
                                        id="telefone"
                                        value={editingCliente.telefone || ""}
                                        onChange={(e) =>
                                          setEditingCliente({ ...editingCliente, telefone: e.target.value })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="email">Email</Label>
                                      <Input
                                        id="email"
                                        type="email"
                                        value={editingCliente.email || ""}
                                        onChange={(e) =>
                                          setEditingCliente({ ...editingCliente, email: e.target.value })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="cidade">Cidade</Label>
                                      <Input
                                        id="cidade"
                                        value={editingCliente.cidade || ""}
                                        onChange={(e) =>
                                          setEditingCliente({ ...editingCliente, cidade: e.target.value })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="uf">Estado (UF)</Label>
                                      <Input
                                        id="uf"
                                        value={editingCliente.uf || ""}
                                        onChange={(e) =>
                                          setEditingCliente({ ...editingCliente, uf: e.target.value })
                                        }
                                        maxLength={2}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setEditingCliente(null)}>
                                      Cancelar
                                    </Button>
                                    <Button onClick={handleSaveCliente}>Salvar Alterações</Button>
                                  </div>
                                </TabsContent>
                                <TabsContent value="historico" className="space-y-4 mt-4">
                                  <div className="grid grid-cols-3 gap-4">
                                    <Card>
                                      <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                          Total Gasto
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="text-2xl font-bold text-foreground">
                                          {formatCurrency(editingCliente.total_gasto || 0)}
                                        </div>
                                      </CardContent>
                                    </Card>
                                    <Card>
                                      <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                          Total de Compras
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="text-2xl font-bold text-foreground">
                                          {editingCliente.frequencia_compras || 0}
                                        </div>
                                      </CardContent>
                                    </Card>
                                    <Card>
                                      <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                          Ticket Médio
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="text-2xl font-bold text-foreground">
                                          {formatCurrency(
                                            (editingCliente.total_gasto || 0) /
                                              (editingCliente.frequencia_compras || 1)
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">Última Compra:</span>
                                      <span className="font-medium">
                                        {formatDate(editingCliente.ultima_compra)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">Cliente desde:</span>
                                      <span className="font-medium">
                                        {formatDate(editingCliente.created_at)}
                                      </span>
                                    </div>
                                  </div>
                                </TabsContent>
                              </Tabs>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="p-4 border-t">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {/* Mostrar apenas algumas páginas para não sobrecarregar */}
                  {currentPage > 3 && (
                    <>
                      <PaginationItem>
                        <PaginationLink onClick={() => setCurrentPage(1)} className="cursor-pointer">
                          1
                        </PaginationLink>
                      </PaginationItem>
                      {currentPage > 4 && (
                        <PaginationItem>
                          <span className="px-4">...</span>
                        </PaginationItem>
                      )}
                    </>
                  )}
                  
                  {[...Array(Math.min(5, totalPages))].map((_, index) => {
                    const pageNumber = currentPage <= 3 
                      ? index + 1 
                      : currentPage >= totalPages - 2
                      ? totalPages - 4 + index
                      : currentPage - 2 + index;
                    
                    if (pageNumber < 1 || pageNumber > totalPages) return null;
                    
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNumber)}
                          isActive={currentPage === pageNumber}
                          className="cursor-pointer"
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && (
                        <PaginationItem>
                          <span className="px-4">...</span>
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink onClick={() => setCurrentPage(totalPages)} className="cursor-pointer">
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      className={
                        currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client History Dialog */}
      <ClientHistoryDialog 
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        clientName={selectedClient}
      />
    </div>
  );
}
