import { SPOT_TYPE_MAP, type SpotType } from '@/lib/spot-types'

export function spotDisplayName(
  name: string | null,
  createdAt: string,
  type: SpotType = 'bench',
): string {
  if (name) return name
  const d = new Date(createdAt)
  const typeLabel = SPOT_TYPE_MAP[type].label
  return `${typeLabel} vom ${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}`
}

export function distanceTo(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): string {
  const R = 6371000
  const φ1 = (from.lat * Math.PI) / 180
  const φ2 = (to.lat * Math.PI) / 180
  const Δφ = ((to.lat - from.lat) * Math.PI) / 180
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const meters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `~${Math.round(meters / 10) * 10} m`
}
