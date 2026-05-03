'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { useRouter } from 'next/navigation'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { deleteBench } from '@/actions/benches'
import { benchDisplayName } from '@/lib/bench-utils'
import BenchPopup from '@/components/BenchPopup'

const LOCATION_KEY = 'benchmarks_last_location'
const EMOJI_KEY = 'benchmarks_user_emoji'

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

const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount()
  return new L.DivIcon({
    html: `<div style="
      background:white;
      border:2px solid #3d6b2c;
      border-radius:20px;
      padding:4px 10px;
      display:inline-flex;
      align-items:center;
      gap:4px;
      font-family:system-ui,sans-serif;
      box-shadow:0 2px 8px rgba(0,0,0,0.2);
      white-space:nowrap;
    ">
      <span style="font-size:16px;line-height:1">🪑</span>
      <span style="font-weight:700;font-size:13px;color:#3d6b2c">×${count}</span>
    </div>`,
    className: '',
    iconSize: [70, 32],
    iconAnchor: [35, 16],
  })
}

export interface Bench {
  id: string
  lat: number
  lng: number
  name: string | null
  created_by: string | null
  created_at: string
  photo_url: string | null
}

interface BenchMapProps {
  benches: Bench[]
  isAuthenticated: boolean
  userId: string | null
  sheetExpanded: boolean
  onBenchSelect?: (benchId: string) => void
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

function LocationController({
  cachedPosition,
  onPositionFound,
  onLocating,
}: {
  cachedPosition: [number, number] | null
  onPositionFound: (pos: [number, number]) => void
  onLocating: (v: boolean) => void
}) {
  const map = useMap()
  const centeredRef = useRef(false)

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
    if (!navigator.geolocation) {
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
        if (!centeredRef.current) {
          map.setView(latlng, 14)
          centeredRef.current = true
        }
      },
      () => {
        onLocating(false)
        if (!centeredRef.current) {
          setTimeout(() => {
            map.setView([51.1, 10.4], 11)
            centeredRef.current = true
          }, 0)
        }
      },
      { enableHighAccuracy: false, maximumAge: 60000 }
    )

    // Phase 2: Accurate GPS — flies to corrected position when ready
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (pos.coords.accuracy < 80) {
          const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude]
          localStorage.setItem(LOCATION_KEY, JSON.stringify(latlng))
          onPositionFound(latlng)
          onLocating(false)
          map.flyTo(latlng, Math.max(map.getZoom(), 14), { duration: 1.5 })
          if (watchId !== undefined) {
            navigator.geolocation.clearWatch(watchId)
            watchId = undefined
          }
        }
      },
      () => { onLocating(false) },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    )

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId)
        onLocating(false)
      }
    }
  }, [map, onPositionFound, onLocating])

  return null
}

export default function BenchMap({ benches: initialBenches, isAuthenticated, userId, sheetExpanded, onBenchSelect }: BenchMapProps) {
  const router = useRouter()
  const [localBenches, setLocalBenches] = useState(initialBenches)
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)
  const [hasLivePosition, setHasLivePosition] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [cachedPosition, setCachedPosition] = useState<[number, number] | null>(null)
  const [userEmoji, setUserEmoji] = useState('🧍‍♂️')
  const [centerTrigger, setCenterTrigger] = useState(0)

  useEffect(() => {
    setUserEmoji(localStorage.getItem(EMOJI_KEY) ?? '🧍‍♂️')
    const raw = localStorage.getItem(LOCATION_KEY)
    if (raw) {
      try {
        const pos = JSON.parse(raw) as [number, number]
        setCachedPosition(pos)
        setUserPosition(pos)
      } catch {}
    }
  }, [])

  const handlePositionFound = useCallback((pos: [number, number]) => {
    setUserPosition(pos)
    setHasLivePosition(true)
  }, [])

  const handleLocating = useCallback((v: boolean) => setIsLocating(v), [])

  const handleDelete = useCallback(async (id: string) => {
    setLocalBenches(prev => prev.filter(b => b.id !== id))
    const result = await deleteBench(id)
    if (result.error) setLocalBenches(initialBenches)
  }, [initialBenches])

  const handleFabClick = () => {
    if (userPosition) {
      router.push(`/benches/new?lat=${userPosition[0].toFixed(6)}&lng=${userPosition[1].toFixed(6)}`)
      return
    }
    navigator.geolocation?.getCurrentPosition(
      (pos) => router.push(`/benches/new?lat=${pos.coords.latitude.toFixed(6)}&lng=${pos.coords.longitude.toFixed(6)}`),
      () => router.push('/benches/new?lat=51.1&lng=10.4')
    )
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer center={[51.1, 10.4]} zoom={11} className="w-full h-full" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CenterController position={userPosition} trigger={centerTrigger} />
        <LocationController
          cachedPosition={cachedPosition}
          onPositionFound={handlePositionFound}
          onLocating={handleLocating}
        />

        <MarkerClusterGroup chunkedLoading maxClusterRadius={60} iconCreateFunction={createClusterIcon}>
          {localBenches.map((bench) => (
            <Marker key={bench.id} position={[bench.lat, bench.lng]}>
              <Popup>
                <BenchPopup
                  bench={bench}
                  userId={userId}
                  rarityMedian={null}
                  onDetails={() => onBenchSelect?.(bench.id)}
                  onDelete={() => handleDelete(bench.id)}
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
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-1000 bg-white/90 dark:bg-[#252720]/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
          Standort wird ermittelt…
        </div>
      )}

      {userPosition && (
        <button
          onClick={() => setCenterTrigger(t => t + 1)}
          className="absolute right-4 z-1000 w-14 h-14 bg-white dark:bg-[#252720] rounded-full shadow-lg flex items-center justify-center text-xl hover:bg-gray-50 dark:hover:bg-[#2e3028] active:scale-95 transition-transform"
          style={{
            bottom: sheetExpanded
              ? `calc(55vh + ${isAuthenticated ? 88 : 16}px)`
              : isAuthenticated ? '9.5rem' : '5rem',
            transition: 'bottom 0.25s ease',
          }}
          aria-label="Auf Standort zentrieren"
        >
          📍
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
          aria-label="Bank eintragen"
        >
          +
        </button>
      )}
    </div>
  )
}
