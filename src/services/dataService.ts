import { supabase } from "@/integrations/supabase/client";
import { 
  AnalyticsCategoria, 
  SalesEvolutionData, 
  SalesSniperMatch, 
  CarteiraCliente, 
  InventoryItem 
} from '../types';

// --- 1. DASHBOARD (Visão Geral) ---
export const getDashboardStats = async () => {
  console.log("🔄 Carregando Dashboard...");
  try {
    // Busca Categorias (Top 5 Faturamento)
    const { data: catData, error: catError } = await supabase
      .from('gemini_vw_analytics_categorias')
      .select('*')
      .order('faturamento_bruto', { ascending: false })
      .limit(5);

    if (catError) console.error("Erro Categorias:", catError);

    // Busca Evolução Temporal
    const { data: evoData, error: evoError } = await supabase
      .from('gemini_vw_analise_mensal')
      .select('*')
      .order('mes_ano', { ascending: true });

    if (evoError) console.error("Erro Evolução:", evoError);

    // Cálculos de Totais para os Cards do Topo
    const faturamentoTotal = catData?.reduce((acc, curr) => acc + (curr.faturamento_bruto || 0), 0) || 0;
    const lucroTotal = catData?.reduce((acc, curr) => acc + (curr.lucro_estimado || 0), 0) || 0;
    
    // Soma total de atendimentos (usando Set para evitar duplicidade se houver múltiplas linhas por mês)
    const totalPedidos = evoData?.reduce((acc, curr) => acc + (curr.total_atendimentos || 0), 0) || 0;

    return {
      kpis: {
        faturamentoMes: faturamentoTotal, 
        lucroEstimado: lucroTotal,
        totalPedidos: totalPedidos
      },
      charts: {
        evolution: evoData || [],
        categories: catData || []
      }
    };
  } catch (e) {
    console.error("Erro Crítico Dashboard:", e);
    return null;
  }
};

