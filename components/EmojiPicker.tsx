'use client'

import { useState, useEffect } from 'react'

const EMOJI_KEY = 'benchmarks_user_emoji'
const EMOJIS = ['🧍‍♂️', '🧍‍♀️', '👫', '🐕'] as const

export default function EmojiPicker() {
  const [selected, setSelected] = useState('🧍‍♂️')

  useEffect(() => {
    setSelected(localStorage.getItem(EMOJI_KEY) ?? '🧍‍♂️')
  }, [])

  const handleSelect = (emoji: string) => {
    setSelected(emoji)
    localStorage.setItem(EMOJI_KEY, emoji)
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Dein Marker auf der Karte</p>
      <div className="flex gap-3 flex-wrap">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSelect(emoji)}
            className={`text-3xl p-3 rounded-xl border-2 transition-all ${
              selected === emoji
                ? 'border-primary bg-primary-light scale-110'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            aria-label={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Wird lokal auf diesem Gerät gespeichert</p>
    </div>
  )
}
