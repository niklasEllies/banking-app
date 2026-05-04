'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import type { Spot } from '@/components/SpotMap'
import { deleteSpot } from '@/actions/spots'
import { spotDisplayName, distanceTo } from '@/lib/spot-utils'
import SpotDetail from '@/components/SpotDetail'
import { useSheetSwipe } from '@/components/useSheetSwipe'

type GpsState = 'unknown' | 'available' | 'denied' | 'unavailable'

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
}

export default function BottomSheet({
  spots: initialBenches,
  userId,
  onExpandedChange,
  selectedSpotId,
  onSpotSelect,
  onSpotDeselect,
  onFlyToSpot,
  userPosition,
  gpsState = 'unknown',
}: BottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [benches, setBenches] = useState(initialBenches)
  const [isPending, startTransition] = useTransition()
  const count = benches.length

  const selectedBench = benches.find(b => b.id === selectedSpotId) ?? null

  useEffect(() => {
    if (selectedSpotId) {
      setIsExpanded(true)
      onExpandedChange(true)
    }
  }, [selectedSpotId, onExpandedChange])

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
    setBenches(prev => prev.filter(b => b.id !== id))
    startTransition(async () => {
      const result = await deleteSpot(id)
      if (result.error) setBenches(initialBenches)
    })
  }

  if (!isExpanded) {
    return (
      <button
        onClick={expand}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-1000 bg-white dark:bg-[#1e231a] rounded-full px-4 py-2 shadow-md text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#2a2f24]"
      >
        {count} {count === 1 ? 'Bank' : 'Bänke'} ↑
      </button>
    )
  }

  return (
    <div
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
        <div className="absolute left-1/2 -translate-x-1/2 top-3 w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        {selectedSpotId ? (
          <button onClick={onSpotDeselect} className="text-sm text-primary mt-2">
            ← Alle Bänke
          </button>
        ) : (
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-2">
            {count} {count === 1 ? 'Bank' : 'Bänke'}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {selectedBench && userId === selectedBench.created_by && (
            <Link
              href={`/benches/${selectedBench.id}/edit-photo`}
              className="min-w-11 min-h-11 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Foto bearbeiten"
            >
              ✏️
            </Link>
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

      {/* Content (scroll-aware: only swipes when scrolled to top) */}
      <div
        className="overflow-y-auto pb-8"
        style={{ height: 'calc(55vh - 56px)' }}
        {...contentProps}
      >
        {selectedBench ? (
          <SpotDetail spot={selectedBench} userId={userId} />
        ) : count === 0 ? (
          <div className="py-12 px-6 text-center">
            <div className="text-5xl mb-3">🪑</div>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Noch keine Bänke in der Nähe.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tippe auf <strong className="text-primary">+</strong> unten rechts, um deine erste einzutragen.
            </p>
          </div>
        ) : (
          <>
            {gpsState !== 'available' && gpsState !== 'unknown' && (
              <div className="px-5 py-2 text-xs italic text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#2a2f24]">
                📍 Standort aus — Distanzen werden nicht angezeigt
              </div>
            )}
            <ul>
              {benches.map((bench) => (
                <li
                  key={bench.id}
                  className="flex items-center gap-3 px-5 py-3 border-t border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1f14] active:bg-gray-100 dark:active:bg-[#161a10]"
                  onClick={() => {
                    onFlyToSpot(bench)
                    onSpotSelect(bench.id)
                  }}
                >
                  <span className="text-xl shrink-0">🪑</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate flex-1">
                    {spotDisplayName(bench.name, bench.created_at, bench.type)}
                  </span>
                  {userPosition && gpsState === 'available' && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mr-1">
                      {distanceTo(userPosition, { lat: bench.lat, lng: bench.lng })}
                    </span>
                  )}
                  {userId && bench.created_by === userId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(bench.id) }}
                      disabled={isPending}
                      className="shrink-0 min-w-11 min-h-11 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors text-base disabled:opacity-40"
                      aria-label="Bank löschen"
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
