'use client'

import { useState, useTransition } from 'react'
import { IconHeart, IconHeartFilled } from '@tabler/icons-react'
import { addFavorite, removeFavorite } from '@/actions/favorites'

interface FavoriteToggleProps {
  spotId: string
  isFavorite: boolean
  onChange: (spotId: string, isFav: boolean) => void
}

export default function FavoriteToggle({ spotId, isFavorite, onChange }: FavoriteToggleProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(false)

  const toggle = () => {
    const next = !isFavorite
    onChange(spotId, next) // optimistic
    setError(false)
    startTransition(async () => {
      const result = next ? await addFavorite(spotId) : await removeFavorite(spotId)
      if (result.error) {
        onChange(spotId, !next) // revert
        setError(true)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
      className={`min-w-11 min-h-11 flex items-center justify-center transition-transform hover:scale-110 ${
        isFavorite ? 'text-red-500' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
      } ${error ? 'text-red-500' : ''} disabled:opacity-60`}
    >
      {isFavorite
        ? <IconHeartFilled size={20} aria-hidden />
        : <IconHeart size={20} aria-hidden />
      }
    </button>
  )
}
