import { DM_Sans, Noto_Serif_TC } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { ToastProvider } from '@/components/ToastProvider'

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600']
})

const notoSerif = Noto_Serif_TC({ 
  subsets: ['latin'],
  variable: '--font-noto-serif',
  weight: ['400', '600']
})

export const metadata = {
  title: 'J-Split - 分帳系統',
  description: '支援多國幣別、即時協作的智慧分帳工具',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" className={`${dmSans.variable} ${notoSerif.variable}`}>
      <body className="font-sans">
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
