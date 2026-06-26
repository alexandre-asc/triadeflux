'use client'
import { useEffect } from 'react'

interface Props { onDone?: () => void }

export default function SplashScreen({ onDone }: Props) {
  useEffect(() => {
    if (!onDone) return
    const t = setTimeout(onDone, 3700)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center" style={{
      background: `
        radial-gradient(ellipse 70% 50% at 50% 30%, rgba(58,123,213,0.13) 0%, transparent 70%),
        radial-gradient(ellipse 50% 40% at 20% 70%, rgba(92,77,177,0.09) 0%, transparent 60%),
        radial-gradient(ellipse 50% 40% at 80% 70%, rgba(26,154,92,0.08) 0%, transparent 60%),
        #06091a`,
      animation: 'bgPulse 3s ease-in-out infinite alternate',
    }}>
      {/* Símbolo animado */}
      <div className="relative mb-8" style={{width:180, height:180}}>
        <svg viewBox="0 0 180 180" fill="none" width="180" height="180">
          <circle cx="90" cy="90" r="82" fill="rgba(58,123,213,0.04)" stroke="rgba(58,123,213,0.08)" strokeWidth="0.5"/>

          {/* Anel giratório */}
          <circle className="ring-glow" cx="90" cy="90" r="74"
            fill="none" stroke="url(#rg)" strokeWidth="0.8" strokeDasharray="8 18"/>

          {/* Partículas */}
          {[
            {cx:55,cy:60,r:2,fill:'#3a7bd5',dur:'3.2s',delay:'2.4s'},
            {cx:130,cy:55,r:1.5,fill:'#5c4db1',dur:'2.8s',delay:'2.7s'},
            {cx:45,cy:120,r:1.5,fill:'#1a9a5c',dur:'3.5s',delay:'3.0s'},
            {cx:140,cy:115,r:2,fill:'#3a7bd5',dur:'3.0s',delay:'2.6s'},
            {cx:90,cy:40,r:1.5,fill:'#5c4db1',dur:'2.6s',delay:'3.2s'},
          ].map((p,i) => (
            <circle key={i} className="particle" cx={p.cx} cy={p.cy} r={p.r} fill={p.fill}
              style={{'--dur':p.dur,'--delay':p.delay} as React.CSSProperties}/>
          ))}

          {/* Arcos */}
          <path className="arc-blue"  d="M90 22C54 22 22 54 22 90"      stroke="#3a7bd5" strokeWidth="7" strokeLinecap="round" fill="none"/>
          <path className="arc-green" d="M22 90C22 126 54 158 90 158"    stroke="#1a9a5c" strokeWidth="7" strokeLinecap="round" fill="none"/>
          <path className="arc-purple" d="M90 158C126 158 158 126 158 90C158 54 126 22 90 22" stroke="#5c4db1" strokeWidth="7" strokeLinecap="round" fill="none"/>

          {/* Linhas internas */}
          <g className="mesh">
            <line x1="90" y1="22"  x2="22"  y2="90"  stroke="rgba(58,123,213,0.18)" strokeWidth="1.2" strokeDasharray="4 6"/>
            <line x1="22" y1="90"  x2="90"  y2="158" stroke="rgba(26,154,92,0.18)"  strokeWidth="1.2" strokeDasharray="4 6"/>
            <line x1="90" y1="158" x2="158" y2="90"  stroke="rgba(92,77,177,0.18)"  strokeWidth="1.2" strokeDasharray="4 6"/>
            <line x1="158" y1="90" x2="90"  y2="22"  stroke="rgba(58,123,213,0.18)" strokeWidth="1.2" strokeDasharray="4 6"/>
          </g>

          {/* Nós */}
          <g className="node-1">
            <circle cx="90" cy="22"  r="9" fill="#090e22" stroke="#3a7bd5" strokeWidth="1.5"/>
            <circle cx="90" cy="22"  r="5" fill="#3a7bd5" opacity="0.9"/>
            <circle cx="90" cy="22"  r="2" fill="white" opacity="0.95"/>
          </g>
          <g className="node-2">
            <circle cx="22" cy="90"  r="9" fill="#090e22" stroke="#1a9a5c" strokeWidth="1.5"/>
            <circle cx="22" cy="90"  r="5" fill="#1a9a5c" opacity="0.9"/>
            <circle cx="22" cy="90"  r="2" fill="white" opacity="0.95"/>
          </g>
          <g className="node-3">
            <circle cx="90" cy="158" r="9" fill="#090e22" stroke="#5c4db1" strokeWidth="1.5"/>
            <circle cx="90" cy="158" r="5" fill="#5c4db1" opacity="0.9"/>
            <circle cx="90" cy="158" r="2" fill="white" opacity="0.95"/>
          </g>

          {/* Núcleo */}
          <circle className="core-pulse" cx="90" cy="90" r="14" fill="#3a7bd5" style={{transformOrigin:'90px 90px'}}/>
          <circle className="core-1" cx="90" cy="90" r="18" fill="rgba(11,16,32,0.95)" stroke="rgba(58,123,213,0.35)" strokeWidth="1.5" style={{transformOrigin:'90px 90px'}}/>
          <circle className="core-2" cx="90" cy="90" r="11" fill="rgba(58,123,213,0.15)" stroke="rgba(58,123,213,0.5)" strokeWidth="1" style={{transformOrigin:'90px 90px'}}/>
          <circle className="core-3" cx="90" cy="90" r="6.5" fill="#3a7bd5" opacity="0.9" style={{transformOrigin:'90px 90px'}}/>
          <circle className="core-dot" cx="90" cy="90" r="2.8" fill="white" opacity="0.97" style={{transformOrigin:'90px 90px'}}/>

          <defs>
            <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#3a7bd5" stopOpacity="0.6"/>
              <stop offset="50%"  stopColor="#5c4db1" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#1a9a5c" stopOpacity="0.6"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Nome */}
      <div className="splash-brand text-center">
        <div className="font-display font-bold text-white" style={{fontSize:32,letterSpacing:'-0.5px'}}>
          Tríade <span style={{color:'#5b9be8'}}>Flux</span>
        </div>
        <div className="uppercase tracking-widest mt-1.5" style={{fontSize:11,color:'#3d5280'}}>
          CFO Digital com Inteligência Artificial
        </div>
      </div>

      {/* Loading bar */}
      <div className="loader-bar mt-8 overflow-hidden rounded-full" style={{width:120,height:2,background:'rgba(255,255,255,0.06)'}}>
        <div className="loader-fill h-full rounded-full" style={{
          width:0,
          background:'linear-gradient(90deg,#3a7bd5,#5c4db1,#1a9a5c)',
        }}/>
      </div>
      <div className="splash-brand mt-2" style={{fontSize:11,color:'rgba(122,147,200,0.4)'}}>
        Preparando seu ambiente financeiro...
      </div>
    </div>
  )
}
