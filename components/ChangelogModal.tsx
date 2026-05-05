'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ChangelogEntry } from '@/lib/changelog'
import { compareVersions } from '@/lib/changelog'

const LAST_SEEN_KEY = 'plaetzchen-last-seen-version'

interface ChangelogModalProps {
  latest: ChangelogEntry
}

export default function ChangelogModal({ latest }: ChangelogModalProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY)
    // First-time visitors: don't show — would feel like an "upgrade nag" they
    // didn't earn. Mark as seen and let them discover via the link in /profil.
    if (!lastSeen) {
      localStorage.setItem(LAST_SEEN_KEY, latest.version)
      return
    }
    if (compareVersions(lastSeen, latest.version) < 0) {
      setOpen(true)
    }
  }, [latest.version])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_SEEN_KEY, latest.version)
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-modal-title"
      className="fixed inset-0 z-[2000] flex items-center justify-center px-4 bg-black/50"
      onClick={dismiss}
    >
      <div
        className="bg-white dark:bg-[#1e231a] rounded-xl max-w-md w-full p-5 shadow-xl border border-gray-200 dark:border-[#2a2f24]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="changelog-modal-title" className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
          🆕 Neu in <span className="text-primary">{latest.version}</span> — {latest.title}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{latest.date}</p>

        <ul className="space-y-1.5 mb-5">
          {latest.bullets.map((b, i) => (
            <li key={i} className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
              {b}
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-3">
          <Link
            href="/changelog"
            onClick={dismiss}
            className="text-sm text-primary font-medium hover:underline"
          >
            Mehr Updates
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-dark"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  )
}
