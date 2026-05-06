import { describe, it, expect } from 'vitest'
import { applyTabFilter, type TimelineSpot } from '@/lib/timeline-data'
import { pickGranularity, bucketByGranularity } from '@/components/timeline/useTimelineBucketing'

describe('applyTabFilter', () => {
  const spots: TimelineSpot[] = [
    { id: 'a', lat: 0, lng: 0, type: 'bench',     created_at: '2026-04-01', created_by: 'u1' },
    { id: 'b', lat: 0, lng: 0, type: 'viewpoint', created_at: '2026-04-02', created_by: 'u2' },
    { id: 'c', lat: 0, lng: 0, type: 'shelter',   created_at: '2026-04-03', created_by: null },
    { id: 'd', lat: 0, lng: 0, type: 'water',     created_at: '2026-04-04', created_by: 'u3' },
  ]

  it('"all" returns everything', () => {
    expect(applyTabFilter(spots, 'all', 'u1', new Set(['u2']))).toEqual(spots)
  })

  it('"mine" returns only own', () => {
    const result = applyTabFilter(spots, 'mine', 'u1', new Set(['u2']))
    expect(result).toEqual([spots[0]])
  })

  it('"friends" excludes self and non-friends', () => {
    const result = applyTabFilter(spots, 'friends', 'u1', new Set(['u2', 'u3']))
    expect(result.map((s) => s.id)).toEqual(['b', 'd'])
  })

  it('"mine" with no userId returns nothing', () => {
    expect(applyTabFilter(spots, 'mine', null, new Set())).toEqual([])
  })
})

describe('pickGranularity', () => {
  it('day for ranges <90 days', () => {
    const range = 30 * 24 * 60 * 60 * 1000
    expect(pickGranularity(range)).toBe('day')
  })
  it('week for 90-730 days', () => {
    const range = 200 * 24 * 60 * 60 * 1000
    expect(pickGranularity(range)).toBe('week')
  })
  it('month for >730 days', () => {
    const range = 800 * 24 * 60 * 60 * 1000
    expect(pickGranularity(range)).toBe('month')
  })
})

describe('bucketByGranularity', () => {
  const dates = [
    '2026-04-01T00:00:00Z',
    '2026-04-01T12:00:00Z',
    '2026-04-02T00:00:00Z',
    '2026-04-08T00:00:00Z',
    '2026-05-15T00:00:00Z',
  ]

  it('day buckets put same-day items together', () => {
    const buckets = bucketByGranularity(dates, 'day')
    expect(buckets.length).toBe(4)
    expect(buckets[0].count).toBe(2)
    expect(buckets[1].count).toBe(1)
  })

  it('week buckets group by ISO week start (Monday)', () => {
    const buckets = bucketByGranularity(dates, 'week')
    expect(buckets.length).toBe(3)
    expect(buckets[0].count).toBe(3)
  })

  it('month buckets group by calendar month', () => {
    const buckets = bucketByGranularity(dates, 'month')
    expect(buckets.length).toBe(2)
    expect(buckets[0].count).toBe(4)
    expect(buckets[1].count).toBe(1)
  })

  it('empty input returns empty array', () => {
    expect(bucketByGranularity([], 'week')).toEqual([])
  })
})
