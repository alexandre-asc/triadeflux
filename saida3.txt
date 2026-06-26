// ══════════════════════════════════════════════
// TRÍADE FLUX — TIPOS TYPESCRIPT
// ══════════════════════════════════════════════

// ── TENANT / EMPRESA ──────────────────────────
export interface Tenant {
  id:           string
  name:         string          // Nome da empresa
  ownerName:    string          // Nome do responsável
  email:        string          // E-mail / login
  cpfCnpj:      string
  phone:        string
  city:         string
  plan:          'starter' | 'professional' | 'enterprise'
  mrr:          number          // Mensalidade em reais
  startDate:    string          // ISO date
  dueDate:      string          // Vencimento da assinatura
  status:       'ativo' | 'trial' | 'bloqueado' | 'cancelado'
  notes:        string
  createdAt:    string
  updatedAt:    string
}

// ── USUÁRIO ───────────────────────────────────
export interface User {
  uid:          string
  email:        string
  name:         string
  role:         'master' | 'admin' | 'viewer'
  tenantId:     string          // ID da empresa
  createdAt:    string
}

// ── LANÇAMENTO FINANCEIRO ─────────────────────
export interface Lancamento {
  id:           string
  tenantId:     string
  tipo:         'receita' | 'despesa'
  data:         string          // ISO date YYYY-MM-DD
  descricao:    string
  categoria:    string
  centroCusto:  string
  valor:        number          // Sempre positivo
  regime:       'competencia' | 'caixa'
  pago:         boolean         // Para regime de caixa
  dataPagamento?: string
  documentoId?: string          // Referência a documento analisado
  createdAt:    string
  createdBy:    string
}

// ── DOCUMENTO ─────────────────────────────────
export interface Documento {
  id:           string
  tenantId:     string
  nome:         string
  tipo:         'pdf' | 'imagem' | 'excel' | 'csv' | 'doc'
  url:          string          // URL no Firebase Storage
  tamanho:      number          // bytes
  status:       'processando' | 'analisado' | 'erro'
  analise?:     DocumentoAnalise
  uploadedAt:   string
  uploadedBy:   string
}

export interface DocumentoAnalise {
  resumo:       string
  periodo?:     string
  totalReceitas?: number
  totalDespesas?: number
  lancamentosExtraidos?: number
  insights:     string[]
  analisadoEm: string
}

// ── KPIs ──────────────────────────────────────
export interface KPIs {
  saldoAtual:       number
  receitaMes:       number
  despesasMes:      number
  lucroLiquido:     number
  ebitda:           number
  margemLiquida:    number      // percentual 0-100
  margemOperacional:number
  pontoEquilibrio:  number
  geracaoCaixa:     number
  receitaAnterior:  number
  despesaAnterior:  number
  lucroAnterior:    number
}

// ── DRE ───────────────────────────────────────
export interface DRE {
  receitaBruta:        number
  devolucoes:          number
  impostos:            number
  receitaLiquida:      number
  custosVariaveis:     number
  custosProdutos:      number
  lucroBruto:          number
  despPessoal:         number
  despMarketing:       number
  despAdministrativas: number
  despFinanceiras:     number
  depreciacao:         number
  ebitda:              number
  resultadoFinanceiro: number
  irCsll:              number
  lucroLiquido:        number
  margemBruta:         number
  margemOperacional:   number
  margemLiquida:       number
  margemEbitda:        number
}

// ── ALERTA ────────────────────────────────────
export interface Alerta {
  id:       string
  tipo:     'danger' | 'warning' | 'success' | 'info'
  titulo:   string
  mensagem: string
  createdAt: string
}

// ── PLANOS ────────────────────────────────────
export const PLANOS = {
  starter:      { nome: 'Starter',      preco: 297  },
  professional: { nome: 'Professional', preco: 597  },
  enterprise:   { nome: 'Enterprise',   preco: 997  },
} as const

// ── CATEGORIAS ────────────────────────────────
export const CATEGORIAS_RECEITA = [
  'Serviços', 'Produtos', 'Consultoria', 'Recorrente (MRR)',
  'Comissões', 'Aluguéis', 'Outros',
]

export const CATEGORIAS_DESPESA = [
  'Pessoal', 'Marketing', 'Operacional', 'Financeiro',
  'Impostos', 'Tecnologia', 'Infraestrutura',
  'Administrativo', 'Viagens', 'Outros',
]

export const CENTROS_CUSTO = [
  'Comercial', 'Marketing', 'RH', 'TI',
  'Operações', 'Financeiro', 'Administrativo',
]
