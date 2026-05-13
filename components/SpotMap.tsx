'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { IconCurrentLocation, IconLocationFilled } from '@tabler/icons-react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { useRouter } from 'next/navigation'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { deleteSpot } from '@/actions/spots'
import SpotPopup from '@/components/SpotPopup'
import { type SpotType } from '@/lib/spot-types'
import type { SpotVisibility } from '@/lib/spot-visibility'
import { buildPinSvg, buildClusterSvg, PIN_SIZE, PIN_ANCHOR, PIN_POPUP_ANCHOR } from '@/lib/spot-marker-svg'

const LOCATION_KEY = 'benchmarks_last_location'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

const makeUserIcon = (emoji: string, grayscale: boolean) =>
  new L.DivIcon({
    html: `<div style="font-size:30px;line-height:1;filter:${grayscale ? 'grayscale(100%) ' : ''}drop-shadow(0 4px 8px rgba(0,0,0,0.7))">
      ${emoji}
    </div>`,
    className: '',
    iconSize: [30, 41],
    iconAnchor: [15, 41],
  })

const ICON_CACHE = new Map<SpotType, L.DivIcon>()

function getSpotIcon(type: SpotType): L.DivIcon {
  const cached = ICON_CACHE.get(type)
  if (cached) return cached
  const icon = new L.DivIcon({
    html: buildPinSvg(type),
    className: '',
    iconSize: PIN_SIZE,
    iconAnchor: PIN_ANCHOR,
    popupAnchor: PIN_POPUP_ANCHOR,
  })
  ICON_CACHE.set(type, icon)
  return icon
}

