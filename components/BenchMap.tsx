'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import { useRouter } from 'next/navigation'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

const userLocationIcon = new L.DivIcon({
  html: '<div style="font-size:22px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));transform:translateX(-4px)">🧍</div>',
  className: '',
  iconSize: [22, 30],
  iconAnchor: [11, 30],
})

export interface Bench {
  id: string
  lat: number
  lng: number
  name: string | null
}

interface BenchMapProps {
  benches: Bench[]
  isAuthenticated: boolean
}

function LocationController({ onPositionFound }: { onPositionFound: (pos: [number, number]) => void }) {
  const map = useMap()
  const centeredRef = { current: false }

  useEffect(() => {
    if (!navigator.geolocation) {
      map.setView([51.1, 10.4], 11)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        if (!centeredRef.current) {
          map.setView(latlng, 14)
          centeredRef.current = true
        }
        onPositionFound(latlng)
      },
      () => {
        map.setView([51.1, 10.4], 11)
      }
    )
  }, [map])

  return null
}

export default function BenchMap({ benches, isAuthenticated }: BenchMapProps) {
  const router = useRouter()
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)

  const handlePositionFound = useCallback((pos: [number, number]) => {
    setUserPosition(pos)
  }, [])

  const handleFabClick = () => {
    if (userPosition) {
      router.push(`/benches/new?lat=${userPosition[0].toFixed(6)}&lng=${userPosition[1].toFixed(6)}`)
    } else {
      navigator.geolocation?.getCurrentPosition(
        (pos) => router.push(`/benches/new?lat=${pos.coords.latitude.toFixed(6)}&lng=${pos.coords.longitude.toFixed(6)}`),
        () => router.push('/benches/new?lat=51.1&lng=10.4')
      )
    }
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[51.1, 10.4]}
        zoom={11}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationController onPositionFound={handlePositionFound} />

        {benches.map((bench) => (
          <Marker key={bench.id} position={[bench.lat, bench.lng]}>
            <Popup>{bench.name || 'Bank'}</Popup>
          </Marker>
        ))}

        {userPosition && (
          <Marker position={userPosition} icon={userLocationIcon}>
            <Popup>Dein Standort</Popup>
          </Marker>
        )}
      </MapContainer>

      {isAuthenticated && (
        <button
          onClick={handleFabClick}
          className="absolute bottom-28 right-4 z-1000 w-14 h-14 bg-green-700 text-white rounded-full shadow-xl flex items-center justify-center text-2xl hover:bg-green-800 active:scale-95 transition-all"
          aria-label="Bank eintragen"
        >
          +
        </button>
      )}
    </div>
  )
}
