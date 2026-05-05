import { describe, it, expect } from 'vitest'
import { distanceTo, spotDisplayName, distMeters } from '@/lib/spot-utils'

describe('distanceTo', () => {
  it('returns distance in meters for short distances', () => {
    // 0.001° latitude ≈ 111m
    const result = distanceTo(
      { lat: 52.520, lng: 13.405 },
      { lat: 52.521, lng: 13.405 }
    )
    expect(result).toBe('~110 m')
  })

  it('rounds to nearest 10m', () => {
    const result = distanceTo(
      { lat: 52.520, lng: 13.405 },
      { lat: 52.5205, lng: 13.405 }
    )
    expect(result).toBe('~60 m')
  })

  it('returns km for distances >= 1000m', () => {
    const result = distanceTo(
      { lat: 52.520, lng: 13.405 },
      { lat: 52.530, lng: 13.405 }
    )
    expect(result).toBe('1.1 km')
  })

  it('returns 0 m for same point', () => {
    const result = distanceTo(
      { lat: 52.520, lng: 13.405 },
      { lat: 52.520, lng: 13.405 }
    )
    expect(result).toBe('~0 m')
  })
})

describe('distMeters', () => {
  it('returns 0 for identical coords', () => {
    expect(distMeters({ lat: 52.520, lng: 13.405 }, { lat: 52.520, lng: 13.405 })).toBe(0)
  })

  it('returns ~111 m for 0.001° latitude difference', () => {
    const m = distMeters({ lat: 52.520, lng: 13.405 }, { lat: 52.521, lng: 13.405 })
    expect(m).toBeGreaterThan(105)
    expect(m).toBeLessThan(115)
  })

  it('returns symmetric distance', () => {
    const a = { lat: 52.5, lng: 13.4 }
    const b = { lat: 52.6, lng: 13.5 }
    expect(distMeters(a, b)).toBeCloseTo(distMeters(b, a), 1)
  })
})

describe('spotDisplayName', () => {
  it('returns name when provided', () => {
    expect(spotDisplayName('Meine Bank', '2024-01-15T10:00:00Z')).toBe('Meine Bank')
  })
  it('returns formatted date with default type "bench" when name is null', () => {
    expect(spotDisplayName(null, '2024-01-15T10:00:00Z')).toBe('Bank vom 15. Januar')
  })
  it('uses the type label when an explicit type is passed', () => {
    expect(spotDisplayName(null, '2025-06-15T00:00:00Z', 'viewpoint')).toBe('Aussichtspunkt vom 15. Juni')
    expect(spotDisplayName(null, '2025-06-15T00:00:00Z', 'water')).toBe('Wasserstelle vom 15. Juni')
  })
})
