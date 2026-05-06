'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { IconDotsVertical } from '@tabler/icons-react'
import type { ComponentType } from 'react'

interface MenuItem {
  label: string
  href: string
  /** Tabler icon component — rendered at size 16 */
  Icon: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>
}

interface SpotActionMenuProps {
  items: MenuItem[]
}

export default function SpotActionMenu({ items }: SpotActionMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Aktionen"
        className="min-w-11 min-h-11 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <IconDotsVertical size={18} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 bg-white dark:bg-[#1e231a] border border-gray-200 dark:border-[#2a2f24] rounded-lg shadow-lg z-1100 min-w-44 py-1"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a3124]"
            >
              <item.Icon size={16} aria-hidden />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
