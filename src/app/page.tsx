'use client'

import Image from 'next/image'
import { LoginButton } from '@/components/LoginButton'

export default function HomePage() {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-background to-background2 p-4">
      
      {/* 中央卡片 */}
      <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 flex flex-col items-center gap-4 text-center">
        
        {/* Logo */}
        <div className="animate-fade-in">
          <Image 
            src="/logo_text.PNG" 
            alt="J-Split Logo" 
            width={320} 
            height={320}
            priority
            className="rounded-2xl"
          />
        </div>

        {/* 副標語 */}
        <div className="flex flex-col items-center gap-2 text-center -mt-2">
          <p className="text-base font-semibold text-text3">
            把複雜，變簡單
          </p>
          <p className="text-sm text-text3 max-w-[220px] leading-relaxed">
            飯可以亂點，帳不能亂算
          </p>
        </div>

        {/* 登入按鈕 */}
        <div className="w-full pt-2">
          <LoginButton />
        </div>

        {/* Footer */}
        <p className="text-xs text-text3/40 pt-2">
          © 2026 J-Split
        </p>
      </div>
    </main>
  )
}
