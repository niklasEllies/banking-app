'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import type { Bench } from '@/components/BenchMap'
import { deleteBench } from '@/actions/benches'
import { benchDisplayName, distanceTo } from '@/lib/bench-utils'
import BenchDetail from '@/components/BenchDetail'
import { useSheetSwipe } from '@/components/useSheetSwipe'

type GpsState = 'unknown' | 'available' | 'denied' | 'unavailable'

interface BottomSheetProps {
  benches: Bench[]
  userId: string | null
  onExpandedChange: (expanded: boolean) => void
  selectedBenchId: string | null
  onBenchSelect: (benchId: string) => void
  onBenchDeselect: () => void
  onFlyToBench: (bench: Bench) => void
  userPosition: { lat: number; lng: number } | null
  gpsState?: GpsState
}

export default function BottomSheet({
  benches: initialBenches,
  userId,
  onExpandedChange,
  selectedBenchId,
  onBenchSelect,
  onBenchDeselect,
  onFlyToBench,
  userPosition,
  gpsState = 'unknown',
}: BottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [benches, setBenches] = useState(initialBenches)
  const [isPending, startTransition] = useTransition()
  const count = benches.length

  const selectedBench = benches.find(b => b.id === selectedBenchId) ?? null

  useEffect(() => {
    if (selectedBenchId) {
      setIsExpanded(true)
      onExpandedChange(true)
    }
  }, [selectedBenchId, onExpandedChange])

  const expand = () => { setIsExpanded(true); onExpandedChange(true) }
  const collapse = () => {
    setIsExpanded(false)
    onExpandedChange(false)
    onBenchDeselect()
  }

  const { dragY, handleProps, contentProps } = useSheetSwipe({
    onDismiss: collapse,
    enabled: isExpanded,
  })

  const handleDelete = (id: string) => {
    setBenches(prev => prev.filter(b => b.id !== id))
    startTransition(async () => {
      const result = await deleteBench(id)
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
        {selectedBenchId ? (
          <button onClick={onBenchDeselect} className="text-sm text-primary mt-2">
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
              className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Foto bearbeiten"
            >
              ✏️
            </Link>
          )}
          <button
            onClick={collapse}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
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
          <BenchDetail bench={selectedBench} userId={userId} />
        ) : count === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
            Noch keine Bänke eingetragen
          </p>
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
                    onFlyToBench(bench)
                    onBenchSelect(bench.id)
                  }}
                >
                  <span className="text-xl shrink-0">🪑</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate flex-1">
                    {benchDisplayName(bench.name, bench.created_at)}
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
                      className="shrink-0 text-red-400 hover:text-red-600 transition-colors text-base disabled:opacity-40"
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
