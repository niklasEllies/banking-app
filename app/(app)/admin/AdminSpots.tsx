'use client'

import { useState, useTransition } from 'react'
import { adminDeleteSpot } from '@/actions/admin'
import { spotDisplayName } from '@/lib/spot-utils'
import { SPOT_TYPE_MAP, type SpotType } from '@/lib/spot-types'

export interface AdminSpot {
  id: string
  name: string | null
  type: SpotType
  created_at: string
  created_by: string | null
  profiles: { username: string | null } | null
}

export default function AdminSpots({ spots: initial }: { spots: AdminSpot[] }) {
  const [spots, setSpots] = useState(initial)
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: string) => {
    setSpots((prev) => prev.filter((s) => s.id !== id))
    startTransition(async () => {
      const result = await adminDeleteSpot(id)
      if (result.error) setSpots(initial)
    })
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
        {spots.length} Plätzchen
      </p>
      <div className="space-y-2">
        {spots.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Keine Plätzchen</p>
        )}
        {spots.map((spot) => (
          <div
            key={spot.id}
            className="bg-white dark:bg-[#1e231a] rounded-xl px-3 py-2.5 flex items-center gap-3"
          >
            <span className="text-xl shrink-0">{SPOT_TYPE_MAP[spot.type].emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                {spotDisplayName(spot.name, spot.created_at, spot.type)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                @{spot.profiles?.username ?? '—'} ·{' '}
                {new Date(spot.created_at).toLocaleDateString('de-DE')}
              </p>
            </div>
            <button
              onClick={() => handleDelete(spot.id)}
              disabled={isPending}
              className="shrink-0 min-w-11 min-h-11 flex items-center justify-center text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-40"
              aria-label="Plätzchen löschen"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
