'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getLancamentos, calcularKPIs, calcularDRE, gerarAlertas } from '@/lib/firestore'
import type { Lancamento, KPIs, DRE, Alerta } from '@/types'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, DollarSign, Target, Activity,
  Bell, Upload, FileText, LogOut, LayoutDashboard, PenLine,
  FolderOpen, BarChart2, Waves, GitCompare, Bot, Menu, X,
  ChevronUp, ChevronDown, Send, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Formatters ──
const fmt  = (n: number) => `R$ ${Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtP = (n: number) => `${n.toFixed(1)}%`
const fmtK = (n: number) => n >= 1000 ? `R$${(n/1000).toFixed(0)}k` : `R$${n.toFixed(0)}`

// ── Cores Tríade Flux ──
const COLORS = ['#3a7bd5','#1a9a5c','#5c4db1','#f59e0b','#f87171','#5b9be8']

// ── Componentes base ──
function Card({ children, className = '', glow = false }: { children: React.ReactNode, className?: string, glow?: boolean }) {
  return (
    <div className={`rounded-[10px] ${className}`} style={{
      background: glow ? 'linear-gradient(135deg,#0b1020,#0e1a38)' : '#0b1020',
      border: `0.5px solid ${glow ? 'rgba(58,123,213,0.3)' : 'rgba(99,130,255,0.1)'}`,
    }}>
      {children}
    </div>
  )
}

function KPICard({ label, value, delta, deltaUp, icon: Icon, glow = false }: {
  label: string; value: string; delta?: string; deltaUp?: boolean; icon: any; glow?: boolean
}) {
  return (
    <Card glow={glow} className="p-4 cursor-pointer transition-all hover:-translate-y-0.5 group">
      <div className="flex items-center gap-1.5 mb-3" style={{ fontSize: 10, color: '#3d5280', letterSpacing: '0.4px' }}>
        <Icon size={12} />{label}
      </div>
      <div className="font-display font-semibold" style={{ fontSize: 20, letterSpacing: '-0.4px', color: '#dce8ff' }}>{value}</div>
      {delta && (
        <div className="flex items-center gap-1 mt-1" style={{ fontSize: 10, color: deltaUp ? '#1a9a5c' : '#f87171' }}>
          {deltaUp ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}{delta}
        </div>
      )}
    </Card>
  )
}

// ── Tooltip customizado ──
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#0e1530', border:'0.5px solid rgba(99,130,255,0.2)', borderRadius:8, padding:'8px 12px', fontSize:11 }}>
      <div style={{ color:'#7a93c8', marginBottom:4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, fontWeight: 500 }}>{p.name}: {fmtK(p.value)}</div>
      ))}
    </div>
  )
}

// ── Nav items ──
const NAV = [
  { id:'dashboard',    label:'Dashboard',     icon:LayoutDashboard },
  { id:'lancamentos',  label:'Lançamentos',   icon:PenLine },
  { id:'documentos',   label:'Documentos',    icon:FolderOpen,  badge:'IA' },
  { id:'dre',          label:'DRE Gerencial', icon:FileText },
  { id:'fluxo',        label:'Fluxo de Caixa',icon:Waves },
  { id:'comparativos', label:'Comparativos',  icon:GitCompare },
  { id:'ai',           label:'CFO AI',        icon:Bot },
  { id:'relatorios',   label:'Relatórios',    icon:BarChart2 },
]

export default function DashboardPage() {
  const { user, tenant, firebaseUser, loading, signOut, getToken } = useAuth()
  const router = useRouter()

  const [view,       setView]       = useState('dashboard')
  const [regime,     setRegime]     = useState<'competencia'|'caixa'>('competencia')
  const [sidebarOpen,setSidebar]    = useState(false)
  const [lancamentos,setLancamentos]= useState<Lancamento[]>([])
  const [kpis,       setKpis]       = useState<KPIs | null>(null)
  const [dre,        setDre]        = useState<DRE | null>(null)
  const [alertas,    setAlertas]    = useState<Alerta[]>([])
  const [dataLoading,setDataLoading]= useState(true)
  const [now,        setNow]        = useState(new Date())

  // Chat
  const [chatMsgs,   setChatMsgs]   = useState<{role:'user'|'ai', text:string}[]>([
    { role:'ai', text:'Olá! Sou o CFO AI da Tríade Flux. Tenho acesso completo aos seus dados financeiros. O que gostaria de analisar?' }
  ])
  const [chatInput,  setChatInput]  = useState('')
  const [chatLoading,setChatLoading]= useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  // Lançamento form
  const [lancForm, setLancForm] = useState({
    tipo:'receita' as 'receita'|'despesa', data: new Date().toISOString().split('T')[0],
    descricao:'', categoria:'Serviços', centroCusto:'Comercial', valor:'', pago:false
  })
  const [lancLoading, setLancLoading] = useState(false)

  // Redirect
  useEffect(() => {
    if (!loading && !firebaseUser) router.replace('/login')
  }, [loading, firebaseUser, router])

  // Relógio
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])

  // Carregar dados
  useEffect(() => {
    if (!tenant?.id) return
    loadData()
  }, [tenant?.id, regime])

  async function loadData() {
    if (!tenant?.id) return
    setDataLoading(true)
    try {
      const lancs = await getLancamentos(tenant.id)
      setLancamentos(lancs)
      const k = calcularKPIs(lancs, regime)
      setKpis(k)
      const hoje = new Date()
      const d = calcularDRE(lancs, hoje.getMonth()+1, hoje.getFullYear())
      setDre(d)
      setAlertas(gerarAlertas(k))
    } catch(e) {
      toast.error('Erro ao carregar dados')
    } finally {
      setDataLoading(false)
    }
  }

  // Dados para gráficos (últimos 6 meses)
  const chartData = (() => {
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const hoje = new Date()
    return Array.from({length:6}, (_,i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth()-5+i, 1)
      const m = d.getMonth()+1; const a = d.getFullYear()
      const rec = lancamentos.filter(l=>l.tipo==='receita'&&new Date(l.data).getMonth()+1===m&&new Date(l.data).getFullYear()===a).reduce((s,l)=>s+l.valor,0)
      const dep = lancamentos.filter(l=>l.tipo==='despesa'&&new Date(l.data).getMonth()+1===m&&new Date(l.data).getFullYear()===a).reduce((s,l)=>s+l.valor,0)
      return { mes:`${meses[m-1]}/${String(a).slice(2)}`, receita:rec, despesa:dep, lucro:rec-dep }
    })
  })()

  // Dados do donut
  const donutData = (() => {
    const cats: Record<string,number> = {}
    const hoje = new Date()
    lancamentos.filter(l=>l.tipo==='receita'&&new Date(l.data).getMonth()===hoje.getMonth()).forEach(l=>{cats[l.categoria]=(cats[l.categoria]||0)+l.valor})
    return Object.entries(cats).map(([name,value])=>({name,value}))
  })()

  // Chat IA
  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const msg = chatInput.trim()
    setChatInput('')
    setChatMsgs(p=>[...p,{role:'user',text:msg}])
    setChatLoading(true)
    try {
      const token = await getToken()
      const history = chatMsgs.slice(-6).map(m=>({role:m.role==='user'?'user':'assistant',content:m.text}))
      const res = await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({message:msg,history})})
      const data = await res.json()
      setChatMsgs(p=>[...p,{role:'ai',text:data.reply||'Não consegui processar sua pergunta.'}])
    } catch {
      setChatMsgs(p=>[...p,{role:'ai',text:'Erro ao conectar com o CFO AI. Tente novamente.'}])
    } finally {
      setChatLoading(false)
      setTimeout(()=>chatRef.current?.scrollTo({top:99999,behavior:'smooth'}),100)
    }
  }

  // Salvar lançamento
  async function salvarLancamento(e: React.FormEvent) {
    e.preventDefault()
    if (!tenant?.id||!user?.uid) return
    if (!lancForm.descricao||!lancForm.valor) { toast.error('Preencha todos os campos'); return }
    setLancLoading(true)
    try {
      const { addLancamento } = await import('@/lib/firestore')
      await addLancamento(tenant.id, {
        tipo: lancForm.tipo, data: lancForm.data, descricao: lancForm.descricao,
        categoria: lancForm.categoria, centroCusto: lancForm.centroCusto,
        valor: parseFloat(lancForm.valor), regime, pago: lancForm.pago, createdBy: user.uid,
      })
      toast.success(`${lancForm.tipo === 'receita' ? 'Receita' : 'Despesa'} registrada!`)
      setLancForm(f=>({...f,descricao:'',valor:''}))
      await loadData()
    } catch { toast.error('Erro ao salvar lançamento') }
    finally { setLancLoading(false) }
  }

  const now_bsb = now.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',second:'2-digit'})
  const date_bsb = now.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'short',year:'numeric'})

  if (loading || dataLoading) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{background:'#06091a'}}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={32} className="animate-spin" style={{color:'#3a7bd5'}}/>
        <div style={{fontSize:12,color:'#3d5280'}}>Carregando dados...</div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{background:'#06091a'}}>

      {/* ── SIDEBAR OVERLAY mobile ── */}
      {sidebarOpen && <div className="fixed inset-0 z-50 bg-black/70 lg:hidden" onClick={()=>setSidebar(false)}/>}

      {/* ── SIDEBAR ── */}
      <aside className={`fixed lg:relative z-50 lg:z-auto h-full flex flex-col transition-all duration-200
        ${sidebarOpen ? 'left-0' : '-left-[220px] lg:left-0'}`}
        style={{width:220,background:'#0b1020',borderRight:'0.5px solid rgba(99,130,255,0.1)',flexShrink:0}}>

        {/* Logo */}
        <div className="p-4 pb-3" style={{borderBottom:'0.5px solid rgba(99,130,255,0.1)'}}>
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" fill="none" width="28" height="28">
              <circle cx="16" cy="16" r="14.5" fill="rgba(58,123,213,0.1)" stroke="rgba(58,123,213,0.15)" strokeWidth="0.5"/>
              <path d="M16 4C9 4 4 9.5 4 16" stroke="#3a7bd5" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M4 16C4 23 9.5 28 16 28" stroke="#1a9a5c" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M16 28C23 28 28 22.5 28 16C28 9.5 22.5 4 16 4" stroke="#5c4db1" strokeWidth="2.2" strokeLinecap="round"/>
              <circle cx="16" cy="4"  r="2.2" fill="#3a7bd5"/>
              <circle cx="4"  cy="16" r="2.2" fill="#1a9a5c"/>
              <circle cx="16" cy="28" r="2.2" fill="#5c4db1"/>
              <circle cx="16" cy="16" r="3.5" fill="#090e22" stroke="rgba(58,123,213,0.4)" strokeWidth="0.8"/>
              <circle cx="16" cy="16" r="1.5" fill="#3a7bd5"/>
            </svg>
            <div>
              <div className="font-display font-bold text-white" style={{fontSize:14}}>Tríade <span style={{color:'#5b9be8'}}>Flux</span></div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5" style={{fontSize:10,color:'#3d5280'}}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"/>
            {tenant?.name || 'Empresa'}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 overflow-y-auto">
          <div style={{fontSize:9,color:'#3d5280',letterSpacing:'1px',padding:'8px 8px 3px',fontWeight:600,textTransform:'uppercase'}}>Principal</div>
          {NAV.slice(0,3).map(n=>(
            <button key={n.id} onClick={()=>{setView(n.id);setSidebar(false)}}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-left transition-all"
              style={{fontSize:12,color:view===n.id?'#5b9be8':'#7a93c8',background:view===n.id?'rgba(58,123,213,0.12)':'transparent',fontWeight:view===n.id?500:400}}>
              <n.icon size={14} style={{flexShrink:0}}/>{n.label}
              {n.badge && <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded" style={{background:'rgba(58,123,213,0.2)',color:'#5b9be8'}}>{n.badge}</span>}
            </button>
          ))}
          <div style={{fontSize:9,color:'#3d5280',letterSpacing:'1px',padding:'12px 8px 3px',fontWeight:600,textTransform:'uppercase'}}>Análises</div>
          {NAV.slice(3,6).map(n=>(
            <button key={n.id} onClick={()=>{setView(n.id);setSidebar(false)}}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-left transition-all"
              style={{fontSize:12,color:view===n.id?'#5b9be8':'#7a93c8',background:view===n.id?'rgba(58,123,213,0.12)':'transparent',fontWeight:view===n.id?500:400}}>
              <n.icon size={14}/>{n.label}
            </button>
          ))}
          <div style={{fontSize:9,color:'#3d5280',letterSpacing:'1px',padding:'12px 8px 3px',fontWeight:600,textTransform:'uppercase'}}>IA & Relatórios</div>
          {NAV.slice(6).map(n=>(
            <button key={n.id} onClick={()=>{setView(n.id);setSidebar(false)}}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-left transition-all"
              style={{fontSize:12,color:view===n.id?'#5b9be8':'#7a93c8',background:view===n.id?'rgba(58,123,213,0.12)':'transparent',fontWeight:view===n.id?500:400}}>
              <n.icon size={14}/>{n.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="p-3" style={{borderTop:'0.5px solid rgba(99,130,255,0.1)'}}>
          <div className="flex items-center gap-2 p-2 rounded-lg mb-2" style={{background:'rgba(255,255,255,0.02)'}}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{background:'linear-gradient(135deg,#3a7bd5,#5c4db1)',fontSize:11}}>
              {user?.name?.split(' ').map((n:string)=>n[0]).slice(0,2).join('')||'U'}
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:500,color:'#dce8ff'}}>{user?.name?.split(' ')[0]||'Usuário'}</div>
              <div style={{fontSize:10,color:'#3d5280'}}>Administrador</div>
            </div>
          </div>
          <button onClick={()=>signOut().then(()=>router.replace('/login'))}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg transition-all"
            style={{background:'rgba(248,113,113,0.08)',border:'0.5px solid rgba(248,113,113,0.2)',color:'#f87171',fontSize:11}}>
            <LogOut size={12}/>Sair
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* TOPBAR */}
        <header className="flex items-center gap-3 px-4 flex-shrink-0" style={{
          height:54,background:'rgba(11,16,32,0.95)',backdropFilter:'blur(12px)',
          borderBottom:'0.5px solid rgba(99,130,255,0.1)',
        }}>
          <button className="lg:hidden" onClick={()=>setSidebar(true)} style={{color:'#7a93c8'}}><Menu size={18}/></button>
          <div className="font-display font-semibold flex-1" style={{fontSize:15}}>
            {NAV.find(n=>n.id===view)?.label||'Dashboard'}
          </div>
          {/* Info pills */}
          <div className="hidden md:flex items-center gap-2">
            {[
              {label:date_bsb},
              {label:now_bsb, live:true},
            ].map((p,i)=>(
              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.1)',fontSize:10,color:'#7a93c8'}}>
                {p.live && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:'#1a9a5c',animation:'pulse2 2s infinite'}}/>}
                {p.label}
              </div>
            ))}
          </div>
          {/* Regime toggle */}
          <div className="flex p-0.5 rounded-lg gap-0.5" style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.1)'}}>
            {(['competencia','caixa'] as const).map(r=>(
              <button key={r} onClick={()=>setRegime(r)}
                className="px-2.5 py-1 rounded-md text-[11px] capitalize transition-all"
                style={{background:regime===r?'rgba(58,123,213,0.2)':'transparent',color:regime===r?'#5b9be8':'#3d5280',fontWeight:regime===r?500:400}}>
                {r==='competencia'?'Competência':'Caixa'}
              </button>
            ))}
          </div>
          <button className="relative" style={{color:'#7a93c8'}}>
            <Bell size={16}/>
            {alertas.some(a=>a.tipo==='danger') && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{background:'#f87171',border:'1.5px solid #06091a'}}/>}
          </button>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-5">

          {/* ══ VIEW: DASHBOARD ══ */}
          {view === 'dashboard' && kpis && (
            <div className="space-y-4">
              <div style={{fontSize:10,fontWeight:600,letterSpacing:'1.2px',textTransform:'uppercase',color:'#3d5280'}}>
                Indicadores Executivos · {now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <KPICard glow label="SALDO ATUAL"        value={fmt(kpis.saldoAtual)}    delta={`+12% vs mês ant.`} deltaUp icon={Wallet}/>
                <KPICard label="RECEITA DO MÊS"   value={fmt(kpis.receitaMes)}   delta={kpis.receitaAnterior>0?`${(((kpis.receitaMes-kpis.receitaAnterior)/kpis.receitaAnterior)*100).toFixed(1)}% vs ant.`:undefined} deltaUp={kpis.receitaMes>=kpis.receitaAnterior} icon={TrendingUp}/>
                <KPICard label="DESPESAS DO MÊS"  value={fmt(kpis.despesasMes)}  delta={kpis.despesaAnterior>0?`${(((kpis.despesasMes-kpis.despesaAnterior)/kpis.despesaAnterior)*100).toFixed(1)}% vs ant.`:undefined} deltaUp={kpis.despesasMes<=kpis.despesaAnterior} icon={TrendingDown}/>
                <KPICard label="LUCRO LÍQUIDO"    value={fmt(kpis.lucroLiquido)} delta={kpis.lucroAnterior>0?`${(((kpis.lucroLiquido-kpis.lucroAnterior)/kpis.lucroAnterior)*100).toFixed(1)}% vs ant.`:undefined} deltaUp={kpis.lucroLiquido>=kpis.lucroAnterior} icon={DollarSign}/>
                <KPICard label="EBITDA"           value={fmt(kpis.ebitda)}       delta={`${fmtP(kpis.ebitda/Math.max(kpis.receitaMes,1)*100)} da receita`} deltaUp icon={Activity}/>
                <KPICard label="MARGEM LÍQUIDA"   value={fmtP(kpis.margemLiquida)} delta={`Margem op. ${fmtP(kpis.margemOperacional)}`} deltaUp={kpis.margemLiquida>20} icon={Target}/>
                <KPICard label="PONTO EQUILÍBRIO" value={fmt(kpis.pontoEquilibrio)} delta={kpis.receitaMes>=kpis.pontoEquilibrio?'✓ Atingido':'Ainda não atingido'} deltaUp={kpis.receitaMes>=kpis.pontoEquilibrio} icon={Target}/>
                <KPICard label="GERAÇÃO DE CAIXA" value={fmt(kpis.geracaoCaixa)} delta="Caixa operacional" deltaUp={kpis.geracaoCaixa>0} icon={Waves}/>
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Evolução mensal */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div style={{fontSize:12,fontWeight:500,color:'#7a93c8'}}>Evolução Mensal</div>
                    <div className="flex gap-3">
                      {[{c:'#3a7bd5',l:'Receita'},{c:'#5c4db1',l:'Despesa'},{c:'#1a9a5c',l:'Lucro'}].map(x=>(
                        <div key={x.l} className="flex items-center gap-1" style={{fontSize:10,color:'#3d5280'}}>
                          <div style={{width:8,height:8,borderRadius:2,background:x.c}}/>{x.l}
                        </div>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                      <XAxis dataKey="mes" tick={{fontSize:10,fill:'#3d5280'}} axisLine={false} tickLine={false}/>
                      <YAxis tickFormatter={fmtK} tick={{fontSize:10,fill:'#3d5280'}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Bar dataKey="receita" name="Receita" fill="#3a7bd5" radius={[3,3,0,0]}/>
                      <Bar dataKey="despesa" name="Despesa" fill="#5c4db1" radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* DRE resumida */}
                {dre && (
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div style={{fontSize:12,fontWeight:500,color:'#7a93c8'}}>DRE · {now.toLocaleDateString('pt-BR',{month:'short',year:'numeric'})}</div>
                      <button onClick={()=>setView('dre')} style={{fontSize:11,color:'#3d5280'}}>Ver completo →</button>
                    </div>
                    {[
                      {k:'Receita Bruta',    v:dre.receitaBruta,    c:'#dce8ff'},
                      {k:'(–) Impostos',     v:-dre.impostos,       c:'#f87171'},
                      {k:'Receita Líquida',  v:dre.receitaLiquida,  c:'#5b9be8'},
                      {k:'(–) Custos',       v:-(dre.custosProdutos+dre.custosVariaveis), c:'#f87171'},
                      {k:'Lucro Bruto',      v:dre.lucroBruto,      c:'#1a9a5c'},
                      {k:'(–) Operacionais', v:-(dre.despPessoal+dre.despMarketing+dre.despAdministrativas), c:'#f87171'},
                      {k:'EBITDA',           v:dre.ebitda,          c:'#5b9be8'},
                    ].map((row,i)=>(
                      <div key={i} className="flex justify-between items-center py-1" style={{borderBottom:'0.5px solid rgba(255,255,255,0.03)',fontSize:11}}>
                        <span style={{color:'#7a93c8'}}>{row.k}</span>
                        <span style={{fontWeight:500,color:row.c}}>{row.v<0?'-':''}{fmt(Math.abs(row.v))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center mt-2 px-2 py-2 rounded-lg" style={{background:'rgba(58,123,213,0.08)',border:'0.5px solid rgba(58,123,213,0.2)'}}>
                      <span style={{fontWeight:600,color:'#dce8ff',fontSize:13}}>Lucro Líquido</span>
                      <span style={{fontWeight:700,color:'#1a9a5c',fontSize:15}}>{fmt(dre.lucroLiquido)}</span>
                    </div>
                  </Card>
                )}
              </div>

              {/* Bottom row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Alertas */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div style={{fontSize:12,fontWeight:500,color:'#7a93c8'}}>🔔 Alertas Inteligentes</div>
                    <span style={{fontSize:10,color:'#3d5280'}}>{alertas.length} ativos</span>
                  </div>
                  <div className="space-y-2">
                    {alertas.length === 0 && (
                      <div style={{fontSize:11,color:'#3d5280',textAlign:'center',padding:'1rem'}}>Nenhum alerta no momento</div>
                    )}
                    {alertas.map((al,i)=>{
                      const cfg = {danger:{bg:'rgba(248,113,113,0.08)',border:'rgba(248,113,113,0.2)',c:'#f87171',e:'⚠️'},warning:{bg:'rgba(245,158,11,0.08)',border:'rgba(245,158,11,0.2)',c:'#f59e0b',e:'📉'},success:{bg:'rgba(26,154,92,0.1)',border:'rgba(26,154,92,0.2)',c:'#1a9a5c',e:'✅'},info:{bg:'rgba(58,123,213,0.1)',border:'rgba(58,123,213,0.2)',c:'#5b9be8',e:'ℹ️'}}[al.tipo]
                      return (
                        <div key={i} className="flex gap-2 p-2 rounded-lg" style={{background:cfg.bg,border:`0.5px solid ${cfg.border}`}}>
                          <span style={{fontSize:12,flexShrink:0}}>{cfg.e}</span>
                          <div style={{fontSize:11,color:'#7a93c8',lineHeight:1.5}}><strong style={{color:cfg.c}}>{al.titulo}: </strong>{al.mensagem}</div>
                        </div>
                      )
                    })}
                  </div>
                </Card>

                {/* Categorias */}
                <Card className="p-4">
                  <div style={{fontSize:12,fontWeight:500,color:'#7a93c8',marginBottom:12}}>Despesas por Categoria</div>
                  {(() => {
                    const cats: Record<string,number> = {}
                    const hoje = new Date()
                    lancamentos.filter(l=>l.tipo==='despesa'&&new Date(l.data).getMonth()===hoje.getMonth()).forEach(l=>{cats[l.categoria]=(cats[l.categoria]||0)+l.valor})
                    const total = Object.values(cats).reduce((s,v)=>s+v,0)
                    return Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([cat,val],i)=>(
                      <div key={i} className="mb-2">
                        <div className="flex justify-between mb-1" style={{fontSize:10,color:'#7a93c8'}}>
                          <span>{cat}</span><span style={{color:'#3d5280'}}>{fmt(val)} · {total>0?((val/total)*100).toFixed(0):0}%</span>
                        </div>
                        <div style={{height:4,background:'rgba(255,255,255,0.05)',borderRadius:99,overflow:'hidden'}}>
                          <div style={{height:'100%',borderRadius:99,background:COLORS[i],width:`${total>0?(val/total)*100:0}%`,transition:'width 1s'}}/>
                        </div>
                      </div>
                    ))
                  })()}
                </Card>

                {/* Resumo executivo */}
                <Card className="p-4 flex flex-col gap-3">
                  <div style={{fontSize:12,fontWeight:500,color:'#7a93c8'}}>📋 Análise Executiva</div>
                  <p style={{fontSize:11,color:'#7a93c8',lineHeight:1.7}}>
                    {kpis.receitaMes > 0 ? (
                      <>Receita <strong style={{color:'#1a9a5c'}}>{fmt(kpis.receitaMes)}</strong> com margem líquida de <strong style={{color:'#5b9be8'}}>{fmtP(kpis.margemLiquida)}</strong>. {kpis.lucroLiquido > 0 ? `Resultado positivo de ${fmt(kpis.lucroLiquido)}.` : `Resultado negativo de ${fmt(kpis.lucroLiquido)}.`}</>
                    ) : 'Sem lançamentos no período. Cadastre receitas e despesas para ver a análise.'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button onClick={()=>toast.success('Exportando PDF...')} className="py-2 rounded-lg text-[11px] font-medium transition-all" style={{background:'rgba(58,123,213,0.1)',border:'0.5px solid rgba(58,123,213,0.2)',color:'#5b9be8'}}>📄 PDF</button>
                    <button onClick={()=>toast.success('Exportando Excel...')} className="py-2 rounded-lg text-[11px] font-medium transition-all" style={{background:'rgba(26,154,92,0.1)',border:'0.5px solid rgba(26,154,92,0.2)',color:'#1a9a5c'}}>📊 Excel</button>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ══ VIEW: LANÇAMENTOS ══ */}
          {view === 'lancamentos' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Form */}
                <Card className="p-4">
                  <div style={{fontSize:12,fontWeight:500,color:'#7a93c8',marginBottom:16}}>Novo Lançamento</div>
                  {/* Tipo toggle */}
                  <div className="flex gap-2 mb-4">
                    {(['receita','despesa'] as const).map(t=>(
                      <button key={t} onClick={()=>setLancForm(f=>({...f,tipo:t}))}
                        className="flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize"
                        style={{background:lancForm.tipo===t?(t==='receita'?'rgba(26,154,92,0.2)':'rgba(248,113,113,0.15)'):'rgba(255,255,255,0.04)',color:lancForm.tipo===t?(t==='receita'?'#1a9a5c':'#f87171'):'#3d5280',border:`0.5px solid ${lancForm.tipo===t?(t==='receita'?'rgba(26,154,92,0.3)':'rgba(248,113,113,0.25)'):'rgba(99,130,255,0.08)'}`}}>
                        {t==='receita'?'➕ Receita':'➖ Despesa'}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={salvarLancamento} className="space-y-3">
                    {[
                      {label:'Data',       key:'data',      type:'date'},
                      {label:'Descrição',  key:'descricao', type:'text',   ph:'Ex: Consultoria Cliente X'},
                      {label:'Valor (R$)', key:'valor',     type:'number', ph:'0,00'},
                    ].map(f=>(
                      <div key={f.key}>
                        <label style={{display:'block',fontSize:11,color:'#7a93c8',marginBottom:5}}>{f.label}</label>
                        <input type={f.type} placeholder={f.ph} required
                          value={(lancForm as any)[f.key]}
                          onChange={e=>setLancForm(p=>({...p,[f.key]:e.target.value}))}
                          className="w-full px-3 py-2 rounded-lg outline-none transition-all"
                          style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.15)',color:'#dce8ff',fontSize:12}}/>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label style={{display:'block',fontSize:11,color:'#7a93c8',marginBottom:5}}>Categoria</label>
                        <select value={lancForm.categoria} onChange={e=>setLancForm(p=>({...p,categoria:e.target.value}))}
                          className="w-full px-3 py-2 rounded-lg outline-none"
                          style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.15)',color:'#dce8ff',fontSize:12}}>
                          {lancForm.tipo==='receita'
                            ?['Serviços','Produtos','Consultoria','Recorrente','Comissões','Outros'].map(c=><option key={c}>{c}</option>)
                            :['Pessoal','Marketing','Operacional','Financeiro','Impostos','TI','Administrativo','Outros'].map(c=><option key={c}>{c}</option>)
                          }
                        </select>
                      </div>
                      <div>
                        <label style={{display:'block',fontSize:11,color:'#7a93c8',marginBottom:5}}>Centro de Custo</label>
                        <select value={lancForm.centroCusto} onChange={e=>setLancForm(p=>({...p,centroCusto:e.target.value}))}
                          className="w-full px-3 py-2 rounded-lg outline-none"
                          style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.15)',color:'#dce8ff',fontSize:12}}>
                          {['Comercial','Marketing','RH','TI','Operações','Financeiro','Administrativo'].map(c=><option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="pago" checked={lancForm.pago} onChange={e=>setLancForm(p=>({...p,pago:e.target.checked}))} style={{accentColor:'#3a7bd5'}}/>
                      <label htmlFor="pago" style={{fontSize:11,color:'#7a93c8'}}>{lancForm.tipo==='receita'?'Já recebido':'Já pago'}</label>
                    </div>
                    <button type="submit" disabled={lancLoading}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                      style={{background:'linear-gradient(135deg,#3a7bd5,#5c4db1)',boxShadow:'0 4px 16px rgba(58,123,213,0.3)',opacity:lancLoading?0.7:1}}>
                      {lancLoading?'Salvando...':'Registrar Lançamento'}
                    </button>
                  </form>
                </Card>

                {/* Lista recentes */}
                <Card className="p-4">
                  <div style={{fontSize:12,fontWeight:500,color:'#7a93c8',marginBottom:12}}>Últimos Lançamentos</div>
                  <div className="space-y-1 overflow-y-auto" style={{maxHeight:420}}>
                    {lancamentos.slice(0,20).map((l,i)=>(
                      <div key={i} className="flex items-center gap-3 px-2 py-2 rounded-lg" style={{borderBottom:'0.5px solid rgba(255,255,255,0.03)'}}>
                        <span style={{fontSize:14}}>{l.tipo==='receita'?'↑':'↓'}</span>
                        <div className="flex-1 min-w-0">
                          <div style={{fontSize:11,fontWeight:500,color:'#dce8ff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.descricao}</div>
                          <div style={{fontSize:10,color:'#3d5280'}}>{l.categoria} · {new Date(l.data).toLocaleDateString('pt-BR')}</div>
                        </div>
                        <div style={{fontSize:12,fontWeight:600,color:l.tipo==='receita'?'#1a9a5c':'#f87171',flexShrink:0}}>
                          {l.tipo==='receita'?'+':'-'}{fmt(l.valor)}
                        </div>
                      </div>
                    ))}
                    {lancamentos.length === 0 && (
                      <div style={{textAlign:'center',padding:'2rem',fontSize:12,color:'#3d5280'}}>Nenhum lançamento ainda. Cadastre o primeiro!</div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ══ VIEW: CFO AI ══ */}
          {view === 'ai' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{height:'calc(100vh - 130px)'}}>
              <div className="lg:col-span-2 flex flex-col" style={{height:'100%'}}>
                <Card className="flex flex-col flex-1 p-4 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-3 pb-3 mb-3" style={{borderBottom:'0.5px solid rgba(99,130,255,0.1)'}}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#3a7bd5,#5c4db1)'}}>
                      <Bot size={16} color="white"/>
                    </div>
                    <div>
                      <div style={{fontSize:13,fontWeight:500}}>CFO AI · Tríade Flux</div>
                      <div style={{fontSize:10,color:'#3d5280'}}>Acesso total aos dados reais de {tenant?.name}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5" style={{fontSize:10,color:'#1a9a5c'}}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{background:'#1a9a5c',animation:'pulse2 2s infinite'}}/>Online
                    </div>
                  </div>
                  {/* Mensagens */}
                  <div ref={chatRef} className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1" style={{minHeight:0}}>
                    {chatMsgs.map((m,i)=>(
                      <div key={i} className={`flex ${m.role==='user'?'justify-end':''}`}>
                        <div className="px-3 py-2 rounded-xl" style={{
                          maxWidth:'88%', fontSize:12, lineHeight:1.65,
                          background: m.role==='user'?'rgba(58,123,213,0.15)':'#111938',
                          border: `0.5px solid ${m.role==='user'?'rgba(58,123,213,0.25)':'rgba(99,130,255,0.1)'}`,
                          color: m.role==='user'?'#93c5fd':'#7a93c8',
                        }} dangerouslySetInnerHTML={{__html:m.text.replace(/\*\*(.*?)\*\*/g,'<strong style="color:#dce8ff;font-weight:500">$1</strong>')}}/>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex"><div className="px-3 py-2 rounded-xl" style={{background:'#111938',border:'0.5px solid rgba(99,130,255,0.1)',fontSize:12,color:'#3d5280',fontStyle:'italic'}}>Analisando seus dados...</div></div>
                    )}
                  </div>
                  {/* Sugestões */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {['Como está minha empresa?','Onde gasto mais?','Como melhorar minha margem?','Projeção para o próximo mês'].map(s=>(
                      <button key={s} onClick={()=>{setChatInput(s);}} className="px-2.5 py-1 rounded-full transition-all" style={{fontSize:10,color:'#3d5280',background:'#111938',border:'0.5px solid rgba(99,130,255,0.1)'}}>
                        {s}
                      </button>
                    ))}
                  </div>
                  {/* Input */}
                  <div className="flex gap-2">
                    <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()}
                      placeholder="Pergunte sobre suas finanças..." className="flex-1 px-3 py-2 rounded-lg outline-none text-xs"
                      style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.15)',color:'#dce8ff'}}/>
                    <button onClick={sendChat} disabled={chatLoading}
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{background:'linear-gradient(135deg,#3a7bd5,#5c4db1)',border:'none',cursor:'pointer'}}>
                      <Send size={14} color="white"/>
                    </button>
                  </div>
                </Card>
              </div>
              {/* Info sidebar */}
              <div className="space-y-3">
                <Card className="p-4">
                  <div style={{fontSize:11,color:'#3d5280',marginBottom:10,fontWeight:500}}>📌 Dados disponíveis</div>
                  {[
                    {k:'Lançamentos',v:`${lancamentos.length} registros`},
                    {k:'Período',v:'Todos os meses'},
                    {k:'Empresa',v:tenant?.name||'-'},
                    {k:'Regime',v:regime==='competencia'?'Competência':'Caixa'},
                  ].map((r,i)=>(
                    <div key={i} className="flex justify-between py-1.5" style={{borderBottom:'0.5px solid rgba(255,255,255,0.03)',fontSize:11}}>
                      <span style={{color:'#7a93c8'}}>{r.k}</span>
                      <span style={{color:'#1a9a5c',fontWeight:500}}>{r.v}</span>
                    </div>
                  ))}
                </Card>
                <Card className="p-4">
                  <div style={{fontSize:11,color:'#3d5280',marginBottom:10,fontWeight:500}}>⚠️ Sobre o CFO AI</div>
                  <p style={{fontSize:11,color:'#3d5280',lineHeight:1.65}}>Responde baseado exclusivamente nos dados cadastrados. Não inventa informações nem faz previsões sem base histórica.</p>
                </Card>
              </div>
            </div>
          )}

          {/* ══ VIEW: DOCUMENTOS ══ */}
          {view === 'documentos' && (
            <div style={{textAlign:'center',padding:'4rem',color:'#3d5280'}}>
              <FolderOpen size={40} style={{margin:'0 auto 1rem',opacity:0.4}}/>
              <div style={{fontSize:14,fontWeight:500,marginBottom:8}}>Módulo de Documentos</div>
              <div style={{fontSize:12}}>Upload de PDF, imagens e planilhas com análise por IA.<br/>Conecte o Firebase Storage para ativar este módulo.</div>
            </div>
          )}

          {/* ══ OUTROS VIEWS (placeholder) ══ */}
          {['dre','fluxo','comparativos','relatorios'].includes(view) && (
            <div style={{textAlign:'center',padding:'4rem',color:'#3d5280'}}>
              <div style={{fontSize:32,marginBottom:'1rem'}}>{view==='dre'?'📋':view==='fluxo'?'🌊':view==='comparativos'?'📈':'📄'}</div>
              <div style={{fontSize:14,fontWeight:500,color:'#7a93c8',marginBottom:8}}>
                {NAV.find(n=>n.id===view)?.label}
              </div>
              <div style={{fontSize:12}}>Módulo em construção. Dados disponíveis assim que os lançamentos forem cadastrados.</div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
