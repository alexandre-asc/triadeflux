import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, Timestamp,
  writeBatch, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Tenant, Lancamento, Documento, KPIs, DRE, Alerta } from '@/types'

// ══════════════════════════════════════════════
// TENANTS (Master apenas)
// ══════════════════════════════════════════════
export async function getTenants(): Promise<Tenant[]> {
  const snap = await getDocs(query(collection(db, 'tenants'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Tenant))
}

export async function getTenant(id: string): Promise<Tenant | null> {
  const snap = await getDoc(doc(db, 'tenants', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } as Tenant : null
}

export async function createTenant(data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'tenants'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateTenant(id: string, data: Partial<Tenant>): Promise<void> {
  await updateDoc(doc(db, 'tenants', id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteTenant(id: string): Promise<void> {
  await deleteDoc(doc(db, 'tenants', id))
}

// ══════════════════════════════════════════════
// LANÇAMENTOS
// ══════════════════════════════════════════════
export async function getLancamentos(
  tenantId: string,
  mes?: number,
  ano?: number
): Promise<Lancamento[]> {
  let q = query(
    collection(db, 'tenants', tenantId, 'lancamentos'),
    orderBy('data', 'desc'),
    limit(500)
  )
  const snap = await getDocs(q)
  let docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lancamento))

  // Filtrar por mês/ano se fornecido
  if (mes !== undefined && ano !== undefined) {
    docs = docs.filter(l => {
      const d = new Date(l.data)
      return d.getMonth() + 1 === mes && d.getFullYear() === ano
    })
  }
  return docs
}

export async function addLancamento(
  tenantId: string,
  data: Omit<Lancamento, 'id' | 'tenantId' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'tenants', tenantId, 'lancamentos'), {
    ...data,
    tenantId,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateLancamento(
  tenantId: string, id: string, data: Partial<Lancamento>
): Promise<void> {
  await updateDoc(doc(db, 'tenants', tenantId, 'lancamentos', id), data)
}

export async function deleteLancamento(tenantId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'tenants', tenantId, 'lancamentos', id))
}

// ══════════════════════════════════════════════
// CÁLCULOS FINANCEIROS
// ══════════════════════════════════════════════
export function calcularKPIs(lancamentos: Lancamento[], regime: 'competencia' | 'caixa'): KPIs {
  const hoje = new Date()
  const mesAtual  = hoje.getMonth() + 1
  const anoAtual  = hoje.getFullYear()
  const mesAnt    = mesAtual === 1 ? 12 : mesAtual - 1
  const anoAnt    = mesAtual === 1 ? anoAtual - 1 : anoAtual

  const filtrar = (mes: number, ano: number, tipo: 'receita' | 'despesa') =>
    lancamentos.filter(l => {
      const d = new Date(l.data)
      const mesOk = d.getMonth() + 1 === mes && d.getFullYear() === ano
      const tipoOk = l.tipo === tipo
      const regimeOk = regime === 'competencia' ? true : l.pago === true
      return mesOk && tipoOk && regimeOk
    }).reduce((s, l) => s + l.valor, 0)

  const receitaMes      = filtrar(mesAtual, anoAtual, 'receita')
  const despesasMes     = filtrar(mesAtual, anoAtual, 'despesa')
  const receitaAnterior = filtrar(mesAnt,   anoAnt,   'receita')
  const despesaAnterior = filtrar(mesAnt,   anoAnt,   'despesa')

  const lucroLiquido = receitaMes - despesasMes
  const lucroAnterior = receitaAnterior - despesaAnterior

  // Saldo acumulado
  const saldoAtual = lancamentos
    .filter(l => regime === 'competencia' ? true : l.pago)
    .reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), 0)

  // EBITDA estimado (lucro + depreciação estimada em 4%)
  const ebitda = lucroLiquido + receitaMes * 0.04

  // Margem líquida
  const margemLiquida = receitaMes > 0 ? (lucroLiquido / receitaMes) * 100 : 0
  const margemOperacional = receitaMes > 0 ? ((lucroLiquido + receitaMes * 0.04) / receitaMes) * 100 : 0

  // Ponto de equilíbrio (despesas fixas / margem de contribuição estimada em 60%)
  const pontoEquilibrio = despesasMes / 0.6

  // Geração de caixa (lucro + depreciação)
  const geracaoCaixa = lucroLiquido + receitaMes * 0.03

  return {
    saldoAtual, receitaMes, despesasMes, lucroLiquido,
    ebitda, margemLiquida, margemOperacional, pontoEquilibrio,
    geracaoCaixa, receitaAnterior, despesaAnterior, lucroAnterior,
  }
}

export function calcularDRE(lancamentos: Lancamento[], mes: number, ano: number): DRE {
  const doMes = (tipo: 'receita' | 'despesa', ...cats: string[]) =>
    lancamentos
      .filter(l => {
        const d = new Date(l.data)
        return d.getMonth() + 1 === mes && d.getFullYear() === ano
          && l.tipo === tipo
          && (cats.length === 0 || cats.includes(l.categoria))
      })
      .reduce((s, l) => s + l.valor, 0)

  const receitaBruta    = doMes('receita')
  const impostos        = receitaBruta * 0.10   // Simples Nacional estimado
  const devolucoes      = receitaBruta * 0.013
  const receitaLiquida  = receitaBruta - impostos - devolucoes
  const custosProdutos  = doMes('despesa', 'Operacional') * 0.5
  const custosVariaveis = doMes('despesa', 'Operacional') * 0.3
  const lucroBruto      = receitaLiquida - custosProdutos - custosVariaveis
  const despPessoal     = doMes('despesa', 'Pessoal')
  const despMarketing   = doMes('despesa', 'Marketing')
  const despAdm         = doMes('despesa', 'Administrativo', 'TI', 'Tecnologia')
  const despFin         = doMes('despesa', 'Financeiro')
  const depreciacao     = receitaBruta * 0.016
  const ebitda          = lucroBruto - despPessoal - despMarketing - despAdm - depreciacao
  const resultFin       = -despFin
  const irCsll          = Math.max(0, (ebitda + resultFin) * 0.075)
  const lucroLiquido    = ebitda + resultFin - irCsll

  return {
    receitaBruta, devolucoes, impostos, receitaLiquida,
    custosVariaveis, custosProdutos, lucroBruto,
    despPessoal, despMarketing, despAdministrativas: despAdm,
    despFinanceiras: despFin, depreciacao, ebitda,
    resultadoFinanceiro: resultFin, irCsll, lucroLiquido,
    margemBruta:        receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0,
    margemOperacional:  receitaBruta > 0 ? (ebitda / receitaBruta) * 100 : 0,
    margemLiquida:      receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0,
    margemEbitda:       receitaBruta > 0 ? (ebitda / receitaBruta) * 100 : 0,
  }
}

export function gerarAlertas(kpis: KPIs): Alerta[] {
  const alertas: Alerta[] = []
  const id = () => Math.random().toString(36).slice(2)
  const now = new Date().toISOString()
  const fmt = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`

  const varDesp = kpis.despesaAnterior > 0
    ? ((kpis.despesasMes - kpis.despesaAnterior) / kpis.despesaAnterior) * 100 : 0
  const varMarg = kpis.receitaAnterior > 0
    ? (kpis.margemLiquida - ((kpis.lucroAnterior / kpis.receitaAnterior) * 100)) : 0

  if (varDesp > 15)
    alertas.push({ id: id(), tipo: 'danger', titulo: 'Despesas em alta',
      mensagem: `Despesas aumentaram ${varDesp.toFixed(0)}% vs mês anterior. Revise os gastos.`, createdAt: now })

  if (varMarg < -5)
    alertas.push({ id: id(), tipo: 'warning', titulo: 'Margem em queda',
      mensagem: `Margem líquida caiu ${Math.abs(varMarg).toFixed(1)}%. Revise a precificação.`, createdAt: now })

  if (kpis.saldoAtual > kpis.despesasMes * 1.5)
    alertas.push({ id: id(), tipo: 'success', titulo: 'Caixa saudável',
      mensagem: `Caixa cobre aproximadamente ${Math.floor(kpis.saldoAtual / (kpis.despesasMes / 30))} dias de operação.`, createdAt: now })

  if (kpis.receitaMes > kpis.pontoEquilibrio)
    alertas.push({ id: id(), tipo: 'success', titulo: 'Ponto de equilíbrio atingido',
      mensagem: `Receita de ${fmt(kpis.receitaMes)} superou o ponto de equilíbrio de ${fmt(kpis.pontoEquilibrio)}.`, createdAt: now })

  if (kpis.lucroLiquido < 0)
    alertas.push({ id: id(), tipo: 'danger', titulo: 'Resultado negativo',
      mensagem: `Empresa registrou prejuízo de ${fmt(Math.abs(kpis.lucroLiquido))} este mês.`, createdAt: now })

  return alertas
}

// ══════════════════════════════════════════════
// DOCUMENTOS
// ══════════════════════════════════════════════
export async function getDocumentos(tenantId: string): Promise<Documento[]> {
  const snap = await getDocs(
    query(collection(db, 'tenants', tenantId, 'documentos'), orderBy('uploadedAt', 'desc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Documento))
}

export async function addDocumento(tenantId: string, data: Omit<Documento, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'tenants', tenantId, 'documentos'), data)
  return ref.id
}

export async function updateDocumento(tenantId: string, id: string, data: Partial<Documento>): Promise<void> {
  await updateDoc(doc(db, 'tenants', tenantId, 'documentos', id), data)
}
