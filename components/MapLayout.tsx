'use client'

import { useState, useCallback, useEffect } from 'react'
import BenchMapClient from '@/components/BenchMapClient'
import BottomSheet from '@/components/BottomSheet'
import type { Bench } from '@/components/BenchMap'

export type GpsState = 'unknown' | 'available' | 'denied' | 'unavailable'

const GPS_BANNER_DISMISSED_KEY = 'benchmarks-gps-banner-dismissed'

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
  const [gpsState, setGpsState] = useState<GpsState>('unknown')
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // Hydrate dismiss flag from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(GPS_BANNER_DISMISSED_KEY) === 'true') {
      setBannerDismissed(true)
    }
  }, [])

  const handleDismissBanner = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GPS_BANNER_DISMISSED_KEY, 'true')
    }
    setBannerDismissed(true)
  }, [])

  const showBanner = !bannerDismissed && (gpsState === 'denied' || gpsState === 'unavailable')

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

  const handleGpsStateChange = useCallback((state: GpsState) => {
    setGpsState(state)
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
        onGpsStateChange={handleGpsStateChange}
        gpsState={gpsState}
      />
      {showBanner && (
        <div
          role="status"
          className="absolute top-16 left-0 right-0 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-4 py-3 flex items-start gap-3 z-[600]"
        >
          <span aria-hidden="true" className="flex-shrink-0 mt-0.5">⚠️</span>
          <p className="text-sm flex-1">
            Standort nicht verfügbar — Distanz und Zentrieren-Button sind deaktiviert.
            Erlaube den Standort in den Browser-Einstellungen.
          </p>
          <button
            onClick={handleDismissBanner}
            aria-label="Hinweis schließen"
            className="flex-shrink-0 p-2 -m-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40"
          >
            ✕
          </button>
        </div>
      )}
      <BottomSheet
        benches={benches}
        userId={userId}
        onExpandedChange={setSheetExpanded}
        selectedBenchId={selectedBenchId}
        onBenchSelect={handleBenchSelect}
        onBenchDeselect={handleBenchDeselect}
        onFlyToBench={handleFlyToBench}
        userPosition={userPosition}
        gpsState={gpsState}
      />
    </>
  )
}
