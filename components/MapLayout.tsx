'use client'

import { useState, useCallback } from 'react'
import BenchMapClient from '@/components/BenchMapClient'
import BottomSheet from '@/components/BottomSheet'
import type { Bench } from '@/components/BenchMap'

interface MapLayoutProps {
  benches: Bench[]
  isAuthenticated: boolean
  userId: string | null
  isAdmin?: boolean
}

export default function MapLayout({ benches, isAuthenticated, userId, isAdmin = false }: MapLayoutProps) {
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null)
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null)
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null)

  const handleBenchSelect = useCallback((benchId: string) => {
    setSelectedBenchId(benchId)
  }, [])

  const handleBenchDeselect = useCallback(() => {
    setSelectedBenchId(null)
  }, [])

  const handleFlyToBench = useCallback((bench: Bench) => {
    setFlyTarget({ lat: bench.lat, lng: bench.lng })
  }, [])

  const handlePositionUpdate = useCallback((pos: { lat: number; lng: number }) => {
    setUserPosition(pos)
  }, [])

  return (
    <>
      <BenchMapClient
        benches={benches}
        isAuthenticated={isAuthenticated}
        userId={userId}
        sheetExpanded={sheetExpanded}
        onBenchSelect={handleBenchSelect}
        flyTarget={flyTarget}
        onFlyTargetUsed={() => setFlyTarget(null)}
        isAdmin={isAdmin}
        onPositionUpdate={handlePositionUpdate}
      />
      <BottomSheet
        benches={benches}
        userId={userId}
        onExpandedChange={setSheetExpanded}
        selectedBenchId={selectedBenchId}
        onBenchSelect={handleBenchSelect}
        onBenchDeselect={handleBenchDeselect}
        onFlyToBench={handleFlyToBench}
        userPosition={userPosition}
      />
    </>
  )
}
