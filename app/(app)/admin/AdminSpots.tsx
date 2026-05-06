'use client'

import { useMemo, useState, useTransition } from 'react'
import { IconTrash, IconSearch, IconMapPinOff } from '@tabler/icons-react'
import { adminDeleteSpot } from '@/actions/admin'
import { spotDisplayName } from '@/lib/spot-utils'
import { SPOT_TYPES, SPOT_TYPE_MAP, type SpotType } from '@/lib/spot-types'
import { SPOT_VISIBILITIES, SPOT_VISIBILITY_MAP, type SpotVisibility } from '@/lib/spot-visibility'
import EmptyState from '@/components/EmptyState'
import type { AdminSpotRow } from '@/lib/admin-data'

export default function AdminSpots({ spots: initial }: { spots: AdminSpotRow[] }) {
  const [spots, setSpots] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<SpotType | 'all'>('all')
  const [visFilter, setVisFilter] = useState<SpotVisibility | 'all'>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return spots.filter((s) => {
      if (typeFilter !== 'all' && s.type !== typeFilter) return false
      if (visFilter !== 'all' && s.visibility !== visFilter) return false
      if (!q) return true
      return (
        (s.name?.toLowerCase().includes(q) ?? false) ||
        (s.owner_username?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [spots, query, typeFilter, visFilter])

  const handleDelete = (id: string) => {
    if (!confirm('Plätzchen wirklich löschen?')) return
    setSpots((prev) => prev.filter((s) => s.id !== id))
    startTransition(async () => {
      const result = await adminDeleteSpot(id)
      if (result.error) setSpots(initial)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-45">
          <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name oder User…"
            className="w-full rounded-lg border border-gray-200 dark:border-[#2a2f24] bg-white dark:bg-[#1e231a] pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as SpotType | 'all')}
          className="rounded-lg border border-gray-200 dark:border-[#2a2f24] bg-white dark:bg-[#1e231a] px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-primary"
        >
          <option value="all">Alle Typen</option>
          {SPOT_TYPES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <select
          value={visFilter}
          onChange={(e) => setVisFilter(e.target.value as SpotVisibility | 'all')}
          className="rounded-lg border border-gray-200 dark:border-[#2a2f24] bg-white dark:bg-[#1e231a] px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-primary"
        >
          <option value="all">Alle Sichtbarkeiten</option>
          {SPOT_VISIBILITIES.map((v) => (
            <option key={v.key} value={v.key}>{v.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState Icon={IconMapPinOff} title="Keine Plätzchen gefunden" body={query || typeFilter !== 'all' || visFilter !== 'all' ? 'Filter zurücksetzen oder anders suchen.' : 'Es gibt noch keine.'} compact />
      ) : (
        <div className="space-y-2">
          {filtered.map((spot) => {
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    @{spot.owner_username ?? '—'} · {visMeta?.label ?? spot.visibility} · {new Date(spot.created_at).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(spot.id)}
                  disabled={isPending}
                  className="shrink-0 min-w-11 min-h-11 flex items-center justify-center text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-40"
                  aria-label="Plätzchen löschen"
                >
                  <IconTrash size={16} aria-hidden />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
