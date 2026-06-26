'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getTenants, createTenant, updateTenant, deleteTenant } from '@/lib/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { Tenant } from '@/types'
import { Users, TrendingUp, DollarSign, AlertTriangle, Plus, Search, LogOut, Edit2, Lock, Unlock, Trash2, Eye, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const fmt = (n: number) => `R$ ${n.toLocaleString('pt-BR',{minimumFractionDigits:0})}`
const PLANOS = { starter:{nome:'Starter',preco:297}, professional:{nome:'Professional',preco:597}, enterprise:{nome:'Enterprise',preco:997} }

function diffDays(date: string) {
  return Math.floor((new Date(date).getTime() - Date.now()) / (1000*60*60*24))
}

function StatusPill({ status }: { status: Tenant['status'] }) {
  const cfg = { ativo:{bg:'rgba(26,154,92,0.1)',c:'#1a9a5c',b:'rgba(26,154,92,0.25)',l:'● Ativo'}, trial:{bg:'rgba(245,158,11,0.1)',c:'#f59e0b',b:'rgba(245,158,11,0.25)',l:'◈ Trial'}, bloqueado:{bg:'rgba(248,113,113,0.1)',c:'#f87171',b:'rgba(248,113,113,0.25)',l:'✕ Bloqueado'}, cancelado:{bg:'rgba(99,99,99,0.1)',c:'#666',b:'rgba(99,99,99,0.25)',l:'○ Cancelado'} }[status]
  return <span style={{padding:'3px 10px',borderRadius:99,fontSize:10,fontWeight:600,background:cfg.bg,color:cfg.c,border:`0.5px solid ${cfg.b}`}}>{cfg.l}</span>
}

const EMPTY_FORM = { name:'', ownerName:'', email:'', password:'', cpfCnpj:'', phone:'', city:'', plan:'starter' as Tenant['plan'], mrr:297, startDate: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now()+30*24*60*60*1000).toISOString().split('T')[0], status:'ativo' as Tenant['status'], notes:'' }

