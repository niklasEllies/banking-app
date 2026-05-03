'use client'

import { useState, useCallback } from 'react'
import BenchMapClient from '@/components/BenchMapClient'
import BottomSheet from '@/components/BottomSheet'
import type { Bench } from '@/components/BenchMap'

interface MapLayoutProps {
  benches: Bench[]
  isAuthenticated: boolean
  userId: string | null
}

export default function MapLayout({ benches, isAuthenticated, userId }: MapLayoutProps) {
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null)
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null)

  const handleBenchSelect = useCallback((benchId: string) => {
    setSelectedBenchId(benchId)
  }, [])

  const handleBenchDeselect = useCallback(() => {
    setSelectedBenchId(null)
  }, [])

  const handleFlyToBench = useCallback((bench: Bench) => {
    setFlyTarget({ lat: bench.lat, lng: bench.lng })
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
      />
      <BottomSheet
        benches={benches}
        userId={userId}
        onExpandedChange={setSheetExpanded}
        // @ts-ignore Task 8 adds these props to BottomSheet
        selectedBenchId={selectedBenchId}
        // @ts-ignore Task 8 adds these props to BottomSheet
        onBenchDeselect={handleBenchDeselect}
        // @ts-ignore Task 8 adds these props to BottomSheet
        onFlyToBench={handleFlyToBench}
      />
    </>
  )
}
