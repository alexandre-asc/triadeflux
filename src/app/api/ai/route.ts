import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticação
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const tenantId = decoded.tenantId as string
    if (!tenantId) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 403 })

    const { message, history } = await req.json()

    // 2. Buscar dados reais do Firestore
    const hoje = new Date()
    const mes = hoje.getMonth() + 1
    const ano = hoje.getFullYear()

    const lancSnap = await adminDb
      .collection('tenants').doc(tenantId)
      .collection('lancamentos')
      .orderBy('data', 'desc').limit(200).get()

    const lancamentos = lancSnap.docs.map(d => d.data())

    // 3. Calcular indicadores
    const receitas = lancamentos.filter(l => l.tipo === 'receita')
    const despesas = lancamentos.filter(l => l.tipo === 'despesa')
    const receitaMes = receitas
      .filter(l => { const d = new Date(l.data); return d.getMonth()+1===mes && d.getFullYear()===ano })
      .reduce((s, l) => s + l.valor, 0)
    const despesaMes = despesas
      .filter(l => { const d = new Date(l.data); return d.getMonth()+1===mes && d.getFullYear()===ano })
      .reduce((s, l) => s + l.valor, 0)
    const lucroMes = receitaMes - despesaMes
    const margemLiquida = receitaMes > 0 ? ((lucroMes / receitaMes) * 100).toFixed(1) : '0'

    // Top categorias de despesa
    const catDespesa: Record<string, number> = {}
    despesas
      .filter(l => { const d = new Date(l.data); return d.getMonth()+1===mes && d.getFullYear()===ano })
      .forEach(l => { catDespesa[l.categoria] = (catDespesa[l.categoria] || 0) + l.valor })
    const topCats = Object.entries(catDespesa)
      .sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([cat, val]) => `${cat}: R$ ${val.toLocaleString('pt-BR')}`)

    const fmt = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

    // 4. Buscar dados da empresa
    const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get()
    const empresa = tenantDoc.data()?.name || 'sua empresa'

    // 5. System prompt com dados reais
    const systemPrompt = `Você é o CFO AI da plataforma Tríade Flux, um assistente financeiro especializado.
Você está analisando os dados reais de "${empresa}".

DADOS FINANCEIROS ATUAIS (${mes}/${ano}):
- Receita do mês: ${fmt(receitaMes)}
- Despesas do mês: ${fmt(despesaMes)}
- Lucro líquido: ${fmt(lucroMes)}
- Margem líquida: ${margemLiquida}%
- Total de lançamentos: ${lancamentos.length}

MAIORES DESPESAS POR CATEGORIA:
${topCats.join('\n') || 'Nenhuma despesa registrada ainda'}

REGRAS IMPORTANTES:
1. Responda SEMPRE em português brasileiro
2. Baseie suas respostas EXCLUSIVAMENTE nos dados acima
3. Se não houver dados suficientes para responder, diga claramente
4. Seja objetivo, prático e direto — como um CFO real
5. Não invente projeções sem base nos dados fornecidos
6. Quando sugerir ações, seja específico e realista
7. Use linguagem profissional mas acessível para empresários
8. Máximo de 3 parágrafos por resposta
9. Nunca invente números que não estejam nos dados acima`

    // 6. Chamar Claude
    const messages = [
      ...(history || []),
      { role: 'user' as const, content: message },
    ]

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 600,
      system:     systemPrompt,
      messages,
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ reply, usage: response.usage })

  } catch (err: any) {
    console.error('CFO AI error:', err)
    return NextResponse.json({ error: 'Erro no CFO AI', details: err.message }, { status: 500 })
  }
}
