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
    html: `<div style="font-size:22px;line-height:1;filter:${grayscale ? 'grayscale(100%) ' : ''}drop-shadow(0 2px 4px rgba(0,0,0,0.4));transform:translateX(-4px)">🧍</div>`,
    className: '',
    iconSize: [22, 30],
    iconAnchor: [11, 30],
  })

export interface Bench {
  id: string
  lat: number
  lng: number
  name: string | null
  created_by: string | null
}

interface BenchMapProps {
  benches: Bench[]
  isAuthenticated: boolean
}

function LocationController({
  cachedPosition,
  onPositionFound,
}: {
  cachedPosition: [number, number] | null
  onPositionFound: (pos: [number, number]) => void
}) {
  const map = useMap()
  const centeredRef = useRef(false)

  useEffect(() => {
    if (cachedPosition && !centeredRef.current) {
      map.setView(cachedPosition, 14)
      centeredRef.current = true
    }
  }, [cachedPosition, map])

  useEffect(() => {
    if (!navigator.geolocation) {
      if (!centeredRef.current) {
        map.setView([51.1, 10.4], 11)
        centeredRef.current = true
      }
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        localStorage.setItem(LOCATION_KEY, JSON.stringify(latlng))
        onPositionFound(latlng)
        map.setView(latlng, 14)
        centeredRef.current = true
      },
      () => {
        if (!centeredRef.current) {
          map.setView([51.1, 10.4], 11)
          centeredRef.current = true
        }
      }
    )
  }, [map])

  return null
}

export default function BenchMap({ benches, isAuthenticated }: BenchMapProps) {
  const router = useRouter()
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)
  const [isGpsLive, setIsGpsLive] = useState(false)
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
        <LocationController cachedPosition={cachedPosition} onPositionFound={handlePositionFound} />

        <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
          {benches.map((bench) => (
            <Marker key={bench.id} position={[bench.lat, bench.lng]}>
              <Popup>{bench.name || 'Bank'}</Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {userPosition && (
          <Marker position={userPosition} icon={makeUserIcon(!isGpsLive)}>
            <Popup>{isGpsLive ? 'Dein Standort' : 'Letzter Standort (GPS lädt...)'}</Popup>
          </Marker>
        )}
      </MapContainer>

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
