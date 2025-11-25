import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag } from "lucide-react";

interface PurchaseHistory {
  data: string;
  total_venda: number;
  quantidade_itens: number;
  vendedor: string;
  numero_nota_fiscal: string;
  tipo_pagamento: string;
  movimentacao: string;
}

interface ClientHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
}

export function ClientHistoryDialog({ open, onOpenChange, clientName }: ClientHistoryDialogProps) {
  const [history, setHistory] = useState<PurchaseHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && clientName) {
      fetchHistory();
    }
  }, [open, clientName]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Buscar vendas do cliente
      const { data: vendas, error: vendasError } = await supabase
        .from('gemini_vendas_geral')
        .select('*')
        .eq('nome', clientName)
        .order('data', { ascending: false });

      if (vendasError) throw vendasError;

      if (vendas) {
        // Para cada venda, buscar quantidade de itens
        const historyWithItems = await Promise.all(
          vendas.map(async (venda) => {
            const { data: itens, error: itensError } = await supabase
              .from('gemini_vendas_itens')
              .select('quantidade')
              .eq('movimentacao', venda.movimentacao);

            if (itensError) {
              console.error('Erro ao buscar itens:', itensError);
            }

            const quantidadeTotal = itens?.reduce((sum, item) => sum + (item.quantidade || 0), 0) || 0;

            return {
              data: venda.data || '',
              total_venda: venda.total_venda || 0,
              quantidade_itens: quantidadeTotal,
              vendedor: venda.vendedor || 'Sem vendedor',
              numero_nota_fiscal: venda.numero_nota_fiscal || '',
              tipo_pagamento: venda.tipo_pagamento || '',
              movimentacao: venda.movimentacao || ''
            };
          })
        );

        setHistory(historyWithItems);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const totalGasto = history.reduce((sum, item) => sum + item.total_venda, 0);
  const totalCompras = history.length;
  const totalItens = history.reduce((sum, item) => sum + item.quantidade_itens, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Histórico de Compras - {clientName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            {/* Resumo Geral */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Gasto</p>
                <p className="text-2xl font-bold">{formatCurrency(totalGasto)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Compras</p>
                <p className="text-2xl font-bold">{totalCompras}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="text-2xl font-bold">{totalItens}</p>
              </div>
            </div>

            {/* Histórico Detalhado */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>NF</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-center">Qtd Itens</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma compra encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(item.data)}</TableCell>
                        <TableCell className="text-xs">{item.numero_nota_fiscal}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.vendedor}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{item.quantidade_itens}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{item.tipo_pagamento}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.total_venda)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