const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount()
  return new L.DivIcon({
    html: buildClusterSvg(count),
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

export interface Spot {
  id: string
  type: SpotType
  visibility: SpotVisibility
  lat: number
  lng: number
  name: string | null
  created_by: string | null
  created_at: string
  photo_url: string | null
}

type GpsState = 'unknown' | 'available' | 'denied' | 'unavailable'

interface SpotMapProps {
  spots: Spot[]
  isAuthenticated: boolean
  userId: string | null
  sheetExpanded: boolean
  onBenchSelect?: (benchId: string) => void
  flyTarget?: { lat: number; lng: number } | null
  onFlyTargetUsed?: () => void
  isAdmin?: boolean
  onPositionUpdate?: (pos: { lat: number; lng: number }) => void
  onGpsStateChange?: (state: GpsState) => void
  gpsState?: GpsState
  /** Server-resolved marker emoji from profiles.marker_emoji. Anon = null = default. */
  initialMarkerEmoji?: string | null
}


function FlyController({
  target,
  onUsed,
}: {
  target: { lat: number; lng: number } | null
  onUsed: () => void
}) {
  const map = useMap()
  const prev = useRef<typeof target>(null)
  useEffect(() => {
    if (target && target !== prev.current) {
      prev.current = target
      map.flyTo([target.lat, target.lng], 16, { duration: 1 })
      onUsed()
    }
  }, [target, map, onUsed])
  return null
}

function AdminClickController({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter()
  useMapEvents({
    click(e) {
      if (isAdmin) {
        router.push(`/spots/new?lat=${e.latlng.lat.toFixed(6)}&lng=${e.latlng.lng.toFixed(6)}`)
      }
    },
  })
  return null
}

function CenterController({ position, trigger }: { position: [number, number] | null; trigger: number }) {
  const map = useMap()
  const prev = useRef(0)
  useEffect(() => {
    if (trigger !== prev.current && position) {
      prev.current = trigger
      map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 1 })
    }
  }, [trigger, position, map])
  return null
}

function FollowController({
  position,
  enabled,
  onPanBreak,
}: {
  position: [number, number] | null
  enabled: boolean
  onPanBreak: () => void
}) {
  const map = useMap()
  // Auto-fly to position whenever it changes, only when enabled
  useEffect(() => {
    if (enabled && position) {
      map.flyTo(position, map.getZoom(), { duration: 0.5 })
    }
  }, [position, enabled, map])

  // Detect user-initiated pan to break follow
  useMapEvents({
    dragstart() {
      onPanBreak()
    },
    // User-initiated pinch-zoom on mobile doesn't fire dragstart — catch it via zoomstart.
    // FollowController's flyTo passes map.getZoom() so zoom doesn't change → no self-trigger.
    zoomstart() {
      onPanBreak()
    },
  })
  return null
}

function LocationController({
  cachedPosition,
  onPositionFound,
  onLiveUpdate,
  onLocating,
  onGpsStateChange,
  liveTracking,
}: {
  cachedPosition: [number, number] | null
  onPositionFound: (pos: [number, number]) => void
  onLiveUpdate: (pos: [number, number]) => void
  onLocating: (v: boolean) => void
  onGpsStateChange?: (state: GpsState) => void
  liveTracking: boolean
}) {
  const map = useMap()
  const centeredRef = useRef(false)

  // Refs let us read latest values from watchPosition callback without re-running the effect
  const liveTrackingRef = useRef(liveTracking)
  const onLiveUpdateRef = useRef(onLiveUpdate)
  useEffect(() => { liveTrackingRef.current = liveTracking }, [liveTracking])
  useEffect(() => { onLiveUpdateRef.current = onLiveUpdate }, [onLiveUpdate])

  // Center on cached position immediately (deferred so Leaflet container is ready)
  useEffect(() => {
    if (cachedPosition && !centeredRef.current) {
      const t = setTimeout(() => {
        map.setView(cachedPosition, 14)
        centeredRef.current = true
      }, 0)
      return () => clearTimeout(t)
    }
  }, [cachedPosition, map])

  // Two-phase GPS: fast network first, then accurate GPS
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      onGpsStateChange?.('unavailable')
      setTimeout(() => {
        if (!centeredRef.current) {
          map.setView([51.1, 10.4], 11)
          centeredRef.current = true
        }
      }, 0)
      return
    }

    onLocating(true)
    let watchId: number | undefined

    // Phase 1: Quick network/wifi position (~< 1s)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        localStorage.setItem(LOCATION_KEY, JSON.stringify(latlng))
        onPositionFound(latlng)
        onLocating(false)
        onGpsStateChange?.('available')
        if (!centeredRef.current) {
          map.setView(latlng, 14)
          centeredRef.current = true
        }
      },
      (err) => {
        onLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          onGpsStateChange?.('denied')
        } else {
          onGpsStateChange?.('unavailable')
        }
        if (!centeredRef.current) {
          setTimeout(() => {
            map.setView([51.1, 10.4], 11)
            centeredRef.current = true
          }, 0)
        }
      },
      { enableHighAccuracy: false, maximumAge: 60000 }
    )

    // Phase 2: Accurate GPS — first accurate fix locks position; optional live-tracking keeps updating
    let lockedFirstFix = false
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = pos.coords.accuracy
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        if (acc < 80 && !lockedFirstFix) {
          lockedFirstFix = true
          localStorage.setItem(LOCATION_KEY, JSON.stringify(latlng))
          onPositionFound(latlng)
          onLocating(false)
          onGpsStateChange?.('available')
          map.flyTo(latlng, Math.max(map.getZoom(), 14), { duration: 1.5 })
          if (!liveTrackingRef.current && watchId !== undefined) {
            navigator.geolocation.clearWatch(watchId)
            watchId = undefined
          }
        } else if (liveTrackingRef.current && lockedFirstFix && acc < 200) {
          // Skip localStorage write in live-update path: cache is for next-visit centering,
          // not real-time tracking. Real-time writes block the main thread once per second.
          onLiveUpdateRef.current(latlng)
        }
      },
      (err) => {
        onLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          onGpsStateChange?.('denied')
        }
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    )

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId)
        onLocating(false)
      }
    }
  }, [map, onPositionFound, onLocating, onGpsStateChange])

  return null
}

