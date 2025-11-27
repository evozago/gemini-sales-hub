import { supabase } from "@/integrations/supabase/client";
import { AnalyticsCategoria, SalesEvolutionData, SalesSniperMatch, CarteiraCliente, InventoryAnalytics } from '../types';

export const getDashboardStats = async () => {
  console.log("🔄 Carregando Dashboard...");
  try {
    const { data: catData } = await supabase.from('gemini_vw_analytics_categorias').select('*').order('faturamento_bruto', { ascending: false }).limit(5);
    const { data: evoData } = await supabase.from('gemini_vw_analise_mensal').select('*').order('mes_ano', { ascending: true });

    const faturamentoTotal = catData?.reduce((acc, curr) => acc + (curr.faturamento_bruto || 0), 0) || 0;
    const lucroTotal = catData?.reduce((acc, curr) => acc + (curr.lucro_estimado || 0), 0) || 0;
    const totalPedidos = evoData?.reduce((acc, curr) => acc + (curr.total_atendimentos || 0), 0) || 0;

    return {
      kpis: { faturamentoMes: faturamentoTotal, lucroEstimado: lucroTotal, totalPedidos: totalPedidos },
      charts: { evolution: evoData || [], categories: catData || [] }
    };
  } catch (e) { console.error("Erro Dashboard:", e); return null; }
};

export const getCarteiraClientes = async (vendedorFiltro?: string): Promise<CarteiraCliente[]> => {
  try {
    let query = supabase.from('gemini_vw_relatorio_carteira_clientes').select('*').order('total_gasto_acumulado', { ascending: false });
    if (vendedorFiltro && vendedorFiltro !== 'Todos') query = query.eq('vendedor_responsavel', vendedorFiltro);
    const { data } = await query;
    return data || [];
  } catch (e) { console.error("Erro Carteira:", e); return []; }
};

export const runSalesSniper = async (marca: string, tamanho: string, genero: string, categoria: string): Promise<SalesSniperMatch[]> => {
  try {
    const searchWindow = new Date();
    searchWindow.setMonth(searchWindow.getMonth() - 12);
    
    let queryProdutos = supabase.from('gemini_produtos').select('sku').ilike('marca', `%${marca}%`); 
    if (genero && genero !== 'Unissex') queryProdutos = queryProdutos.ilike('genero', `%${genero}%`);

    const { data: produtosAlvo } = await queryProdutos;
    if (!produtosAlvo || produtosAlvo.length === 0) return [];
    const skusPermitidos = produtosAlvo.map(p => p.sku);

    const { data: itensVendidos } = await supabase.from('gemini_vendas_itens').select('movimentacao, tamanho, data, sku').gt('data', searchWindow.toISOString()).in('sku', skusPermitidos).ilike('tamanho', `${tamanho}`);
    if (!itensVendidos || itensVendidos.length === 0) return [];

    const idsMovimentacao = itensVendidos.map(i => i.movimentacao);
    const { data: vendasGerais } = await supabase.from('gemini_vendas_geral').select('movimentacao, nome, telefone, total_venda, data').in('movimentacao', idsMovimentacao);

    const resultadoMap = new Map<string, SalesSniperMatch>();
    vendasGerais?.forEach(venda => {
      if (!venda.telefone || venda.telefone.length < 8 || (venda.total_venda || 0) < 0) return;
      if (!resultadoMap.has(venda.telefone)) {
        resultadoMap.set(venda.telefone, {
          cliente: { nome: venda.nome || "Cliente", telefone: venda.telefone },
          motivo: `Comprou ${marca} (${genero}) Tam ${tamanho}`,
          ultimaCompraData: venda.data,
          totalGastoHistorico: venda.total_venda
        });
      } else {
          const existing = resultadoMap.get(venda.telefone)!;
          if (new Date(venda.data) > new Date(existing.ultimaCompraData)) existing.ultimaCompraData = venda.data;
      }
    });
    return Array.from(resultadoMap.values()).sort((a, b) => new Date(b.ultimaCompraData).getTime() - new Date(a.ultimaCompraData).getTime());
  } catch (err) { console.error("Erro Sniper:", err); return []; }
};

// --- NOVO: ANÁLISE DE ESTOQUE E GIRO ---
export const getInventoryAnalytics = async (): Promise<InventoryAnalytics[]> => {
  try {
    const { data, error } = await supabase.from('gemini_vw_analise_giro').select('*').order('vendas_valor_90d', { ascending: false });
    if (error) { console.error("Erro Analytics Estoque:", error); return []; }

    return (data || []).map((item: any) => {
      const estoque = item.qtd_estoque_atual || 0;
      const vendas90d = item.vendas_qtd_90d || 0;
      const vendasPorDia = vendas90d / 90;
      const diasDeCobertura = vendasPorDia > 0 ? Math.round(estoque / vendasPorDia) : 999;

      let sugestao: 'COMPRAR' | 'LIQUIDAR' | 'MANTER' = 'MANTER';
      if (estoque > 20 && diasDeCobertura > 120) sugestao = 'LIQUIDAR';
      else if (estoque < 10 && diasDeCobertura < 30) sugestao = 'COMPRAR';

      return { ...item, sugestao, cobertura_dias: diasDeCobertura };
    });
  } catch (e) { console.error("Erro Analytics:", e); return []; }
};
// src/services/dataService.ts

// --- 4. ANÁLISE DE ESTOQUE DETALHADA ---
export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    // Busca a view nova (SKU a SKU)
    const { data, error } = await supabase
      .from('gemini_vw_estoque_geral')
      .select('*')
      .order('vendas_90d', { ascending: false }) // Mais vendidos primeiro
      .limit(2000); // Limite de segurança para performance (ajustável)

    if (error) {
      console.error("Erro Estoque Geral:", error);
      return [];
    }

    // Processamento de Inteligência (Sugestão)
    return (data || []).map((item: any) => {
      const estoque = item.estoque_atual || 0;
      const vendas90d = item.vendas_90d || 0;
      
      // Cobertura: Se vender X por dia, dura quanto tempo?
      const vendasPorDia = vendas90d / 90;
      const diasDeCobertura = vendasPorDia > 0 ? Math.round(estoque / vendasPorDia) : 999;

      let sugestao: 'COMPRAR' | 'LIQUIDAR' | 'MANTER' = 'MANTER';

      // Regras:
      if (estoque > 5 && diasDeCobertura > 180) { 
        // Tem mais de 5 peças (para um único produto é muito) e não sai há 6 meses
        sugestao = 'LIQUIDAR';
      } else if (estoque <= 2 && vendas90d >= 5) {
        // Tem pouco (<=2) e vendeu bem (>=5)
        sugestao = 'COMPRAR';
      }

      return {
        ...item,
        sugestao,
        cobertura_dias: diasDeCobertura
      };
    });

  } catch (e) {
    console.error("Erro Service Estoque:", e);
    return [];
  }
};
