"use client"

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/types/database'

type AuthorSelectorProps = {
  value: string
  onChange: (authorName: string) => void
}

export function AuthorSelector({ value, onChange }: AuthorSelectorProps) {
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [admins, setAdmins] = useState<UserProfile[]>([])
  const [filteredAdmins, setFilteredAdmins] = useState<UserProfile[]>([])
  const [mentionIndex, setMentionIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const mentionsRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchAdmins()
  }, [])

  useEffect(() => {
    if (mentionQuery) {
      const filtered = admins.filter(admin => 
        admin.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        admin.email?.toLowerCase().includes(mentionQuery.toLowerCase())
      )
      setFilteredAdmins(filtered)
      setMentionIndex(0)
    } else {
      setFilteredAdmins(admins)
      setMentionIndex(0)
    }
  }, [mentionQuery, admins])

  async function fetchAdmins() {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, is_admin, is_super_admin')
      .or('is_admin.eq.true,is_super_admin.eq.true')
      .order('full_name', { ascending: true })

    if (data) {
      setAdmins(data)
      setFilteredAdmins(data)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const inputValue = e.target.value
    onChange(inputValue)

    // Check if "@" was just typed
    const cursorPosition = e.target.selectionStart || 0
    const textBeforeCursor = inputValue.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const query = textBeforeCursor.substring(lastAtIndex + 1).trim()
      // Only show mentions if there's no space after @
      if (!query.includes(' ') && !query.includes('\n')) {
        setMentionQuery(query)
        setShowMentions(true)
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showMentions || filteredAdmins.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMentionIndex(prev => 
        prev < filteredAdmins.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setMentionIndex(prev => 
        prev > 0 ? prev - 1 : filteredAdmins.length - 1
      )
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      selectAdmin(filteredAdmins[mentionIndex])
    } else if (e.key === 'Escape') {
      setShowMentions(false)
    }
  }

  function selectAdmin(admin: UserProfile) {
    const inputValue = value
    const cursorPosition = inputRef.current?.selectionStart || 0
    const textBeforeCursor = inputValue.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const beforeAt = inputValue.substring(0, lastAtIndex)
      const afterCursor = inputValue.substring(cursorPosition)
      const authorName = admin.full_name || admin.email || ''
      const newValue = beforeAt + authorName + afterCursor
      onChange(newValue)
      setShowMentions(false)
      
      // Set cursor position after the inserted name
      setTimeout(() => {
        const newCursorPos = lastAtIndex + authorName.length
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
        inputRef.current?.focus()
      }, 0)
    }
  }

  // Get the selected admin if value matches an admin name
  const selectedAdmin = admins.find(admin => 
    admin.full_name === value || admin.email === value
  )

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-gray-900 mb-2">
        Author *
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay hiding mentions to allow click events
            setTimeout(() => setShowMentions(false), 200)
          }}
          className="w-full border border-gray-300 rounded-md px-4 py-2 pl-10"
          placeholder="Type author name or @ to search admins"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          {selectedAdmin ? (
            <div className="w-6 h-6 rounded-full bg-[color:var(--color-riviera-blue)] flex items-center justify-center text-white text-xs font-semibold">
              {selectedAdmin.full_name?.[0]?.toUpperCase() || selectedAdmin.email?.[0]?.toUpperCase() || '?'}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs">
              ?
            </div>
          )}
        </div>
        {showMentions && filteredAdmins.length > 0 && (
          <div
            ref={mentionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {filteredAdmins.map((admin, index) => (
              <button
                key={admin.id}
                type="button"
                onClick={() => selectAdmin(admin)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3 ${
                  index === mentionIndex ? 'bg-gray-100' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[color:var(--color-riviera-blue)] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {admin.full_name?.[0]?.toUpperCase() || admin.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {admin.full_name || 'No name'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {admin.email}
                    {admin.is_super_admin && (
                      <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                        Super Admin
                      </span>
                    )}
                    {!admin.is_super_admin && admin.is_admin && (
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Type @ to search and select from admins/super admins, or type any name for non-admin authors
      </p>
    </div>
  )
}

