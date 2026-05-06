'use client'

import { useState, useTransition } from 'react'
import { IconTrash } from '@tabler/icons-react'
import { adminDeleteSpot } from '@/actions/admin'
import { spotDisplayName } from '@/lib/spot-utils'
import { SPOT_TYPE_MAP } from '@/lib/spot-types'
import { SPOT_VISIBILITY_MAP } from '@/lib/spot-visibility'
import EmptyState from '@/components/EmptyState'
import { IconMapPin } from '@tabler/icons-react'
import type { AdminSpotRow } from '@/lib/admin-data'

export default function AdminUserSpots({ spots: initial }: { spots: AdminSpotRow[] }) {
  const [spots, setSpots] = useState(initial)
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: string) => {
    if (!confirm('Plätzchen wirklich löschen?')) return
    setSpots((prev) => prev.filter((s) => s.id !== id))
    startTransition(async () => {
      const result = await adminDeleteSpot(id)
      if (result.error) setSpots(initial)
    })
  }

  if (spots.length === 0) {
    return <EmptyState Icon={IconMapPin} title="Noch keine Plätzchen" body="Dieser User hat noch nichts eingetragen." compact />
  }

  return (
    <div className="space-y-2">
      {spots.map((spot) => {
        const TypeIcon = SPOT_TYPE_MAP[spot.type].Icon
        const visMeta = SPOT_VISIBILITY_MAP[spot.visibility]
        return (
          <div
            key={spot.id}
            className="bg-white dark:bg-[#1e231a] rounded-xl px-3 py-2.5 flex items-center gap-3"
          >
            <TypeIcon size={20} stroke={1.5} className="shrink-0 text-gray-600 dark:text-gray-300" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                {spotDisplayName(spot.name, spot.created_at, spot.type)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {visMeta?.label ?? spot.visibility} · {new Date(spot.created_at).toLocaleDateString('de-DE')}
              </p>
            </div>
            <button
              onClick={() => handleDelete(spot.id)}
              disabled={isPending}
              className="shrink-0 min-w-11 min-h-11 flex items-center justify-center text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-40"
              aria-label="Plätzchen löschen"
            >
              <IconTrash size={18} aria-hidden />
            </button>
          </div>
        )
      })}
    </div>
  )
}
