'use client'

import { useState, useTransition } from 'react'
import { updateMarkerEmoji } from '@/actions/profile'

const EMOJIS = ['🧍‍♂️', '🧍‍♀️', '👫', '🐕'] as const

const EMOJI_LABELS: Record<typeof EMOJIS[number], string> = {
  '🧍‍♂️': 'Stehende Person (männlich)',
  '🧍‍♀️': 'Stehende Person (weiblich)',
  '👫': 'Paar',
  '🐕': 'Hund',
}

const DEFAULT_EMOJI: typeof EMOJIS[number] = '🧍‍♂️'

export default function EmojiPicker({ initialEmoji }: { initialEmoji: string | null }) {
  const [selected, setSelected] = useState<string>(initialEmoji ?? DEFAULT_EMOJI)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSelect = (emoji: string) => {
    if (emoji === selected) return
    const previous = selected
    setSelected(emoji)
    setError(null)
    startTransition(async () => {
      // Persist null when the user picks the default — keeps profiles clean
      // and lets the default change in code without rewriting existing rows.
      const result = await updateMarkerEmoji(emoji === DEFAULT_EMOJI ? null : emoji)
      if (result.error) {
        setSelected(previous)
        setError(result.error)
      }
    })
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Dein Marker auf der Karte</p>
      <div role="radiogroup" aria-label="Marker-Emoji für die Karte" className="grid grid-cols-4 gap-3">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            role="radio"
            aria-checked={selected === emoji}
            aria-label={EMOJI_LABELS[emoji]}
            onClick={() => handleSelect(emoji)}
            disabled={isPending}
            className={`rounded-xl border-2 transition-colors flex items-center justify-center text-3xl p-3 disabled:opacity-60 ${
              selected === emoji
                ? 'border-primary bg-primary-light dark:bg-[#2a3f1e]'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e231a] hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-xs text-red-500 dark:text-red-400 mt-2">{error}</p>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Wird in deinem Profil gespeichert</p>
      )}
    </div>
  )
}
