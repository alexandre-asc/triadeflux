import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar se quem chamou é o master
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const masterDoc = await adminDb.collection('users').doc(decoded.uid).get()

    if (!masterDoc.exists || masterDoc.data()?.role !== 'master') {
      return NextResponse.json({ error: 'Apenas o master pode criar clientes' }, { status: 403 })
    }

    // 2. Receber dados do cliente
    const body = await req.json()
    const { name, ownerName, email, password, cpfCnpj, phone, city, plan, mrr, startDate, dueDate, status, notes } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Preencha empresa, e-mail e senha' }, { status: 400 })
    }

    // 3. Criar usuário no Auth (server-side, não afeta sessão do master)
    let userRecord
    try {
      userRecord = await adminAuth.createUser({ email, password, displayName: ownerName || name })
    } catch (e: any) {
      if (e.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 400 })
      }
      throw e
    }

    // 4. Criar tenant no Firestore
    const tenantRef = await adminDb.collection('tenants').add({
      name, ownerName: ownerName || '', email, cpfCnpj: cpfCnpj || '',
      phone: phone || '', city: city || '', plan: plan || 'starter',
      mrr: mrr || 297, startDate, dueDate, status: status || 'ativo',
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // 5. Criar perfil do usuário vinculado ao tenant
    await adminDb.collection('users').doc(userRecord.uid).set({
      email,
      name: ownerName || name,
      role: 'admin',
      tenantId: tenantRef.id,
      createdAt: new Date().toISOString(),
    })

    // 6. Definir custom claim com tenantId (para o upload/AI funcionarem)
    await adminAuth.setCustomUserClaims(userRecord.uid, { tenantId: tenantRef.id, role: 'admin' })

    return NextResponse.json({ success: true, tenantId: tenantRef.id, uid: userRecord.uid })

  } catch (err: any) {
    console.error('Erro ao criar tenant:', err)
    return NextResponse.json({ error: err.message || 'Erro ao criar cliente' }, { status: 500 })
  }
}
