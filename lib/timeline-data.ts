import { unstable_cache } from 'next/cache'
import { createAnonReadClient } from '@/lib/supabase/anon-read'
import { createClient } from '@/lib/supabase/server'
import type { TimelineSpot } from '@/lib/timeline-types'

export type { TimelineTab, TimelineSpot } from '@/lib/timeline-types'
export { applyTabFilter } from '@/lib/timeline-types'

const SELECT_COLS = 'id, lat, lng, type, created_at, created_by'

export const getPublicTimelineSpots = unstable_cache(
  async (): Promise<TimelineSpot[]> => {
    const supabase = createAnonReadClient()
    const { data } = await supabase
      .from('spots')
      .select(SELECT_COLS)
      .eq('visibility', 'public')
      .order('created_at', { ascending: true })
    return (data ?? []) as TimelineSpot[]
  },
  ['timeline-public-spots'],
  { revalidate: 60, tags: ['marketing-stats'] },
)

export async function getAuthedExtraSpots(): Promise<TimelineSpot[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('spots')
    .select(SELECT_COLS + ', visibility')
    .neq('visibility', 'public')
    .order('created_at', { ascending: true })

  return ((data ?? []) as unknown as Array<TimelineSpot & { visibility: string }>).map((s) => {
    const { visibility: _vis, ...rest } = s
    return rest
  })
}

export async function getTimelineSpots(): Promise<TimelineSpot[]> {
  const [publicSpots, extra] = await Promise.all([
    getPublicTimelineSpots(),
    getAuthedExtraSpots(),
  ])
  if (extra.length === 0) return publicSpots
  const seen = new Set(publicSpots.map((s) => s.id))
  const merged = [...publicSpots]
  for (const s of extra) {
    if (!seen.has(s.id)) merged.push(s)
  }
  merged.sort((a, b) => a.created_at.localeCompare(b.created_at))
  return merged
}
