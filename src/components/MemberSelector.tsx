'use client'

import { useState, useRef, useEffect } from 'react'
import { TripMember, getMemberDisplayName } from '@/lib/supabase'
import { Search, X, User } from 'lucide-react'
import Image from 'next/image'

type Props = {
  members: (TripMember & { profile: any })[]
  value: string                        // trip_members.id
  onChange: (memberId: string) => void
  placeholder?: string
  className?: string
}

export function MemberSelector({ members, value, onChange, placeholder = '選擇成員', className = '' }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const selectedMember = members.find(m => m.id === value)

  const filteredMembers = members.filter(m => {
    const name = getMemberDisplayName(m)
    return name.toLowerCase().includes(search.toLowerCase())
  })

  function handleSelect(memberId: string) {
    onChange(memberId)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-lg border border-[var(--border2)] bg-surface text-left flex items-center justify-between hover:border-accent transition-colors"
      >
        {selectedMember ? (
          <div className="flex items-center gap-2 min-w-0">
            {selectedMember.guest_name ? (
              <div className="w-6 h-6 rounded-full bg-accent2/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-accent2" />
              </div>
            ) : selectedMember.profile?.avatar_url ? (
              <Image
                src={selectedMember.profile.avatar_url}
                alt={selectedMember.profile.full_name || ''}
                width={24}
                height={24}
                className="rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-accent" />
              </div>
            )}
            <span className="font-medium truncate">{getMemberDisplayName(selectedMember)}</span>
            {selectedMember.guest_name && (
              <span className="text-xs bg-accent2/10 text-accent2 px-1.5 py-0.5 rounded flex-shrink-0">訪客</span>
            )}
          </div>
        ) : (
          <span className="text-text3">{placeholder}</span>
        )}
        <svg className="w-4 h-4 text-text3 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-surface border border-[var(--border2)] rounded-lg shadow-lg max-h-[300px] overflow-hidden flex flex-col">
          <div className="p-3 border-b border-[var(--border)] sticky top-0 bg-surface">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text3" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜尋成員..."
                className="w-full pl-10 pr-8 py-2 text-sm rounded-lg border border-[var(--border)] focus:border-accent focus:ring-2 focus:ring-accent/10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-surface2 rounded"
                >
                  <X className="w-3 h-3 text-text3" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto">
            {filteredMembers.length > 0 ? (
              filteredMembers.map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleSelect(member.id)}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-surface2 transition-colors flex items-center gap-3 ${
                    member.id === value ? 'bg-accent/10 text-accent font-medium' : ''
                  }`}
                >
                  {member.guest_name ? (
                    <div className="w-7 h-7 rounded-full bg-accent2/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-accent2" />
                    </div>
                  ) : member.profile?.avatar_url ? (
                    <Image
                      src={member.profile.avatar_url}
                      alt={member.profile.full_name || ''}
                      width={28}
                      height={28}
                      className="rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                  )}
                  <span className="truncate flex-1">{getMemberDisplayName(member)}</span>
                  {member.guest_name && (
                    <span className="text-xs bg-accent2/10 text-accent2 px-1.5 py-0.5 rounded flex-shrink-0">訪客</span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-text3 text-sm">
                找不到符合的成員
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
