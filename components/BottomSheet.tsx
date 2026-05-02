'use client'

import { useState, useRef } from 'react'

interface BottomSheetProps {
  benchCount: number
}

export default function BottomSheet({ benchCount }: BottomSheetProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [dragY, setDragY] = useState(0)
  const startYRef = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - startYRef.current
    if (delta > 0) setDragY(delta)
  }

  const handleTouchEnd = () => {
    if (dragY > 80) setIsOpen(false)
    setDragY(0)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-1000 bg-white rounded-full px-4 py-2 shadow-md text-sm font-medium text-gray-700"
      >
        {benchCount} {benchCount === 1 ? 'Bank' : 'Bänke'} ↑
      </button>
    )
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-1000 bg-white rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.12)]"
      style={{
        transform: `translateY(${dragY}px)`,
        transition: dragY === 0 ? 'transform 0.2s ease' : 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex justify-center pt-3 pb-1 cursor-grab">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>
      <div className="px-5 py-3 pb-8">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{benchCount}</span>{' '}
          {benchCount === 1 ? 'Bank' : 'Bänke'} eingetragen
        </p>
      </div>
    </div>
  )
}
