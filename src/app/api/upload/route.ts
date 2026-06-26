import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const decoded = await adminAuth.verifyIdToken(token)
    const tenantId = decoded.tenantId as string
    if (!tenantId) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 403 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'

    const docRef = await adminDb
      .collection('tenants').doc(tenantId)
      .collection('documentos').add({
        tenantId,
        nome: file.name,
        tipo: ext,
        tamanho: file.size,
        status: 'analisado',
        analise: {
          resumo: 'Arquivo recebido com sucesso.',
          insights: ['Importe os dados manualmente ou ative o Storage para análise por IA.'],
          analisadoEm: new Date().toISOString(),
        },
        uploadedAt: new Date().toISOString(),
        uploadedBy: decoded.uid,
      })

    return NextResponse.json({ success: true, documentoId: docRef.id })

  } catch (err: any) {
    return NextResponse.json({ error: 'Erro no upload', details: err.message }, { status: 500 })
  }
}
