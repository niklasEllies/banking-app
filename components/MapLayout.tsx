'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  initialFavoriteIds?: string[]
  initialFriendIds?: string[]
  initialSpotId?: string | null
}

export default function MapLayout({
  spots,
  isAuthenticated,
  userId,
  isAdmin = false,
  initialFavoriteIds = [],
  initialFriendIds = [],
  initialSpotId = null,
}: MapLayoutProps) {
  const router = useRouter()
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(initialSpotId)
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null)
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsState, setGpsState] = useState<GpsState>('unknown')
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set(initialFavoriteIds))
  const [friendIds] = useState<Set<string>>(() => new Set(initialFriendIds))

  // Hydrate dismiss flag from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(GPS_BANNER_DISMISSED_KEY) === 'true') {
      setBannerDismissed(true)
    }
  }, [])

  // Deep-link: if landed with ?spot=<id>, fly to it on mount.
  // Empty deps — initialSpotId is server-injected once, not reactive.
  useEffect(() => {
    if (!initialSpotId) return
    const target = spots.find((s) => s.id === initialSpotId)
    if (target) setFlyTarget({ lat: target.lat, lng: target.lng })
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Clear deep-link query param if present
    if (typeof window !== 'undefined' && window.location.search.includes('spot=')) {
      router.replace('/map', { scroll: false })
    }
  }, [router])

  const handleFlyToSpot = useCallback((spot: Spot) => {
    setFlyTarget({ lat: spot.lat, lng: spot.lng })
  }, [])

  const handlePositionUpdate = useCallback((pos: { lat: number; lng: number }) => {
    setUserPosition(pos)
  }, [])

  const handleGpsStateChange = useCallback((state: GpsState) => {
    setGpsState(state)
  }, [])

  const handleFavoriteChange = useCallback((spotId: string, isFav: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (isFav) next.add(spotId)
      else next.delete(spotId)
      return next
    })
  }, [])

  return (
    <>
      <div className="contents" {...(sheetExpanded ? { inert: true } : {})}>
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
      </div>
      {!isAuthenticated && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-9999 bg-[#1d2218]/95 backdrop-blur-sm border border-[#5e9e3e]/40 rounded-full px-4 py-2 text-sm text-[#c8c8c0] flex items-center gap-3 shadow-lg pointer-events-auto whitespace-nowrap">
          <span>Du erkundest als Gast</span>
          <a href="/signup" className="text-[#5e9e3e] font-semibold hover:underline">Beta beitreten →</a>
        </div>
      )}
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
        favoriteIds={favoriteIds}
        onFavoriteChange={handleFavoriteChange}
        friendIds={friendIds}
      />
    </>
  )
}
