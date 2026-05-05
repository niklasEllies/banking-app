import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatTimeAgo } from '@/lib/marketing-stats'

describe('formatTimeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-05T20:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns "vor 4 Min" for 4 minutes ago', () => {
    expect(formatTimeAgo(new Date('2026-05-05T19:56:00Z'))).toBe('vor 4 Min')
  })
  it('returns "vor 2 Std" for 2 hours ago', () => {
    expect(formatTimeAgo(new Date('2026-05-05T18:00:00Z'))).toBe('vor 2 Std')
  })
  it('returns "vor 3 Tagen" for 3 days ago', () => {
    expect(formatTimeAgo(new Date('2026-05-02T20:00:00Z'))).toBe('vor 3 Tagen')
  })
  it('returns "gerade eben" for under 60s', () => {
    expect(formatTimeAgo(new Date('2026-05-05T19:59:30Z'))).toBe('gerade eben')
  })
})
