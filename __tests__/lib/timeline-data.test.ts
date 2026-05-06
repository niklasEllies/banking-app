import { describe, it, expect } from 'vitest'
import { applyTabFilter, type TimelineSpot } from '@/lib/timeline-data'

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
