'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo } from 'react'
import 'leaflet/dist/leaflet.css'
import { buildPinSvg, buildClusterSvg, PIN_SIZE, PIN_ANCHOR, PIN_POPUP_ANCHOR } from '@/lib/spot-marker-svg'
import type { TimelineSpot } from '@/lib/timeline-types'

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })
const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster'), { ssr: false })

const FALLBACK_CENTER: [number, number] = [50.94, 6.96]

interface Props {
  visibleSpots: TimelineSpot[]
  ghostSpots: TimelineSpot[]
  fitTrigger: number
}

function buildIcon(spot: TimelineSpot, ghost: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet')
  const html = ghost
    ? `<div style="opacity:0.15;filter:grayscale(1)">${buildPinSvg(spot.type)}</div>`
    : buildPinSvg(spot.type)
  return L.divIcon({
    className: ghost ? 'timeline-pin-ghost' : 'timeline-pin',
    html,
    iconSize: PIN_SIZE,
    iconAnchor: PIN_ANCHOR,
    popupAnchor: PIN_POPUP_ANCHOR,
  })
}

function FitBoundsOnTrigger({ spots, trigger }: { spots: TimelineSpot[]; trigger: number }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useMap } = require('react-leaflet')
  const map = useMap()
  useEffect(() => {
    if (spots.length === 0) return
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet')
    const bounds = L.latLngBounds(spots.map((s) => [s.lat, s.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])
  return null
}

export default function TimelineMap({ visibleSpots, ghostSpots, fitTrigger }: Props) {
  const initialCenter = useMemo<[number, number]>(() => {
    if (visibleSpots.length === 0) return FALLBACK_CENTER
    const lat = visibleSpots.reduce((s, x) => s + x.lat, 0) / visibleSpots.length
    const lng = visibleSpots.reduce((s, x) => s + x.lng, 0) / visibleSpots.length
    return [lat, lng]
  }, [visibleSpots])

  return (
    <MapContainer
      center={initialCenter}
      zoom={9}
      className="absolute inset-0"
      style={{ height: '100%', width: '100%', background: '#2a2f1f' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBoundsOnTrigger spots={visibleSpots} trigger={fitTrigger} />
      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={(cluster: { getChildCount: () => number }) => {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const L = require('leaflet')
          return L.divIcon({
            html: buildClusterSvg(cluster.getChildCount()),
            className: '',
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          })
        }}
      >
        {visibleSpots.map((spot) => (
          <Marker
            key={`v-${spot.id}`}
            position={[spot.lat, spot.lng]}
            icon={buildIcon(spot, false)}
            interactive={false}
          />
        ))}
      </MarkerClusterGroup>
      {ghostSpots.map((spot) => (
        <Marker
          key={`g-${spot.id}`}
          position={[spot.lat, spot.lng]}
          icon={buildIcon(spot, true)}
          interactive={false}
        />
      ))}
    </MapContainer>
  )
}
