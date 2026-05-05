'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import type { Spot } from '@/components/SpotMap'
import { deleteSpot } from '@/actions/spots'
import { spotDisplayName, distanceTo, distMeters } from '@/lib/spot-utils'
import { SPOT_TYPE_MAP } from '@/lib/spot-types'
import SpotDetail from '@/components/SpotDetail'
import FavoriteToggle from '@/components/FavoriteToggle'
import SpotActionMenu from '@/components/SpotActionMenu'
import { useSheetSwipe } from '@/components/useSheetSwipe'

type GpsState = 'unknown' | 'available' | 'denied' | 'unavailable'
type ViewMode = 'all' | 'mine' | 'favorites'
const VIEW_MODE_KEY = 'plaetzchen-view-mode'

interface BottomSheetProps {
  spots: Spot[]
  userId: string | null
  onExpandedChange: (expanded: boolean) => void
  selectedSpotId: string | null
  onSpotSelect: (spotId: string) => void
  onSpotDeselect: () => void
  onFlyToSpot: (spot: Spot) => void
  userPosition: { lat: number; lng: number } | null
  gpsState?: GpsState
  favoriteIds?: Set<string>
  onFavoriteChange?: (spotId: string, isFav: boolean) => void
}

export default function BottomSheet({
  spots: initialSpots,
  userId,
  onExpandedChange,
  selectedSpotId,
  onSpotSelect,
  onSpotDeselect,
  onFlyToSpot,
  userPosition,
  gpsState = 'unknown',
  favoriteIds = new Set<string>(),
  onFavoriteChange = () => {},
}: BottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [spots, setSpots] = useState(initialSpots)
  const [isPending, startTransition] = useTransition()
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const count = spots.length

  const selectedSpot = spots.find((s) => s.id === selectedSpotId) ?? null

  useEffect(() => {
    if (selectedSpotId) {
      setIsExpanded(true)
      onExpandedChange(true)
    }
  }, [selectedSpotId, onExpandedChange])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(VIEW_MODE_KEY)
    if (stored === 'all' || stored === 'mine' || stored === 'favorites') {
      setViewMode(stored)
    }
  }, [])

  const handleViewModeChange = (m: ViewMode) => {
    setViewMode(m)
    if (typeof window !== 'undefined') localStorage.setItem(VIEW_MODE_KEY, m)
  }

  const filtered = spots.filter((s) => {
    if (viewMode === 'all') return true
    if (viewMode === 'mine') return s.created_by === userId
    return favoriteIds.has(s.id)
  })

  const sorted =
    userPosition && gpsState === 'available'
      ? [...filtered].sort(
          (a, b) =>
            distMeters(userPosition, { lat: a.lat, lng: a.lng }) -
            distMeters(userPosition, { lat: b.lat, lng: b.lng }),
        )
      : [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at))

  const expand = () => { setIsExpanded(true); onExpandedChange(true) }
  const collapse = () => {
    setIsExpanded(false)
    onExpandedChange(false)
    onSpotDeselect()
  }

  const { dragY, handleProps, contentProps } = useSheetSwipe({
    onDismiss: collapse,
    enabled: isExpanded,
  })

  const handleDelete = (id: string) => {
    setSpots((prev) => prev.filter((s) => s.id !== id))
    startTransition(async () => {
      const result = await deleteSpot(id)
      if (result.error) setSpots(initialSpots)
    })
  }

  if (!isExpanded) {
    return (
      <button
        onClick={expand}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-1000 bg-white dark:bg-[#1e231a] rounded-full px-4 py-2 shadow-md text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#2a2f24]"
      >
        {count} Plätzchen ↑
      </button>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={selectedSpotId ? 'Plätzchen-Details' : 'Plätzchen-Liste'}
      className="absolute bottom-0 left-0 right-0 z-1000 bg-white dark:bg-[#1e231a] rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] overflow-hidden"
      style={{
        height: '55vh',
        transform: `translateY(${dragY}px)`,
        transition: dragY === 0 ? 'transform 0.25s ease' : 'none',
      }}
    >
      {/* Header (drag handle area — always swipes) */}
      <div
        className="flex items-center justify-between px-5 pt-3 pb-2 cursor-grab select-none"
        {...handleProps}
      >
        <div className="absolute left-1/2 -translate-x-1/2 top-3 w-10 h-1 bg-gray-400 dark:bg-gray-500 rounded-full" />
        {selectedSpotId ? (
          <button onClick={onSpotDeselect} className="text-sm text-primary mt-2">
            ← Alle Plätzchen
          </button>
        ) : (
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-2">
            {sorted.length} Plätzchen
          </p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {userId && selectedSpot && (
            <FavoriteToggle
              spotId={selectedSpot.id}
              isFavorite={favoriteIds.has(selectedSpot.id)}
              onChange={onFavoriteChange}
            />
          )}
          {selectedSpot && userId === selectedSpot.created_by && (
            <SpotActionMenu
              items={[
                { emoji: '📷', label: 'Foto bearbeiten', href: `/spots/${selectedSpot.id}/edit-photo` },
                { emoji: '📝', label: 'Spot bearbeiten', href: `/spots/${selectedSpot.id}/edit` },
              ]}
            />
          )}
          <button
            onClick={collapse}
            className="min-w-11 min-h-11 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tab bar (list view only) */}
      {!selectedSpotId && (
        <div className="flex border-b border-gray-100 dark:border-[#2a2f24]">
          {(['all', 'mine', 'favorites'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleViewModeChange(m)}
              role="tab"
              aria-selected={viewMode === m}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                viewMode === m
                  ? 'text-primary border-primary'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {m === 'all' ? 'Alle' : m === 'mine' ? 'Eigene' : 'Favoriten'}
            </button>
          ))}
        </div>
      )}

      {/* Content (scroll-aware: only swipes when scrolled to top) */}
      <div
        className="overflow-y-auto pb-8"
        style={{ height: !selectedSpotId ? 'calc(55vh - 56px - 36px)' : 'calc(55vh - 56px)' }}
        {...contentProps}
      >
        {selectedSpot ? (
          <SpotDetail spot={selectedSpot} userId={userId} />
        ) : (viewMode === 'mine' || viewMode === 'favorites') && !userId ? (
          <div className="py-12 px-6 text-center">
            <p className="text-base text-gray-700 dark:text-gray-300 mb-2">
              Logge dich ein, um {viewMode === 'mine' ? 'deine eigenen Plätzchen' : 'deine Favoriten'} zu sehen.
            </p>
            <Link href="/login" className="text-primary font-medium hover:underline">
              Login
            </Link>
          </div>
        ) : sorted.length === 0 ? (
          viewMode === 'mine' ? (
            <div className="py-12 px-6 text-center">
              <div className="text-5xl mb-3">📍</div>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Du hast noch keine Plätzchen eingetragen.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tippe auf <strong className="text-primary">+</strong> unten rechts, um dein erstes einzutragen.
              </p>
            </div>
          ) : viewMode === 'favorites' ? (
            <div className="py-12 px-6 text-center">
              <div className="text-5xl mb-3">❤️</div>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Noch keine Favoriten.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Markiere einen Spot mit ❤️ um ihn hier zu speichern.
              </p>
            </div>
          ) : (
            <div className="py-12 px-6 text-center">
              <div className="text-5xl mb-3">📍</div>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Noch keine Plätzchen in der Nähe.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tippe auf <strong className="text-primary">+</strong> unten rechts, um dein erstes einzutragen.
              </p>
            </div>
          )
        ) : (
          <>
            {gpsState !== 'available' && gpsState !== 'unknown' && (
              <div className="px-5 py-2 text-xs italic text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#2a2f24]">
                📍 Standort aus — Distanzen werden nicht angezeigt
              </div>
            )}
            <ul>
              {sorted.map((spot) => (
                <li
                  key={spot.id}
                  className="flex items-center gap-3 px-5 py-3 border-t border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1f14] active:bg-gray-100 dark:active:bg-[#161a10]"
                  onClick={() => {
                    onFlyToSpot(spot)
                    onSpotSelect(spot.id)
                  }}
                >
                  <span className="text-xl shrink-0">{SPOT_TYPE_MAP[spot.type].emoji}</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate flex-1">
                    {spotDisplayName(spot.name, spot.created_at, spot.type)}
                  </span>
                  {userPosition && gpsState === 'available' && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mr-1">
                      {distanceTo(userPosition, { lat: spot.lat, lng: spot.lng })}
                    </span>
                  )}
                  {userId && spot.created_by === userId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(spot.id) }}
                      disabled={isPending}
                      className="shrink-0 min-w-11 min-h-11 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors text-base disabled:opacity-40"
                      aria-label="Plätzchen löschen"
                    >
                      🗑
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
