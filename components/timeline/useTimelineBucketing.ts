import { useMemo } from 'react'

export type Granularity = 'day' | 'week' | 'month'

export interface Bucket {
  startISO: string
  endISO: string
  count: number
}

const DAY_MS = 24 * 60 * 60 * 1000

export function pickGranularity(rangeMs: number): Granularity {
  const days = rangeMs / DAY_MS
  if (days < 90) return 'day'
  if (days < 730) return 'week'
  return 'month'
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

function startOfISOWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = x.getUTCDay()
  const offset = (day + 6) % 7
  x.setUTCDate(x.getUTCDate() - offset)
  return x
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

function nextBucketStart(start: Date, g: Granularity): Date {
  const x = new Date(start)
  if (g === 'day') x.setUTCDate(x.getUTCDate() + 1)
  else if (g === 'week') x.setUTCDate(x.getUTCDate() + 7)
  else x.setUTCMonth(x.getUTCMonth() + 1)
  return x
}

function bucketStartFor(d: Date, g: Granularity): Date {
  if (g === 'day') return startOfDay(d)
  if (g === 'week') return startOfISOWeek(d)
  return startOfMonth(d)
}

export function bucketByGranularity(isoDates: string[], g: Granularity): Bucket[] {
  if (isoDates.length === 0) return []
  const sorted = [...isoDates].sort()
  const buckets: Bucket[] = []
  let current: Bucket | null = null

  for (const iso of sorted) {
    const d = new Date(iso)
    const bs = bucketStartFor(d, g)
    const bsISO = bs.toISOString()
    if (current === null || current.startISO !== bsISO) {
      const next = nextBucketStart(bs, g)
      current = { startISO: bsISO, endISO: next.toISOString(), count: 0 }
      buckets.push(current)
    }
    current.count++
  }
  return buckets
}

export function useTimelineBuckets(spots: { created_at: string }[]) {
  return useMemo(() => {
    if (spots.length === 0) {
      return { granularity: 'week' as const, buckets: [] as Bucket[], firstISO: null as string | null, lastISO: null as string | null }
    }
    const firstISO = spots[0].created_at
    const lastISO = spots[spots.length - 1].created_at
    const range = new Date(lastISO).getTime() - new Date(firstISO).getTime()
    const granularity = pickGranularity(Math.max(range, DAY_MS))
    const buckets = bucketByGranularity(spots.map((s) => s.created_at), granularity)
    return { granularity, buckets, firstISO, lastISO }
  }, [spots])
}
