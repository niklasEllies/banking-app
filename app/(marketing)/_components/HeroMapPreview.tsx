'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import type { HeroSpot } from '@/lib/marketing-stats'
import { SPOT_TYPE_MAP } from '@/lib/spot-types'
import 'leaflet/dist/leaflet.css'

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })

export default function HeroMapPreview({ spots }: { spots: HeroSpot[] }) {
  const center = useMemo(() => {
    if (!spots.length) return [50.94, 6.96] as [number, number]
    const lat = spots.reduce((s, x) => s + x.lat, 0) / spots.length
    const lng = spots.reduce((s, x) => s + x.lng, 0) / spots.length
    return [lat, lng] as [number, number]
  }, [spots])

  return (
    <div
      className="relative w-full h-full min-h-[360px] rounded-xl overflow-hidden bg-[#2a2f1f]"
      role="img"
      aria-label={`Karte mit ${spots.length} Beispiel-Plätzchen`}
    >
      <MapContainer
        center={center}
        zoom={9}
        scrollWheelZoom={false}
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%', background: '#2a2f1f' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.5}
        />
        {spots.map((spot, idx) => {
          const meta = SPOT_TYPE_MAP[spot.type]
          return (
            <Marker
              key={spot.id}
              position={[spot.lat, spot.lng]}
              icon={createPulseIcon(meta?.emoji ?? '📍', idx)}
            />
          )
        })}
      </MapContainer>
    </div>
  )
}

function createPulseIcon(emoji: string, idx: number) {
  // Avoid SSR import — leaflet only loads client-side
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet')
  return L.divIcon({
    className: 'hero-marker',
    html: `<div class="hero-marker-inner" style="animation-delay: ${idx * 0.4}s">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}
