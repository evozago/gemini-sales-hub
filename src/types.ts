// src/types.ts

// Tabelas Base do Banco de Dados
export interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  cpf: string;
  cidade: string;
  uf: string;
}

export interface Produto {
  sku: string;
  nome_produto: string;
  categoria_produto: string;
  departamento: string;
  marca: string;
  tamanho: string;
  cor: string;
  genero: string;
  valor_venda: number;
  quantidade_estoque: number;
  data_criacao?: string;
}

// --- VIEWS DE INTELIGÊNCIA ---

// Para o Gráfico de Pizza/Barras (Dashboard)
export interface AnalyticsCategoria {
  categoria_produto: string;
  qtd_pedidos: number;
  pecas_vendidas: number;
  faturamento_bruto: number;
  lucro_estimado: number;
  preco_medio_peca: number;
}

// Para o Gráfico de Evolução (Dashboard)
export interface SalesEvolutionData {
  mes_ano: string;
  total_atendimentos: number;
  faturamento_liquido_real: number;
  tipo_operacao: string;
}

// Para a Tabela de Ranking de Clientes
export interface CarteiraCliente {
  cliente: string;
  vendedor_responsavel: string;
  ultimo_vendedor: string;
  total_gasto_acumulado: number;
  qtd_produtos_total: number;
  qtd_vendas: number;
  data_ultima_compra: string;
  ultimas_preferencias: string;
}

// Para o Resultado da Busca do Sniper
export interface SalesSniperMatch {
  cliente: {
    nome: string;
    telefone: string;
  };
  motivo: string;
  ultimaCompraData: string;
  totalGastoHistorico: number;
}

// --- NOVO: ANÁLISE DE ESTOQUE DETALHADA (SKU a SKU) ---
export interface InventoryItem {
  sku: string;
  nome_produto: string;
  marca: string;
  genero: string;
  departamento: string;
  categoria_produto: string;
  tamanho: string;
  cor: string;
  
  // Dados de Estoque (Vindos da View)
  estoque_atual: number;
  total_valor_estoque: number; // Quantidade * Preço Venda
  
  // Dados de Vendas (Histórico e Recente)
  vendas_total_hist: number;
  vendas_30d: number;
  vendas_90d: number;
  faturamento_90d: number;
  
  // Campos Calculados no Frontend (Inteligência)
  sugestao?: 'COMPRAR' | 'LIQUIDAR' | 'MANTER';
  cobertura_dias?: number;
}
