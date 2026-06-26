import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Tríade Flux
        flux: {
          bg:      '#06091a',
          bg2:     '#090e22',
          bg3:     '#0c1228',
          card:    '#0b1020',
          card2:   '#0e1530',
          card3:   '#111938',
          blue:    '#3a7bd5',
          blue2:   '#5b9be8',
          purple:  '#5c4db1',
          green:   '#1a9a5c',
          text:    '#dce8ff',
          text2:   '#7a93c8',
          text3:   '#3d5280',
          border:  'rgba(99,130,255,0.1)',
          border2: 'rgba(99,130,255,0.2)',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      animation: {
        'draw-arc':    'drawArc 0.8s cubic-bezier(0.4,0,0.2,1) forwards',
        'fade-up':     'fadeUp 0.6s cubic-bezier(0.4,0,0.2,1) forwards',
        'pulse-core':  'pulseCore 2s ease-in-out infinite',
        'ring-rotate': 'ringRotate 8s linear infinite',
      },
      keyframes: {
        drawArc:    { to: { strokeDashoffset: '0' } },
        fadeUp:     { to: { opacity: '1', transform: 'translateY(0)' } },
        pulseCore:  { '0%,100%': { transform: 'scale(1)', opacity: '0.15' }, '50%': { transform: 'scale(2.2)', opacity: '0' } },
        ringRotate: { to: { transform: 'rotate(360deg)' } },
      },
    },
  },
  plugins: [],
}
export default config
