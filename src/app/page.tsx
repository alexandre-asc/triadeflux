'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import SplashScreen from '@/components/ui/SplashScreen'

export default function Home() {
  const { firebaseUser, isMaster, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!firebaseUser) { router.replace('/login'); return }
    if (isMaster) { router.replace('/master'); return }
    router.replace('/dashboard')
  }, [firebaseUser, isMaster, loading, router])

  return <SplashScreen />
}
