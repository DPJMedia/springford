"use client"

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from './Avatar'
import type { UserProfile } from '@/lib/types/database'

type EditUserModalProps = {
  user: UserProfile
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function EditUserModal({ user, isOpen, onClose, onUpdate }: EditUserModalProps) {
  const [fullName, setFullName] = useState(user.full_name || '')
  const [username, setUsername] = useState(user.username || '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  if (!isOpen) return null

  async function checkUsernameAvailability(username: string): Promise<boolean> {
    if (!username || username.trim() === '') return true
    
    const { data } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username.trim())
      .neq('id', user.id)
      .single()

    return !data
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      setError(null)

      // Validate username
      const trimmedUsername = username.trim()
      if (trimmedUsername && !/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        setError('Username can only contain letters, numbers, and underscores')
        setSaving(false)
        return
      }

      if (trimmedUsername && trimmedUsername.length < 3) {
        setError('Username must be at least 3 characters')
        setSaving(false)
        return
      }

      // Check username availability
      if (trimmedUsername) {
        const isAvailable = await checkUsernameAvailability(trimmedUsername)
        if (!isAvailable) {
          setError('This username is already taken')
          setSaving(false)
          return
        }
      }

      // Upload avatar if new file selected
      let newAvatarUrl = avatarUrl
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`

        // Delete old avatar if exists
        if (user.avatar_url) {
          const urlParts = user.avatar_url.split('/')
          const oldFileName = urlParts[urlParts.length - 1]
          if (oldFileName) {
            await supabase.storage.from('avatars').remove([oldFileName])
          }
        }

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)

        newAvatarUrl = publicUrl
      }

      // Update user profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName.trim() || null,
          username: trimmedUsername || null,
          avatar_url: newAvatarUrl || null,
        })
        .eq('id', user.id)

      if (updateError) {
        if (updateError.code === '23505') {
          setError('This username is already taken')
        } else {
          throw updateError
        }
        setSaving(false)
        return
      }

      onUpdate()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update user')
      setSaving(false)
    }
  }

  function handleRemoveAvatar() {
    setAvatarFile(null)
    setAvatarPreview(null)
    setAvatarUrl('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-[color:var(--color-dark)] mb-4">Edit User Profile</h2>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-800 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Profile Picture */}
          <div>
            <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-2">
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              <Avatar src={avatarPreview} name={fullName || user.email} email={user.email} size="lg" />
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm font-semibold hover:bg-gray-200"
                >
                  Change
                </button>
                {avatarPreview && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md text-sm font-semibold hover:bg-red-200"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2"
              placeholder="Enter full name"
              disabled={saving}
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-2">
              Username
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError(null)
                }}
                className="flex-1 border border-gray-300 rounded-md px-4 py-2"
                placeholder="username"
                disabled={saving}
                pattern="[a-zA-Z0-9_]+"
              />
            </div>
            <p className="text-xs text-[color:var(--color-medium)] mt-1">
              Letters, numbers, and underscores only. Min 3 characters.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-[color:var(--color-riviera-blue)] text-white rounded-md font-semibold hover:bg-opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-semibold hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}



