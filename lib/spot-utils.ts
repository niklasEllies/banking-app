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

/**
 * Raw great-circle distance in meters between two coords. Used for sorting.
 */
export function distMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const R = 6371000
  const φ1 = (from.lat * Math.PI) / 180
  const φ2 = (to.lat * Math.PI) / 180
  const Δφ = ((to.lat - from.lat) * Math.PI) / 180
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Human-friendly distance: ~{N} m (10m-rounded) or {N.N} km.
 */
export function distanceTo(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): string {
  const meters = distMeters(from, to)
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `~${Math.round(meters / 10) * 10} m`
}
