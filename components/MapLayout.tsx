'use client'

import { useState, useCallback, useEffect } from 'react'
import SpotMapClient from '@/components/SpotMapClient'
import BottomSheet from '@/components/BottomSheet'
import type { Spot } from '@/components/SpotMap'

export type GpsState = 'unknown' | 'available' | 'denied' | 'unavailable'

const GPS_BANNER_DISMISSED_KEY = 'benchmarks-gps-banner-dismissed'

interface MapLayoutProps {
  spots: Spot[]
  isAuthenticated: boolean
  userId: string | null
  isAdmin?: boolean
}

export default function MapLayout({ spots, isAuthenticated, userId, isAdmin = false }: MapLayoutProps) {
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null)
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

  const handleSpotSelect = useCallback((spotId: string) => {
    setSelectedSpotId(spotId)
  }, [])

  const handleSpotDeselect = useCallback(() => {
    setSelectedSpotId(null)
  }, [])

  const handleFlyToSpot = useCallback((spot: Spot) => {
    setFlyTarget({ lat: spot.lat, lng: spot.lng })
  }, [])

  const handlePositionUpdate = useCallback((pos: { lat: number; lng: number }) => {
    setUserPosition(pos)
  }, [])

  const handleGpsStateChange = useCallback((state: GpsState) => {
    setGpsState(state)
  }, [])

  return (
    <>
      <SpotMapClient
        spots={spots}
        isAuthenticated={isAuthenticated}
        userId={userId}
        sheetExpanded={sheetExpanded}
        onBenchSelect={handleSpotSelect}
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
        spots={spots}
        userId={userId}
        onExpandedChange={setSheetExpanded}
        selectedSpotId={selectedSpotId}
        onSpotSelect={handleSpotSelect}
        onSpotDeselect={handleSpotDeselect}
        onFlyToSpot={handleFlyToSpot}
        userPosition={userPosition}
        gpsState={gpsState}
      />
    </>
  )
}
