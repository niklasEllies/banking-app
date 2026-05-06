'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { IconTrash, IconSearch, IconMessage2 } from '@tabler/icons-react'
import { adminDeleteDescription } from '@/actions/admin'
import { SPOT_TYPE_MAP } from '@/lib/spot-types'
import EmptyState from '@/components/EmptyState'
import type { AdminDescription } from '@/lib/admin-data'

export default function AdminDescriptions({ descriptions: initial }: { descriptions: AdminDescription[] }) {
  const [items, setItems] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((d) =>
      d.text.toLowerCase().includes(q) ||
      (d.username?.toLowerCase().includes(q) ?? false) ||
      (d.spot_name?.toLowerCase().includes(q) ?? false)
    )
  }, [items, query])

  const handleDelete = (id: string) => {
    if (!confirm('Tipp wirklich löschen?')) return
    setItems((prev) => prev.filter((d) => d.id !== id))
    startTransition(async () => {
      const result = await adminDeleteDescription(id)
      if (result.error) setItems(initial)
    })
  }

  if (initial.length === 0) {
    return <EmptyState Icon={IconMessage2} title="Noch keine Tipps" body="Sobald User Tipps schreiben, erscheinen sie hier." />
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Im Text, User oder Spot-Name suchen…"
          className="w-full rounded-lg border border-gray-200 dark:border-[#2a2f24] bg-white dark:bg-[#1e231a] pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-primary"
        />
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {filtered.length} von {items.length} Tipps
      </p>

      <div className="space-y-2">
        {filtered.map((d) => {
          const TypeIcon = SPOT_TYPE_MAP[d.spot_type]?.Icon
          return (
            <div
              key={d.id}
              className="bg-white dark:bg-[#1e231a] rounded-xl p-3 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                  {d.text}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                  <span>@{d.username ?? '—'}</span>
                  <span>·</span>
                  <Link
                    href={`/spots/${d.spot_id}`}
                    className="inline-flex items-center gap-1 hover:text-primary"
                  >
                    {TypeIcon && <TypeIcon size={12} stroke={1.5} aria-hidden />}
                    {d.spot_name ?? 'Spot'}
                  </Link>
                  <span>·</span>
                  <span>{new Date(d.created_at).toLocaleDateString('de-DE')}</span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(d.id)}
                disabled={isPending}
                className="shrink-0 min-w-11 min-h-11 flex items-center justify-center text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-40"
                aria-label="Tipp löschen"
              >
                <IconTrash size={16} aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
