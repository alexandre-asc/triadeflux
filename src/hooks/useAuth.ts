'use client'
import { useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { User, Tenant } from '@/types'

interface AuthState {
  firebaseUser: FirebaseUser | null
  user:         User | null
  tenant:       Tenant | null
  isMaster:     boolean
  loading:      boolean
  error:        string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null, user: null, tenant: null,
    isMaster: false, loading: true, error: null,
  })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setState({ firebaseUser: null, user: null, tenant: null, isMaster: false, loading: false, error: null })
        return
      }
      try {
        // Buscar perfil do usuário
        const userSnap = await getDoc(doc(db, 'users', fbUser.uid))
        if (!userSnap.exists()) {
          setState(s => ({ ...s, firebaseUser: fbUser, loading: false, error: 'Usuário não encontrado' }))
          return
        }
        const userData = { id: fbUser.uid, ...userSnap.data() } as User
        const isMaster = userData.role === 'master' || fbUser.email === process.env.NEXT_PUBLIC_MASTER_EMAIL

        let tenant: Tenant | null = null
        if (!isMaster && userData.tenantId) {
          const tenantSnap = await getDoc(doc(db, 'tenants', userData.tenantId))
          if (tenantSnap.exists()) {
            tenant = { id: tenantSnap.id, ...tenantSnap.data() } as Tenant
            // Verificar se tenant está bloqueado
            if (tenant.status === 'bloqueado') {
              await firebaseSignOut(auth)
              setState(s => ({ ...s, loading: false, error: 'Conta bloqueada. Entre em contato com o suporte.' }))
              return
            }
          }
        }

        setState({ firebaseUser: fbUser, user: userData, tenant, isMaster, loading: false, error: null })
      } catch (err: any) {
        setState(s => ({ ...s, loading: false, error: err.message }))
      }
    })
    return unsub
  }, [])

  const signIn = async (email: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/invalid-credential':      'E-mail ou senha incorretos.',
        'auth/user-not-found':          'Usuário não encontrado.',
        'auth/wrong-password':          'Senha incorreta.',
        'auth/too-many-requests':       'Muitas tentativas. Aguarde alguns minutos.',
        'auth/user-disabled':           'Conta desativada.',
      }
      setState(s => ({ ...s, loading: false, error: msgs[err.code] || 'Erro ao entrar. Tente novamente.' }))
      throw err
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  const getToken = async (): Promise<string | null> => {
    return state.firebaseUser ? state.firebaseUser.getIdToken() : null
  }

  return { ...state, signIn, signOut, resetPassword, getToken }
}
