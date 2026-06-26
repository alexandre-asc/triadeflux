import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
})

export const metadata: Metadata = {
  title:       'Tríade Flux — CFO Digital com IA',
  description: 'Plataforma de gestão financeira inteligente para pequenas e médias empresas',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-flux-bg text-flux-text antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0e1530',
              color: '#dce8ff',
              border: '0.5px solid rgba(99,130,255,0.2)',
              borderRadius: '10px',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#1a9a5c', secondary: '#dce8ff' } },
            error:   { iconTheme: { primary: '#f87171', secondary: '#dce8ff' } },
          }}
        />
      </body>
    </html>
  )
}