export default function SpotMap({
  spots: initialSpots,
  isAuthenticated,
  userId,
  sheetExpanded,
  onBenchSelect,
  flyTarget,
  onFlyTargetUsed,
  isAdmin = false,
  onPositionUpdate,
  onGpsStateChange,
  gpsState = 'unknown',
  initialMarkerEmoji = null,
}: SpotMapProps) {
  const router = useRouter()
  const [localSpots, setLocalSpots] = useState(initialSpots)
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)
  const [hasLivePosition, setHasLivePosition] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [cachedPosition, setCachedPosition] = useState<[number, number] | null>(null)
  const userEmoji = initialMarkerEmoji ?? '🧍‍♂️'
  const [centerTrigger, setCenterTrigger] = useState(0)
  const [liveTracking, setLiveTracking] = useState(false)
  const [followBroken, setFollowBroken] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(LOCATION_KEY)
    if (raw) {
      try {
        const pos = JSON.parse(raw) as [number, number]
        setCachedPosition(pos)
        setUserPosition(pos)
      } catch {}
    }
  }, [])

  // Both initial-fix and live-update do the same thing: update user position state +
  // propagate to parent. LocationController separates them only to gate the watchPosition
  // lifecycle; here they collapse.
  const handlePositionUpdate = useCallback((pos: [number, number]) => {
    setUserPosition(pos)
    setHasLivePosition(true)
    onPositionUpdate?.({ lat: pos[0], lng: pos[1] })
  }, [onPositionUpdate])

  const handleLocating = useCallback((v: boolean) => setIsLocating(v), [])

  const handleDelete = useCallback(async (id: string) => {
    setLocalSpots(prev => prev.filter(s => s.id !== id))
    const result = await deleteSpot(id)
    if (result.error) setLocalSpots(initialSpots)
  }, [initialSpots])

  const handleFabClick = () => {
    router.push('/spots/from-photo')
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
          center={[51.1, 10.4]}
          zoom={11}
          className="w-full h-full"
          zoomControl={false}
          style={isAdmin ? { cursor: 'crosshair' } : undefined}
        >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CenterController position={userPosition} trigger={centerTrigger} />
        <FlyController target={flyTarget ?? null} onUsed={onFlyTargetUsed ?? (() => {})} />
        <AdminClickController isAdmin={isAdmin} />
        <LocationController
          cachedPosition={cachedPosition}
          onPositionFound={handlePositionUpdate}
          onLiveUpdate={handlePositionUpdate}
          onLocating={handleLocating}
          onGpsStateChange={onGpsStateChange}
          liveTracking={liveTracking}
        />
        <FollowController
          position={userPosition}
          enabled={liveTracking && !followBroken}
          onPanBreak={() => setFollowBroken(true)}
        />

        <MarkerClusterGroup chunkedLoading maxClusterRadius={60} iconCreateFunction={createClusterIcon}>
          {localSpots.map((spot) => (
            <Marker key={spot.id} position={[spot.lat, spot.lng]} icon={getSpotIcon(spot.type)}>
              <Popup>
                <SpotPopup
                  spot={spot}
                  userId={userId}
                  onDetails={() => onBenchSelect?.(spot.id)}
                  onDelete={() => handleDelete(spot.id)}
                />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {userPosition && (
          <Marker position={userPosition} icon={makeUserIcon(userEmoji, !hasLivePosition)}>
            <Popup>{hasLivePosition ? 'Dein Standort' : 'Letzter Standort (GPS lädt…)'}</Popup>
          </Marker>
        )}
      </MapContainer>

      {isLocating && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-1000 bg-white/90 dark:bg-[#1e231a]/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
          Standort wird ermittelt…
        </div>
      )}

      {userPosition && (
        <button
          onClick={() => {
            const next = !liveTracking
            setLiveTracking(next)
            if (next) {
              setFollowBroken(false)
            }
          }}
          disabled={gpsState !== 'available'}
          aria-pressed={liveTracking}
          aria-label={liveTracking ? 'Live-Tracking deaktivieren' : 'Live-Tracking aktivieren'}
          className={`absolute right-4 z-1000 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${
            gpsState !== 'available'
              ? 'opacity-40 cursor-not-allowed bg-white dark:bg-[#1e231a]'
              : liveTracking
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'bg-white dark:bg-[#1e231a] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#242a1e]'
          }`}
          style={{
            bottom: sheetExpanded
              ? `calc(55vh + ${isAuthenticated ? 168 : 96}px)`
              : isAuthenticated ? '14.5rem' : '10rem',
            transition: 'bottom 0.25s ease',
          }}
        >
          <IconLocationFilled size={20} stroke={1.5} aria-hidden />
        </button>
      )}

      {userPosition && (
        <button
          onClick={() => {
            setCenterTrigger(t => t + 1)
            setFollowBroken(false)
          }}
          disabled={gpsState !== 'available'}
          className={`absolute right-4 z-1000 w-14 h-14 bg-white dark:bg-[#1e231a] rounded-full shadow-lg flex items-center justify-center text-xl active:scale-95 transition-transform ${
            gpsState !== 'available'
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-gray-50 dark:hover:bg-[#242a1e]'
          }`}
          style={{
            bottom: sheetExpanded
              ? `calc(55vh + ${isAuthenticated ? 88 : 16}px)`
              : isAuthenticated ? '9.5rem' : '5rem',
            transition: 'bottom 0.25s ease',
          }}
          aria-label={gpsState === 'available' ? 'Auf Standort zentrieren' : 'Standort nicht verfügbar'}
        >
          <IconCurrentLocation size={22} aria-hidden />
        </button>
      )}

      {isAuthenticated && (
        <button
          onClick={handleFabClick}
          className="absolute right-4 z-1000 w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center text-2xl hover:bg-primary-dark active:scale-95"
          style={{
            bottom: sheetExpanded ? 'calc(55vh + 16px)' : '5rem',
            transition: 'bottom 0.25s ease',
          }}
          aria-label="Plätzchen mit Foto eintragen"
        >
          +
        </button>
      )}
    </div>
  )
}
