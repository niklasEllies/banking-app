'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { IconMessage2 } from '@tabler/icons-react'
import {
  listDescriptions,
  upsertDescription,
  deleteDescription,
  type Description,
} from '@/actions/descriptions'
import EmptyState from '@/components/EmptyState'

interface SpotDescriptionFeedProps {
  spotId: string
  userId: string | null
}

const MAX_LEN = 280

export default function SpotDescriptionFeed({ spotId, userId }: SpotDescriptionFeedProps) {
  const [descriptions, setDescriptions] = useState<Description[] | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    listDescriptions(spotId).then(setDescriptions)
  }, [spotId])

  const ownDescription = descriptions?.find((d) => d.user_id === userId) ?? null
  const others = descriptions?.filter((d) => d.user_id !== userId) ?? []

  const startEdit = () => {
    setDraft(ownDescription?.text ?? '')
    setEditing(true)
    setError(null)
  }

  const save = () => {
    setError(null)
    startTransition(async () => {
      const result = await upsertDescription(spotId, draft)
      if (result.error) {
        setError(result.error)
        return
      }
      const fresh = await listDescriptions(spotId)
      setDescriptions(fresh)
      setEditing(false)
      setDraft('')
    })
  }

  const remove = () => {
    if (!confirm('Tipp wirklich löschen?')) return
    setError(null)
    startTransition(async () => {
      const result = await deleteDescription(spotId)
      if (result.error) {
        setError(result.error)
        return
      }
      const fresh = await listDescriptions(spotId)
      setDescriptions(fresh)
    })
  }

  if (descriptions === null) {
    return (
      <div className="border-t border-gray-100 dark:border-[#2a2f24] pt-4 animate-pulse space-y-3">
        <div className="h-4 w-32 bg-gray-200 dark:bg-[#2a3124] rounded" />
        <div className="h-12 bg-gray-200 dark:bg-[#2a3124] rounded" />
        <div className="h-12 bg-gray-200 dark:bg-[#2a3124] rounded" />
      </div>
    )
  }

  return (
    <div className="border-t border-gray-100 dark:border-[#2a2f24] pt-4 space-y-4">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        Tipps von der Community
      </p>

      {/* Own slot (or login CTA if anonymous) */}
      {!userId ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <Link href="/login" className="text-primary font-medium hover:underline">
            Einloggen
          </Link>
          {' '}um einen Tipp zu schreiben
        </p>
      ) : editing ? (
        <div className="bg-gray-50 dark:bg-[#1a1f14] rounded-lg p-3 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_LEN}
            placeholder="Was macht diesen Spot besonders?"
            className="w-full text-sm bg-white dark:bg-[#141810] dark:text-gray-100 border border-gray-300 dark:border-[#2a2f24] rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
          />
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{MAX_LEN - draft.length} Zeichen verbleibend</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setEditing(false); setError(null) }}
                className="px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Abbrechen
              </button>
              <button
                onClick={save}
                disabled={isPending || draft.trim().length === 0}
                className="px-3 py-1.5 bg-primary text-white rounded disabled:opacity-60 hover:bg-primary-dark"
              >
                {isPending ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        </div>
      ) : ownDescription ? (
        <div className="bg-gray-50 dark:bg-[#1a1f14] rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-primary flex items-center gap-1"><IconMessage2 size={14} aria-hidden /> Dein Tipp</p>
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {ownDescription.text}
          </p>
          <div className="flex gap-3 text-xs">
            <button
              onClick={startEdit}
              className="text-gray-600 dark:text-gray-300 hover:text-primary"
            >
              Bearbeiten
            </button>
            <button
              onClick={remove}
              disabled={isPending}
              className="text-red-500 hover:text-red-700 disabled:opacity-60"
            >
              Löschen
            </button>
          </div>
          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="w-full text-sm text-primary border border-dashed border-primary/40 rounded-lg py-3 hover:bg-primary/5 transition-colors"
        >
          + Tipp hinzufügen
        </button>
      )}

      {/* Others */}
      {others.length > 0 && (
        <ul className="space-y-3">
          {others.map((d) => (
            <li key={d.id} className="text-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                <strong className="text-gray-700 dark:text-gray-300">
                  {d.username ?? 'anonym'}
                </strong>
                {' '}— {timeAgo(d.created_at)}
              </p>
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{d.text}</p>
            </li>
          ))}
        </ul>
      )}

      {others.length === 0 && !ownDescription && !editing && (
        <EmptyState
          Icon={IconMessage2}
          title="Noch keine Tipps"
          body={userId ? 'Sei der Erste mit einem Tipp zu diesem Plätzchen.' : 'Sobald jemand einen Tipp hinterlässt, erscheint er hier.'}
          compact
        />
      )}
    </div>
  )
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'gerade eben'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `vor ${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`
  const days = Math.floor(hours / 24)
  if (days < 7) return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `vor ${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'}`
  const months = Math.floor(days / 30)
  if (months < 12) return `vor ${months} ${months === 1 ? 'Monat' : 'Monaten'}`
  return `vor ${Math.floor(days / 365)} Jahren`
}
