import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { adminAuth, adminStorage, adminDb } from '@/lib/firebase-admin'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const decoded = await adminAuth.verifyIdToken(token)
    const tenantId = decoded.tenantId as string

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext    = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const isImg  = ['png','jpg','jpeg','webp'].includes(ext)

    const docRef = await adminDb
      .collection('tenants').doc(tenantId)
      .collection('documentos').add({
        tenantId,
        nome:       file.name,
        tipo:       isImg ? 'imagem' : ext,
        tamanho:    file.size,
        status:     'analisado',
        analise: { resumo: 'Arquivo recebido.', insights: [], analisadoEm: new Date().toISOString() },
        uploadedAt: new Date().toISOString(),
        uploadedBy: decoded.uid,
      })

    return NextResponse.json({ success: true, documentoId: docRef.id })

  } catch (err: any) {
    return NextResponse.json({ error: 'Erro no upload', details: err.message }, { status: 500 })
  }
}
