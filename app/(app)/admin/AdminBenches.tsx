'use client'

import { useState, useTransition } from 'react'
import { adminDeleteSpot } from '@/actions/admin'
import { spotDisplayName } from '@/lib/spot-utils'
import type { SpotType } from '@/lib/spot-types'

export interface AdminBench {
  id: string
  name: string | null
  type: SpotType
  created_at: string
  created_by: string | null
  profiles: { username: string | null } | null
}

export default function AdminBenches({ benches: initial }: { benches: AdminBench[] }) {
  const [benches, setBenches] = useState(initial)
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: string) => {
    setBenches((prev) => prev.filter((b) => b.id !== id))
    startTransition(async () => {
      const result = await adminDeleteSpot(id)
      if (result.error) setBenches(initial)
    })
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
        {benches.length} {benches.length === 1 ? 'Bank' : 'Bänke'}
      </p>
      <div className="space-y-2">
        {benches.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Keine Bänke</p>
        )}
        {benches.map((bench) => (
          <div
            key={bench.id}
            className="bg-white dark:bg-[#1e231a] rounded-xl px-3 py-2.5 flex items-center gap-3"
          >
            <span className="text-xl shrink-0">🪑</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                {spotDisplayName(bench.name, bench.created_at, bench.type)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                @{bench.profiles?.username ?? '—'} ·{' '}
                {new Date(bench.created_at).toLocaleDateString('de-DE')}
              </p>
            </div>
            <button
              onClick={() => handleDelete(bench.id)}
              disabled={isPending}
              className="shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-40"
              aria-label="Bank löschen"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
