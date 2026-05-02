'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import { useRouter } from 'next/navigation'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Leaflet-Icons zeigen mit Webpack/Next.js auf den falschen Pfad.
// Wir verweisen manuell auf die Dateien in public/leaflet/.
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

const selectedIcon = new L.Icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'hue-rotate-90',
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

function LocationController() {
  const map = useMap()
  useEffect(() => {
    if (!navigator.geolocation) {
      map.setView([51.1, 10.4], 6)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 14),
      () => map.setView([51.1, 10.4], 6)
    )
  }, [map])
  return null
}

function ClickHandler({
  enabled,
  onMapClick,
}: {
  enabled: boolean
  onMapClick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click: (e) => {
      if (enabled) onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function BenchMap({ benches, isAuthenticated }: BenchMapProps) {
  const router = useRouter()
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null)

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[51.1, 10.4]}
        zoom={6}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationController />
        <ClickHandler
          enabled={isAuthenticated}
          onMapClick={(lat, lng) => setSelectedCoords({ lat, lng })}
        />
        {benches.map((bench) => (
          <Marker key={bench.id} position={[bench.lat, bench.lng]}>
            <Popup>{bench.name || 'Bank'}</Popup>
          </Marker>
        ))}
        {selectedCoords && (
          <Marker
            position={[selectedCoords.lat, selectedCoords.lng]}
            icon={selectedIcon}
          />
        )}
      </MapContainer>

      {selectedCoords && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-1000 flex gap-2">
          <button
            onClick={() =>
              router.push(
                `/benches/new?lat=${selectedCoords.lat.toFixed(6)}&lng=${selectedCoords.lng.toFixed(6)}`
              )
            }
            className="bg-green-700 text-white px-5 py-2.5 rounded-full shadow-lg font-medium text-sm whitespace-nowrap"
          >
            Hier eintragen
          </button>
          <button
            onClick={() => setSelectedCoords(null)}
            className="bg-white text-gray-600 px-3 py-2.5 rounded-full shadow-lg text-sm"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
