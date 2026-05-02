'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { Marker, Popup } from 'react-leaflet'
import { useRouter } from 'next/navigation'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const LOCATION_KEY = 'benchmarks_last_location'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

const makeUserIcon = (grayscale: boolean) =>
  new L.DivIcon({
    html: `<div style="font-size:30px;line-height:1;filter:${grayscale ? 'grayscale(100%) ' : ''}drop-shadow(0 2px 4px rgba(0,0,0,0.4))">🧍</div>`,
    className: '',
    iconSize: [30, 41],
    iconAnchor: [15, 41],
  })

const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount()
  return new L.DivIcon({
    html: `<div style="background:#3d6b2c;color:white;border:2px solid white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.25);font-family:system-ui,sans-serif">${count}</div>`,
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  })
}

export interface Bench {
  id: string
  lat: number
  lng: number
  name: string | null
  created_by: string | null
  created_at: string
}

interface BenchMapProps {
  benches: Bench[]
  isAuthenticated: boolean
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

  useEffect(() => {
    // Defer setView to next tick so Leaflet's container is fully initialized
    if (cachedPosition && !centeredRef.current) {
      const t = setTimeout(() => {
        map.setView(cachedPosition, 14)
        centeredRef.current = true
      }, 0)
      return () => clearTimeout(t)
    }
  }, [cachedPosition, map])

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
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        localStorage.setItem(LOCATION_KEY, JSON.stringify(latlng))
        onPositionFound(latlng)
        onLocating(false)
        map.setView(latlng, 14)
        centeredRef.current = true
      },
      () => {
        onLocating(false)
        if (!centeredRef.current) {
          map.setView([51.1, 10.4], 11)
          centeredRef.current = true
        }
      },
      // enableHighAccuracy: false uses network/wifi positioning — much faster (~1s vs 5-10s)
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
    )
  }, [map])

  return null
}

export default function BenchMap({ benches, isAuthenticated }: BenchMapProps) {
  const router = useRouter()
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)
  const [isGpsLive, setIsGpsLive] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [cachedPosition, setCachedPosition] = useState<[number, number] | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(LOCATION_KEY)
    if (raw) {
      try {
        const pos = JSON.parse(raw) as [number, number]
        setCachedPosition(pos)
        setUserPosition(pos)
        setIsGpsLive(false)
      } catch {}
    }
  }, [])

  const handlePositionFound = useCallback((pos: [number, number]) => {
    setUserPosition(pos)
    setIsGpsLive(true)
  }, [])

  const handleLocating = useCallback((v: boolean) => setIsLocating(v), [])

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
        <LocationController
          cachedPosition={cachedPosition}
          onPositionFound={handlePositionFound}
          onLocating={handleLocating}
        />

        <MarkerClusterGroup chunkedLoading maxClusterRadius={60} iconCreateFunction={createClusterIcon}>
          {benches.map((bench) => (
            <Marker key={bench.id} position={[bench.lat, bench.lng]}>
              <Popup>
                {bench.name || `Bank vom ${new Date(bench.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}`}
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {userPosition && (
          <Marker position={userPosition} icon={makeUserIcon(!isGpsLive)}>
            <Popup>{isGpsLive ? 'Dein Standort' : 'Letzter Standort (GPS lädt...)'}</Popup>
          </Marker>
        )}
      </MapContainer>

      {isLocating && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-1000 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm flex items-center gap-2 text-xs text-gray-600">
          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
          Standort wird ermittelt…
        </div>
      )}

      {isAuthenticated && (
        <button
          onClick={handleFabClick}
          className="absolute bottom-28 right-4 z-1000 w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center text-2xl hover:bg-primary-dark active:scale-95 transition-all"
          aria-label="Bank eintragen"
        >
          +
        </button>
      )}
    </div>
  )
}
