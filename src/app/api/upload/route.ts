import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { adminAuth, adminStorage, adminDb } from '@/lib/firebase-admin'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const decoded = await adminAuth.verifyIdToken(token)
    const tenantId = decoded.tenantId as string

    // 2. Receber arquivo
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext    = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const isImg  = ['png','jpg','jpeg','webp','gif'].includes(ext)
    const isPDF  = ext === 'pdf'

    // 3. Fazer upload para Firebase Storage
    const bucket   = adminStorage.bucket()
    const filePath = `tenants/${tenantId}/documentos/${Date.now()}_${file.name}`
    const fileRef  = bucket.file(filePath)
    await fileRef.save(buffer, { contentType: file.type })
    const [url] = await fileRef.getSignedUrl({ action: 'read', expires: '2099-01-01' })

    // 4. Salvar documento no Firestore
    const docRef = await adminDb
      .collection('tenants').doc(tenantId)
      .collection('documentos').add({
        tenantId,
        nome:       file.name,
        tipo:       isImg ? 'imagem' : isPDF ? 'pdf' : ext,
        url,
        tamanho:    file.size,
        status:     'processando',
        uploadedAt: new Date().toISOString(),
        uploadedBy: decoded.uid,
      })

    // 5. Analisar com Claude (imagens e PDFs curtos)
    let analise = null

    if (isImg || isPDF) {
      try {
        const base64   = buffer.toString('base64')
        const mimeType = file.type as 'image/png' | 'image/jpeg' | 'application/pdf'

        const aiResponse = await client.messages.create({
          model:      'claude-sonnet-4-6',
          max_tokens: 1500,
          messages: [{
            role:    'user',
            content: [
              {
                type:   'image',
                source: { type: 'base64', media_type: mimeType, data: base64 },
              },
              {
                type: 'text',
                text: `Analise este documento financeiro e extraia as informações em JSON:
{
  "resumo": "resumo em 2 frases do que é o documento",
  "periodo": "período identificado ex: Janeiro/2026",
  "totalReceitas": número ou null,
  "totalDespesas": número ou null,
  "lancamentosExtraidos": número de lançamentos identificados,
  "insights": ["insight 1", "insight 2", "insight 3"],
  "lancamentos": [
    {
      "data": "YYYY-MM-DD",
      "descricao": "...",
      "tipo": "receita" ou "despesa",
      "valor": número,
      "categoria": "categoria sugerida"
    }
  ]
}
Responda SOMENTE o JSON, sem texto adicional.`,
              },
            ],
          }],
        })

        const raw = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '{}'
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())

        analise = {
          ...parsed,
          analisadoEm: new Date().toISOString(),
        }

        // Salvar análise no Firestore
        await docRef.update({ status: 'analisado', analise })

        // Se extraiu lançamentos, importar automaticamente
        if (parsed.lancamentos?.length > 0) {
          const batch = adminDb.batch()
          for (const lanc of parsed.lancamentos.slice(0, 50)) {
            const lRef = adminDb
              .collection('tenants').doc(tenantId)
              .collection('lancamentos').doc()
            batch.set(lRef, {
              ...lanc,
              tenantId,
              regime:    'competencia',
              pago:      false,
              documentoId: docRef.id,
              createdAt:   new Date().toISOString(),
              createdBy:   decoded.uid,
            })
          }
          await batch.commit()
        }

      } catch (aiErr) {
        console.error('Erro na análise IA:', aiErr)
        await docRef.update({ status: 'analisado', analise: {
          resumo: 'Documento enviado e armazenado. Análise automática não disponível para este formato.',
          insights: [], analisadoEm: new Date().toISOString(),
        }})
      }
    } else {
      await docRef.update({ status: 'analisado', analise: {
        resumo: 'Arquivo recebido com sucesso.',
        insights: ['Importe manualmente os dados deste arquivo.'],
        analisadoEm: new Date().toISOString(),
      }})
    }

    return NextResponse.json({ success: true, documentoId: docRef.id, url, analise })

  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Erro no upload', details: err.message }, { status: 500 })
  }
}

export const maxDuration = 60