// --- 2. CARTEIRA DE CLIENTES (Ranking por Vendedor) ---
export const getCarteiraClientes = async (vendedorFiltro?: string): Promise<CarteiraCliente[]> => {
  try {
    let query = supabase
      .from('gemini_vw_relatorio_carteira_clientes')
      .select('*')
      .order('total_gasto_acumulado', { ascending: false });

    if (vendedorFiltro && vendedorFiltro !== 'Todos') {
      query = query.eq('vendedor_responsavel', vendedorFiltro);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro Carteira:", error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("Erro Carteira JS:", e);
    return [];
  }
};

// --- 3. SNIPER DE VENDAS (A Lógica da Tríade: Marca + Gênero + Tamanho) ---
export const runSalesSniper = async (
  marca: string, 
  tamanho: string, 
  genero: string, 
  categoria: string
): Promise<SalesSniperMatch[]> => {
  
  console.log(`🎯 Sniper: Buscando MARCA=${marca} | GÊNERO=${genero} | TAMANHO=${tamanho}`);
  
  try {
    // Janela de tempo: últimos 12 meses (coleção passada conta)
    const searchWindow = new Date();
    searchWindow.setMonth(searchWindow.getMonth() - 12);
    
    // PASSO 1: ENCONTRAR SKUS (Filtra por Marca e Gênero na tabela de Produtos)
    let queryProdutos = supabase
      .from('gemini_produtos')
      .select('sku')
      .ilike('marca', `%${marca}%`); 

    // Filtro de Gênero Inteligente
    if (genero && genero !== 'Unissex') {
       queryProdutos = queryProdutos.ilike('genero', `%${genero}%`);
    }

    const { data: produtosAlvo, error: erroProd } = await queryProdutos;

    if (erroProd || !produtosAlvo || produtosAlvo.length === 0) {
      console.warn("⚠️ Sniper: Nenhum produto encontrado com essa Marca/Gênero.");
      return [];
    }

    const skusPermitidos = produtosAlvo.map(p => p.sku);

    // PASSO 2: ENCONTRAR VENDAS DESSES SKUS NO TAMANHO CERTO
    const { data: itensVendidos, error: erroItens } = await supabase
      .from('gemini_vendas_itens')
      .select('movimentacao, tamanho, data, sku')
      .gt('data', searchWindow.toISOString())
      .in('sku', skusPermitidos)       // Apenas produtos da Marca/Gênero certos
      .ilike('tamanho', `${tamanho}`); // Apenas no tamanho certo

    if (erroItens) throw erroItens;
    if (!itensVendidos || itensVendidos.length === 0) return [];

    // PASSO 3: RECUPERAR DADOS DOS CLIENTES (Cruzando com Vendas Geral)
    const idsMovimentacao = itensVendidos.map(i => i.movimentacao);

    const { data: vendasGerais } = await supabase
      .from('gemini_vendas_geral')
      .select('movimentacao, nome, telefone, total_venda, data')
      .in('movimentacao', idsMovimentacao);

    // PASSO 4: AGRUPAR POR TELEFONE (Para não repetir o cliente na lista)
    const resultadoMap = new Map<string, SalesSniperMatch>();

    vendasGerais?.forEach(venda => {
      // Validação de dados mínimos
      if (!venda.telefone || venda.telefone.length < 8 || (venda.total_venda || 0) < 0) return;
      
      if (!resultadoMap.has(venda.telefone)) {
        resultadoMap.set(venda.telefone, {
          cliente: { nome: venda.nome || "Cliente", telefone: venda.telefone },
          motivo: `Comprou ${marca} (${genero}) Tam ${tamanho}`,
          ultimaCompraData: venda.data,
          totalGastoHistorico: venda.total_venda
        });
      } else {
          // Se comprou mais de uma vez, mantemos a data mais recente
          const existing = resultadoMap.get(venda.telefone)!;
          if (new Date(venda.data) > new Date(existing.ultimaCompraData)) {
              existing.ultimaCompraData = venda.data;
          }
          existing.totalGastoHistorico += venda.total_venda;
      }
    });

    // Retorna ordenado por data (quem comprou mais recentemente aparece primeiro)
    return Array.from(resultadoMap.values())
        .sort((a, b) => new Date(b.ultimaCompraData).getTime() - new Date(a.ultimaCompraData).getTime());

  } catch (err) {
    console.error("Erro Sniper:", err);
    return [];
  }
};

// --- 4. ANÁLISE DE ESTOQUE DETALHADA (Produto a Produto) ---
export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    // Busca a view detalhada criada no SQL (gemini_vw_estoque_geral)
    // Limite de 2000 para garantir performance inicial, ordenado por mais vendidos
    const { data, error } = await supabase
      .from('gemini_vw_estoque_geral')
      .select('*')
      .order('vendas_90d', { ascending: false }) 
      .limit(3000); 

    if (error) {
      console.error("Erro Estoque Geral:", error);
      return [];
    }

    // Processamento de Inteligência (Cálculo de Sugestão de Compra/Liquidação)
    return (data || []).map((item: any) => {
      const estoque = item.estoque_atual || 0;
      const vendas90d = item.vendas_90d || 0;
      
      // Cobertura: Se continuar vendendo nesse ritmo, quantos dias o estoque dura?
      // Média diária = Vendas 90 dias / 90
      const vendasPorDia = vendas90d / 90;
      
      // Se vendasPorDia for 0, a cobertura é "infinita" (999 dias para simplificar)
      const diasDeCobertura = vendasPorDia > 0 ? Math.round(estoque / vendasPorDia) : 999;

      let sugestao: 'COMPRAR' | 'LIQUIDAR' | 'MANTER' = 'MANTER';

      // --- REGRAS DO ALGORITMO ---
      if (estoque > 5 && diasDeCobertura > 180) { 
        // LIQUIDAR: Se tem mais de 5 unidades de UM item e vai levar mais de 6 meses pra vender
        sugestao = 'LIQUIDAR';
      } else if (estoque <= 2 && vendas90d >= 5) {
        // COMPRAR: Se tem pouco (<=2) e a demanda é alta (>=5 nos últimos 3 meses)
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
