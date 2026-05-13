'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { buildPinSvg, PIN_SIZE, PIN_ANCHOR } from '@/lib/spot-marker-svg'
import type { SpotType } from '@/lib/spot-types'

interface PinPickerMapProps {
  lat: number | null
  lng: number | null
  type: SpotType
  onPinChange: (lat: number, lng: number) => void
}

const DE_CENTER: [number, number] = [51.1, 10.4]

function makeIcon(type: SpotType): L.DivIcon {
  return new L.DivIcon({
    html: buildPinSvg(type),
    className: '',
    iconSize: PIN_SIZE,
    iconAnchor: PIN_ANCHOR,
  })
}

function PinClickHandler({ onPinChange }: { onPinChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPinChange(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function PinView({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap()
  useEffect(() => {
    if (lat !== null && lng !== null) {
      map.setView([lat, lng], Math.max(map.getZoom(), 16))
    }
  }, [lat, lng, map])
  return null
}

export default function PinPickerMap({ lat, lng, type, onPinChange }: PinPickerMapProps) {
  const initialCenter: [number, number] = lat !== null && lng !== null ? [lat, lng] : DE_CENTER
  const initialZoom = lat !== null && lng !== null ? 16 : 6

  return (
    <div className="h-72 rounded-xl overflow-hidden border border-gray-200 dark:border-[#2a2f24]">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        className="w-full h-full"
        zoomControl={false}
        style={{ cursor: 'crosshair' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <PinClickHandler onPinChange={onPinChange} />
        <PinView lat={lat} lng={lng} />
        {lat !== null && lng !== null && (
          <Marker
            position={[lat, lng]}
            icon={makeIcon(type)}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng()
                onPinChange(ll.lat, ll.lng)
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}
