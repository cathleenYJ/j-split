'use client'

import { useState } from 'react'
import { X, Copy, Check, Mail, Share2 } from 'lucide-react'

type Props = {
  tripId: string
  tripTitle: string
  isOpen: boolean
  onClose: () => void
}

export function InviteModal({ tripId, tripTitle, isOpen, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  
  if (!isOpen) return null

  const inviteUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/trip/${tripId}/join`
    : ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`邀請加入旅程：${tripTitle}`)
    const body = encodeURIComponent(
      `嗨！\n\n我邀請你加入「${tripTitle}」的旅程記帳。\n\n點擊以下連結即可加入：\n${inviteUrl}\n\n期待與你一起使用 J-Split！`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `邀請加入旅程：${tripTitle}`,
          text: `我邀請你加入「${tripTitle}」的旅程記帳。`,
          url: inviteUrl,
        })
      } catch (err) {
        console.error('Share failed:', err)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">邀請成員</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text3 mb-2">邀請連結</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="flex-1 input bg-surface2 text-sm"
              />
              <button
                onClick={handleCopy}
                className="btn-secondary px-4 flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    複製
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm text-text3 mb-3">分享方式</p>
            <div className="space-y-2">
              <button
                onClick={handleShareEmail}
                className="w-full btn-secondary flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                透過 Email 分享
              </button>
              
              {typeof window !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleShareNative}
                  className="w-full btn-secondary flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  其他分享方式
                </button>
              )}
            </div>
          </div>

          <div className="bg-surface2 rounded-lg p-4 text-sm text-text3">
            <p className="font-medium mb-1">💡 提示</p>
            <p>收到連結的朋友需要先登入 Google 帳號，才能加入旅程。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
