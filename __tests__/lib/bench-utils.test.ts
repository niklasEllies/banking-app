import { describe, it, expect } from 'vitest'
import { distanceTo, benchDisplayName } from '@/lib/bench-utils'

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

describe('benchDisplayName', () => {
  it('returns name when provided', () => {
    expect(benchDisplayName('Meine Bank', '2024-01-15T10:00:00Z')).toBe('Meine Bank')
  })
  it('returns formatted date when name is null', () => {
    expect(benchDisplayName(null, '2024-01-15T10:00:00Z')).toBe('Bank vom 15. Januar')
  })
})
