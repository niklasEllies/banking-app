'use client'

import { useState, useRef } from 'react'
import type { Bench } from '@/components/BenchMap'

type SheetState = 'hidden' | 'peek' | 'expanded'

interface BottomSheetProps {
  benches: Bench[]
}

export default function BottomSheet({ benches }: BottomSheetProps) {
  const [state, setState] = useState<SheetState>('peek')
  const [dragY, setDragY] = useState(0)
  const startYRef = useRef(0)
  const count = benches.length

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - startYRef.current
    if (state === 'peek' && delta < -40) {
      setState('expanded')
      setDragY(0)
    } else if (state === 'expanded' && delta > 40) {
      setState('peek')
      setDragY(0)
    } else if (state === 'peek' && delta > 0) {
      setDragY(delta)
    }
  }

  const handleTouchEnd = () => {
    if (state === 'peek' && dragY > 60) {
      setState('hidden')
    }
    setDragY(0)
  }

  if (state === 'hidden') {
    return (
      <button
        onClick={() => setState('peek')}
        className="absolute bottom-28 left-1/2 -translate-x-1/2 z-1000 bg-white rounded-full px-4 py-2 shadow-md text-sm font-medium text-gray-700 border border-gray-200"
      >
        {count} {count === 1 ? 'Bank' : 'Bänke'} ↑
      </button>
    )
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-1000 bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
      style={{
        transform: `translateY(${dragY}px)`,
        transition: dragY === 0 ? 'transform 0.25s ease' : 'none',
        maxHeight: state === 'expanded' ? '55vh' : '88px',
        overflow: state === 'expanded' ? 'hidden' : 'visible',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag handle + header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2 cursor-grab select-none">
        <div className="absolute left-1/2 -translate-x-1/2 top-3 w-10 h-1 bg-gray-300 rounded-full" />
        <p className="text-sm font-semibold text-gray-900 mt-2">
          {count} {count === 1 ? 'Bank' : 'Bänke'}
        </p>
        <button
          onClick={() => setState('hidden')}
          className="mt-2 text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Schließen"
        >
          ✕
        </button>
      </div>

      {/* Bench list — only visible in expanded state */}
      {state === 'expanded' && (
        <div className="overflow-y-auto pb-8" style={{ maxHeight: 'calc(55vh - 56px)' }}>
          {count === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Noch keine Bänke eingetragen</p>
          ) : (
            <ul>
              {benches.map((bench) => (
                <li
                  key={bench.id}
                  className="flex items-center gap-3 px-5 py-3 border-t border-gray-100"
                >
                  <span className="text-xl shrink-0">🪑</span>
                  <span className="text-sm text-gray-800 truncate">
                    {bench.name || <span className="text-gray-400 italic">Bank ohne Namen</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Hint when in peek state */}
      {state === 'peek' && (
        <p className="text-xs text-gray-400 text-center pb-3">nach oben wischen für Details</p>
      )}
    </div>
  )
}
