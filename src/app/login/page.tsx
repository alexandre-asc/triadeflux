'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import SplashScreen from '@/components/ui/SplashScreen'
import { Eye, EyeOff, LogIn, Mail, Lock, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { signIn, resetPassword, firebaseUser, isMaster, loading, error } = useAuth()
  const router = useRouter()

  const [splashDone, setSplashDone]   = useState(false)
  const [email,      setEmail]        = useState('')
  const [password,   setPassword]     = useState('')
  const [showPass,   setShowPass]     = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [resetMode,  setResetMode]    = useState(false)

  // Após login, redirecionar
  useEffect(() => {
    if (!loading && firebaseUser) {
      router.replace(isMaster ? '/master' : '/dashboard')
    }
  }, [firebaseUser, isMaster, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Preencha e-mail e senha.'); return }
    setSubmitting(true)
    try {
      await signIn(email, password)
    } catch {
      // Erro já está no state
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { toast.error('Digite seu e-mail primeiro.'); return }
    setSubmitting(true)
    try {
      await resetPassword(email)
      toast.success('Link de recuperação enviado! Verifique seu e-mail.')
      setResetMode(false)
    } catch {
      toast.error('Erro ao enviar e-mail. Verifique o endereço.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: `
        radial-gradient(ellipse 80% 60% at 50% -20%, rgba(27,92,184,0.2) 0%, transparent 70%),
        radial-gradient(ellipse 60% 40% at 80% 80%, rgba(74,45,143,0.14) 0%, transparent 60%),
        radial-gradient(ellipse 50% 40% at 20% 80%, rgba(26,122,74,0.1) 0%, transparent 60%),
        #06091a`
    }}>
      <div className="w-full max-w-[400px]">

        {/* Logo + Nome */}
        <div className="flex flex-col items-center mb-10 gap-4">
          {/* Símbolo SVG */}
          <svg viewBox="0 0 64 64" fill="none" width="72" height="72">
            <circle cx="32" cy="32" r="30" fill="rgba(58,123,213,0.07)" stroke="rgba(58,123,213,0.15)" strokeWidth="0.5"/>
            <path d="M32 8C18 8 8 19 8 32" stroke="#3a7bd5" strokeWidth="3.5" strokeLinecap="round"/>
            <path d="M8 32C8 45 18 56 32 56" stroke="#1a9a5c" strokeWidth="3.5" strokeLinecap="round"/>
            <path d="M32 56C46 56 56 45 56 32C56 19 46 8 32 8" stroke="#5c4db1" strokeWidth="3.5" strokeLinecap="round"/>
            <circle cx="32" cy="8"  r="4" fill="#3a7bd5"/>
            <circle cx="8"  cy="32" r="4" fill="#1a9a5c"/>
            <circle cx="32" cy="56" r="4" fill="#5c4db1"/>
            <circle cx="32" cy="32" r="7" fill="#090e22" stroke="rgba(58,123,213,0.4)" strokeWidth="1.5"/>
            <circle cx="32" cy="32" r="3.2" fill="#3a7bd5" opacity="0.9"/>
            <circle cx="32" cy="32" r="1.4" fill="white" opacity="0.95"/>
          </svg>
          <div className="text-center">
            <div className="font-display text-2xl font-bold text-white tracking-tight">
              Tríade <span style={{color:'#5b9be8'}}>Flux</span>
            </div>
            <div className="text-[11px] mt-1 uppercase tracking-widest" style={{color:'#3d5280'}}>
              CFO Digital com Inteligência Artificial
            </div>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#0b1020',
          border: '0.5px solid rgba(99,130,255,0.2)',
          borderRadius: 18,
          padding: '2rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(79,124,255,0.1) inset',
        }}>
          <div className="font-display text-lg font-semibold mb-1">
            {resetMode ? 'Recuperar acesso' : 'Acesse sua conta'}
          </div>
          <div className="text-xs mb-6" style={{color:'#3d5280'}}>
            {resetMode
              ? 'Digite seu e-mail para receber o link de recuperação'
              : 'Entre com suas credenciais para continuar'}
          </div>

          <form onSubmit={resetMode ? handleReset : handleSubmit} className="space-y-4">
            {/* E-mail */}
            <div>
              <label className="block text-[11px] mb-1.5" style={{color:'#7a93c8'}}>E-mail</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'#3d5280'}}/>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" required autoComplete="email"
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-[8px] outline-none transition-all"
                  style={{
                    background:'#0c1228', border:'0.5px solid rgba(99,130,255,0.15)',
                    color:'#dce8ff', fontSize:13,
                  }}
                  onFocus={e  => e.target.style.borderColor = '#3a7bd5'}
                  onBlur={e   => e.target.style.borderColor = 'rgba(99,130,255,0.15)'}
                />
              </div>
            </div>

            {/* Senha */}
            {!resetMode && (
              <div>
                <label className="block text-[11px] mb-1.5" style={{color:'#7a93c8'}}>Senha</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'#3d5280'}}/>
                  <input
                    type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-[8px] outline-none transition-all"
                    style={{
                      background:'#0c1228', border:'0.5px solid rgba(99,130,255,0.15)',
                      color:'#dce8ff', fontSize:13,
                    }}
                    onFocus={e => e.target.style.borderColor = '#3a7bd5'}
                    onBlur={e  => e.target.style.borderColor = 'rgba(99,130,255,0.15)'}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:'#3d5280'}}>
                    {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{
                background:'rgba(248,113,113,0.08)', border:'0.5px solid rgba(248,113,113,0.25)', color:'#f87171'
              }}>{error}</div>
            )}

            {/* Botão */}
            <button type="submit" disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 font-semibold text-sm rounded-[8px] text-white transition-all mt-2"
              style={{
                background: 'linear-gradient(135deg, #3a7bd5, #5c4db1)',
                boxShadow: '0 4px 20px rgba(58,123,213,0.3)',
                opacity: submitting ? 0.7 : 1,
              }}>
              {submitting
                ? <span className="animate-pulse">Aguarde...</span>
                : resetMode
                  ? <><RotateCcw size={14}/>Enviar link</>
                  : <><LogIn size={14}/>Entrar no sistema</>}
            </button>
          </form>

          <div className="text-center mt-4">
            <button onClick={() => setResetMode(!resetMode)} className="text-xs transition-colors"
              style={{color:'#3d5280'}}>
              {resetMode ? '← Voltar ao login' : 'Esqueceu a senha? Recuperar acesso'}
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="text-center mt-6 text-[10px]" style={{color:'#3d5280'}}>
          Desenvolvido por{' '}
          <strong style={{color:'#7a93c8'}}>Alexandre Amorim</strong>
          {' '}<span style={{color:'#1e2d50'}}>|</span>{' '}
          <strong style={{color:'#5b9be8'}}>Tríade Resultados</strong>
        </div>
      </div>
    </div>
  )
}
