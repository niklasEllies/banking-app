'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import type { HeroSpot } from '@/lib/marketing-stats'
import { buildPinSvg, PIN_SIZE, PIN_ANCHOR } from '@/lib/spot-marker-svg'
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
        {spots.map((spot, idx) => (
          <Marker
            key={spot.id}
            position={[spot.lat, spot.lng]}
            icon={createHeroPinIcon(spot.type, idx)}
          />
        ))}
      </MapContainer>
    </div>
  )
}

function createHeroPinIcon(type: HeroSpot['type'], idx: number) {
  // Avoid SSR import — leaflet only loads client-side
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet')
  return L.divIcon({
    className: 'hero-pin',
    // Wrap in a span so the staggered pulse-bob animation can apply via CSS sibling.
    html: `<span class="hero-pin-bob" style="animation-delay:${idx * 0.4}s">${buildPinSvg(type)}</span>`,
    iconSize: PIN_SIZE,
    iconAnchor: PIN_ANCHOR,
  })
}
