"use client"

type AvatarProps = {
  src?: string | null
  name?: string | null
  email?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ src, name, email, size = 'md', className = '' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-32 h-32 text-4xl',
  }

  // Check if this is DiffuseAI
  const isDiffuseAI = name?.toLowerCase().includes('diffuse.ai') || 
                      name?.toLowerCase().includes('powered by diffuse') ||
                      email?.toLowerCase().includes('diffuse');

  function getInitials(name: string | null | undefined, email: string | null | undefined): string {
    // Special case for DiffuseAI
    if (isDiffuseAI) {
      return 'AI'
    }
    
    if (name) {
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return name[0].toUpperCase()
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return '?'
  }

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      />
    )
  }

  // Use orange background for DiffuseAI, default blue for others
  const bgColor = isDiffuseAI ? 'bg-gradient-to-br from-[#ff9628] to-[#ff7300]' : 'bg-[color:var(--color-riviera-blue)]';

  return (
    <div className={`${sizeClasses[size]} rounded-full ${bgColor} flex items-center justify-center text-white font-black ${className}`}>
      {getInitials(name, email)}
    </div>
  )
}