export default function MasterPage() {
  const { user, isMaster, loading, signOut, getToken } = useAuth()
  const router = useRouter()

  const [tenants,    setTenants]    = useState<Tenant[]>([])
  const [filtered,   setFiltered]   = useState<Tenant[]>([])
  const [search,     setSearch]     = useState('')
  const [dataLoading,setDataLoading]= useState(true)
  const [modal,      setModal]      = useState(false)
  const [editId,     setEditId]     = useState<string|null>(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [tab,        setTab]        = useState<'clientes'|'metricas'|'logs'>('clientes')

  useEffect(() => { if (!loading && !isMaster) router.replace('/login') }, [loading, isMaster, router])

  useEffect(() => { if (isMaster) load() }, [isMaster])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(q ? tenants.filter(t => t.name.toLowerCase().includes(q) || t.ownerName?.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)) : tenants)
  }, [search, tenants])

  async function load() {
    setDataLoading(true)
    try { const t = await getTenants(); setTenants(t); setFiltered(t) }
    catch { toast.error('Erro ao carregar clientes') }
    finally { setDataLoading(false) }
  }

  async function save() {
    if (!form.name||!form.email||(!editId&&!form.password)) { toast.error('Preencha todos os campos obrigatórios'); return }
    setSaving(true)
    try {
      if (editId) {
        await updateTenant(editId, { name: form.name, ownerName: form.ownerName, email: form.email, cpfCnpj: form.cpfCnpj, phone: form.phone, city: form.city, plan: form.plan, mrr: form.mrr, startDate: form.startDate, dueDate: form.dueDate, status: form.status, notes: form.notes })
        toast.success('Cliente atualizado!')
      } else {
        // Criar cliente via API do servidor (não desloga o master)
        const token = await getToken()
        const res = await fetch('/api/tenants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Erro ao cadastrar'); setSaving(false); return }
        toast.success('Cliente cadastrado com sucesso!')
      }
      setModal(false); setForm(EMPTY_FORM); setEditId(null); await load()
    } catch(e: any) {
      toast.error(e.code === 'auth/email-already-in-use' ? 'Este e-mail já está cadastrado.' : e.message)
    } finally { setSaving(false) }
  }

  async function toggleBlock(t: Tenant) {
    const next = t.status === 'bloqueado' ? 'ativo' : 'bloqueado'
    await updateTenant(t.id, { status: next })
    toast.success(next === 'bloqueado' ? '🔒 Cliente bloqueado' : '✅ Cliente ativado')
    await load()
  }

  async function del(t: Tenant) {
    if (!confirm(`Excluir ${t.name}? Esta ação não pode ser desfeita.`)) return
    await deleteTenant(t.id); toast.success('Cliente removido'); await load()
  }

  function openEdit(t: Tenant) {
    setForm({...EMPTY_FORM, ...t, password:''}); setEditId(t.id); setModal(true)
  }

  // KPIs do master
  const mrr     = tenants.filter(t=>t.status==='ativo'||t.status==='trial').reduce((s,t)=>s+t.mrr,0)
  const ativos   = tenants.filter(t=>t.status==='ativo').length
  const vencendo = tenants.filter(t=>{ const d=diffDays(t.dueDate); return d>=0&&d<=7 }).length

  if (loading||dataLoading) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{background:'#06091a'}}>
      <Loader2 size={28} className="animate-spin" style={{color:'#3a7bd5'}}/>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'#06091a'}}>
      {/* TOPBAR */}
      <header className="flex items-center gap-3 px-5 sticky top-0 z-40" style={{height:54,background:'rgba(11,16,32,0.95)',backdropFilter:'blur(12px)',borderBottom:'0.5px solid rgba(99,130,255,0.1)'}}>
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" fill="none" width="26" height="26">
            <circle cx="16" cy="16" r="14.5" fill="rgba(58,123,213,0.1)" stroke="rgba(58,123,213,0.15)" strokeWidth="0.5"/>
            <path d="M16 4C9 4 4 9.5 4 16" stroke="#3a7bd5" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M4 16C4 23 9.5 28 16 28" stroke="#1a9a5c" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M16 28C23 28 28 22.5 28 16C28 9.5 22.5 4 16 4" stroke="#5c4db1" strokeWidth="2.2" strokeLinecap="round"/>
            <circle cx="16" cy="16" r="3.5" fill="#090e22" stroke="rgba(58,123,213,0.4)" strokeWidth="0.8"/>
            <circle cx="16" cy="16" r="1.5" fill="#3a7bd5"/>
          </svg>
          <span className="font-display font-bold text-white" style={{fontSize:14}}>Tríade <span style={{color:'#5b9be8'}}>Flux</span></span>
        </div>
        <span style={{padding:'3px 11px',borderRadius:99,fontSize:10,color:'#f59e0b',background:'rgba(245,158,11,0.1)',border:'0.5px solid rgba(245,158,11,0.25)',fontWeight:600}}>👑 MASTER</span>
        {/* Nav */}
        <div className="flex gap-1 ml-4">
          {(['clientes','metricas','logs'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} className="px-3 py-1.5 rounded-lg text-xs capitalize transition-all"
              style={{background:tab===t?'rgba(58,123,213,0.15)':'transparent',color:tab===t?'#5b9be8':'#3d5280',border:`0.5px solid ${tab===t?'rgba(58,123,213,0.3)':'transparent'}`}}>
              {t==='clientes'?'Clientes':t==='metricas'?'Métricas SaaS':'Logs'}
            </button>
          ))}
        </div>
        <button onClick={()=>signOut().then(()=>router.replace('/login'))} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all" style={{background:'rgba(248,113,113,0.08)',color:'#f87171',fontSize:11,border:'0.5px solid rgba(248,113,113,0.2)'}}>
          <LogOut size={12}/>Sair
        </button>
      </header>

      <div className="p-5 max-w-[1400px] mx-auto">
        {/* KPIs master */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            {icon:Users,     label:'Total Clientes', value:String(tenants.length), sub:'+2 este mês'},
            {icon:TrendingUp,label:'Ativos',          value:String(ativos),         sub:`${tenants.length>0?((ativos/tenants.length)*100).toFixed(0):0}% da base`},
            {icon:DollarSign,label:'MRR',             value:fmt(mrr),               sub:'Receita mensal'},
            {icon:AlertTriangle,label:'Vencem em 7d', value:String(vencendo),       sub:'Requer atenção'},
          ].map((k,i)=>(
            <div key={i} className="p-4 rounded-[10px]" style={{background:'#0b1020',border:'0.5px solid rgba(99,130,255,0.1)'}}>
              <div className="flex items-center gap-1.5 mb-2" style={{fontSize:10,color:'#3d5280'}}><k.icon size={12}/>{k.label}</div>
              <div className="font-display font-semibold" style={{fontSize:22,color:'#dce8ff'}}>{k.value}</div>
              <div style={{fontSize:10,color:'#3d5280',marginTop:3}}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Clientes tab */}
        {tab === 'clientes' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 max-w-[300px]" style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.1)'}}>
                <Search size={13} style={{color:'#3d5280',flexShrink:0}}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente..." className="bg-transparent outline-none text-xs flex-1" style={{color:'#dce8ff'}}/>
              </div>
              <button onClick={()=>{setForm(EMPTY_FORM);setEditId(null);setModal(true)}}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all ml-auto"
                style={{background:'linear-gradient(135deg,#3a7bd5,#5c4db1)',boxShadow:'0 4px 16px rgba(58,123,213,0.3)'}}>
                <Plus size={14}/>Novo Cliente
              </button>
            </div>

            <div className="rounded-[12px] overflow-hidden" style={{background:'#0b1020',border:'0.5px solid rgba(99,130,255,0.1)'}}>
              <div className="overflow-x-auto">
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'rgba(255,255,255,0.02)'}}>
                      {['Cliente / Empresa','E-mail','Plano','Mensalidade','Vencimento','Status','Ações'].map(h=>(
                        <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,color:'#3d5280',fontWeight:600,letterSpacing:'0.8px',textTransform:'uppercase',borderBottom:'0.5px solid rgba(99,130,255,0.08)'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t=>{
                      const days = diffDays(t.dueDate)
                      const dColor = days < 0 ? '#f87171' : days <= 7 ? '#f59e0b' : '#1a9a5c'
                      const dLabel = days < 0 ? `Vencido há ${Math.abs(days)}d` : days <= 7 ? `${days}d (atenção)` : new Date(t.dueDate).toLocaleDateString('pt-BR')
                      return (
                        <tr key={t.id} style={{borderBottom:'0.5px solid rgba(255,255,255,0.03)'}} className="hover:bg-[rgba(58,123,213,0.03)] transition-colors">
                          <td style={{padding:'12px 14px'}}>
                            <div style={{fontSize:12,fontWeight:500,color:'#dce8ff'}}>{t.ownerName||t.name}</div>
                            <div style={{fontSize:10,color:'#3d5280'}}>{t.name} · {t.city}</div>
                          </td>
                          <td style={{padding:'12px 14px',fontSize:11,color:'#7a93c8'}}>{t.email}</td>
                          <td style={{padding:'12px 14px'}}>
                            <span style={{padding:'2px 9px',borderRadius:99,fontSize:10,fontWeight:600,background:'rgba(58,123,213,0.1)',color:'#5b9be8',border:'0.5px solid rgba(58,123,213,0.2)'}}>
                              {PLANOS[t.plan]?.nome||t.plan}
                            </span>
                          </td>
                          <td style={{padding:'12px 14px',fontSize:12,fontWeight:600,color:'#1a9a5c'}}>{fmt(t.mrr)}</td>
                          <td style={{padding:'12px 14px',fontSize:11,fontWeight:500,color:dColor}}>{dLabel}</td>
                          <td style={{padding:'12px 14px'}}><StatusPill status={t.status}/></td>
                          <td style={{padding:'12px 14px'}}>
                            <div className="flex gap-1.5">
                              <button onClick={()=>openEdit(t)} title="Editar" className="px-2 py-1 rounded-md text-[10px] transition-all" style={{background:'rgba(58,123,213,0.1)',color:'#5b9be8',border:'0.5px solid rgba(58,123,213,0.2)'}}><Edit2 size={11}/></button>
                              <button onClick={()=>toggleBlock(t)} title={t.status==='bloqueado'?'Ativar':'Bloquear'} className="px-2 py-1 rounded-md text-[10px] transition-all" style={{background:'rgba(245,158,11,0.1)',color:'#f59e0b',border:'0.5px solid rgba(245,158,11,0.2)'}}>
                                {t.status==='bloqueado'?<Unlock size={11}/>:<Lock size={11}/>}
                              </button>
                              <button onClick={()=>del(t)} title="Excluir" className="px-2 py-1 rounded-md text-[10px] transition-all" style={{background:'rgba(248,113,113,0.1)',color:'#f87171',border:'0.5px solid rgba(248,113,113,0.2)'}}><Trash2 size={11}/></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} style={{textAlign:'center',padding:'3rem',fontSize:12,color:'#3d5280'}}>
                        {search ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado ainda.'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'metricas' && (
          <div className="rounded-[10px] p-6" style={{background:'#0b1020',border:'0.5px solid rgba(99,130,255,0.1)',textAlign:'center',color:'#3d5280'}}>
            <div style={{fontSize:32,marginBottom:12}}>📊</div>
            <div style={{fontSize:14,fontWeight:500,color:'#7a93c8',marginBottom:8}}>Métricas SaaS</div>
            <div style={{fontSize:12}}>Gráficos de MRR, churn, LTV e crescimento da base. Disponível após cadastrar os primeiros clientes.</div>
          </div>
        )}

        {tab === 'logs' && (
          <div className="rounded-[12px] overflow-hidden" style={{background:'#0b1020',border:'0.5px solid rgba(99,130,255,0.1)'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:'rgba(255,255,255,0.02)'}}>
                {['Data/Hora','Usuário','Empresa','Ação','Status'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,color:'#3d5280',fontWeight:600,letterSpacing:'0.8px',textTransform:'uppercase',borderBottom:'0.5px solid rgba(99,130,255,0.08)'}}>{h}</th>)}
              </tr></thead>
              <tbody>
                <tr style={{borderBottom:'0.5px solid rgba(255,255,255,0.03)'}}><td style={{padding:'11px 14px',fontSize:11,color:'#3d5280'}}>Hoje 09:41</td><td style={{padding:'11px 14px',fontSize:11,color:'#7a93c8'}}>—</td><td style={{padding:'11px 14px',fontSize:11,color:'#7a93c8'}}>—</td><td style={{padding:'11px 14px'}}><span style={{padding:'2px 9px',borderRadius:99,fontSize:10,background:'rgba(58,123,213,0.1)',color:'#5b9be8',border:'0.5px solid rgba(58,123,213,0.2)'}}>Sistema iniciado</span></td><td style={{padding:'11px 14px',fontSize:11,color:'#1a9a5c'}}>OK</td></tr>
              </tbody>
            </table>
          </div>
        )}

        <div style={{textAlign:'center',padding:'1.5rem 0 0',fontSize:10,color:'#1e2d50'}}>
          Desenvolvido por <strong style={{color:'#3d5280'}}>Alexandre Amorim</strong> | <strong style={{color:'#3d5280'}}>Tríade Resultados</strong>
        </div>
      </div>

      {/* ── MODAL ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)'}}>
          <div className="w-full max-w-[540px] rounded-[18px] overflow-y-auto" style={{background:'#0e1530',border:'0.5px solid rgba(99,130,255,0.2)',maxHeight:'90vh',boxShadow:'0 30px 80px rgba(0,0,0,0.6)'}}>
            <div className="flex items-center justify-between p-5" style={{borderBottom:'0.5px solid rgba(99,130,255,0.1)'}}>
              <div className="font-display font-semibold" style={{fontSize:16}}>{editId?'Editar Cliente':'Novo Cliente'}</div>
              <button onClick={()=>{setModal(false);setForm(EMPTY_FORM);setEditId(null)}} style={{background:'none',border:'0.5px solid rgba(99,130,255,0.15)',borderRadius:7,width:30,height:30,cursor:'pointer',color:'#7a93c8',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14}/></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[{k:'name',l:'Empresa / Razão Social *',ph:'Empresa Ltda.'},{k:'ownerName',l:'Nome do Responsável',ph:'João da Silva'}].map(f=>(
                  <div key={f.k}>
                    <label style={{display:'block',fontSize:11,color:'#7a93c8',marginBottom:5}}>{f.l}</label>
                    <input value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} className="w-full px-3 py-2 rounded-lg outline-none text-xs" style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.15)',color:'#dce8ff'}}/>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{display:'block',fontSize:11,color:'#7a93c8',marginBottom:5}}>E-mail (login) *</label>
                  <input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="cliente@empresa.com" disabled={!!editId} className="w-full px-3 py-2 rounded-lg outline-none text-xs" style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.15)',color:editId?'#3d5280':'#dce8ff'}}/>
                </div>
                {!editId && (
                  <div>
                    <label style={{display:'block',fontSize:11,color:'#7a93c8',marginBottom:5}}>Senha inicial *</label>
                    <input type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="Mín. 6 caracteres" className="w-full px-3 py-2 rounded-lg outline-none text-xs" style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.15)',color:'#dce8ff'}}/>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{k:'cpfCnpj',l:'CPF / CNPJ',ph:'00.000.000/0001-00'},{k:'phone',l:'Telefone',ph:'(77) 99999-9999'},{k:'city',l:'Cidade / Estado',ph:'Itapetinga - BA'}].slice(0,editId?3:2).map(f=>(
                  <div key={f.k}>
                    <label style={{display:'block',fontSize:11,color:'#7a93c8',marginBottom:5}}>{f.l}</label>
                    <input value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} className="w-full px-3 py-2 rounded-lg outline-none text-xs" style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.15)',color:'#dce8ff'}}/>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{display:'block',fontSize:11,color:'#7a93c8',marginBottom:5}}>Plano</label>
                  <select value={form.plan} onChange={e=>{const p=e.target.value as Tenant['plan'];setForm(f=>({...f,plan:p,mrr:PLANOS[p].preco}))}} className="w-full px-3 py-2 rounded-lg outline-none text-xs" style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.15)',color:'#dce8ff'}}>
                    {Object.entries(PLANOS).map(([k,v])=><option key={k} value={k}>{v.nome} — R$ {v.preco}/mês</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:11,color:'#7a93c8',marginBottom:5}}>Mensalidade (R$)</label>
                  <input type="number" value={form.mrr} onChange={e=>setForm(p=>({...p,mrr:+e.target.value}))} className="w-full px-3 py-2 rounded-lg outline-none text-xs" style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.15)',color:'#dce8ff'}}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{display:'block',fontSize:11,color:'#7a93c8',marginBottom:5}}>Data de Início</label>
                  <input type="date" value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))} className="w-full px-3 py-2 rounded-lg outline-none text-xs" style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.15)',color:'#dce8ff'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:11,color:'#7a93c8',marginBottom:5}}>Vencimento</label>
                  <input type="date" value={form.dueDate} onChange={e=>setForm(p=>({...p,dueDate:e.target.value}))} className="w-full px-3 py-2 rounded-lg outline-none text-xs" style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.15)',color:'#dce8ff'}}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{display:'block',fontSize:11,color:'#7a93c8',marginBottom:5}}>Status</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value as Tenant['status']}))} className="w-full px-3 py-2 rounded-lg outline-none text-xs" style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.15)',color:'#dce8ff'}}>
                    <option value="ativo">Ativo</option><option value="trial">Trial</option><option value="bloqueado">Bloqueado</option><option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:11,color:'#7a93c8',marginBottom:5}}>Observações</label>
                  <input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Indicado por, setor..." className="w-full px-3 py-2 rounded-lg outline-none text-xs" style={{background:'#0c1228',border:'0.5px solid rgba(99,130,255,0.15)',color:'#dce8ff'}}/>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end p-5 pt-0">
              <button onClick={()=>{setModal(false);setForm(EMPTY_FORM);setEditId(null)}} className="px-4 py-2 rounded-lg text-xs transition-all" style={{background:'transparent',border:'0.5px solid rgba(99,130,255,0.15)',color:'#7a93c8'}}>Cancelar</button>
              <button onClick={save} disabled={saving} className="px-5 py-2 rounded-lg text-xs font-semibold text-white transition-all" style={{background:'linear-gradient(135deg,#3a7bd5,#5c4db1)',boxShadow:'0 4px 14px rgba(58,123,213,0.3)',opacity:saving?0.7:1}}>
                {saving?'Salvando...':editId?'Salvar Alterações':'Cadastrar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
