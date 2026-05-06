export { formatTimeAgo, type ActivityEvent } from '@/lib/activity-utils'

import { unstable_cache } from 'next/cache'
import { createAnonReadClient } from '@/lib/supabase/anon-read'
import { SPOT_TYPES, type SpotType } from '@/lib/spot-types'
import type { ActivityEvent } from '@/lib/activity-utils'

export type SpotTypeCounts = Record<SpotType, number>
export type LivingNumbers = { total: number; thisWeek: number; betaUsers: number }
export type HeroSpot = { id: string; lat: number; lng: number; type: SpotType }

const REVALIDATE_SECONDS = 60
const TAGS = ['marketing-stats']

export const getSpotCounts = unstable_cache(
  async (): Promise<SpotTypeCounts> => {
    const supabase = createAnonReadClient()
    const { data } = await supabase
      .from('spots')
      .select('type')
      .eq('visibility', 'public')

    const counts = SPOT_TYPES.reduce<SpotTypeCounts>((acc, t) => {
      acc[t.key] = 0
      return acc
    }, {} as SpotTypeCounts)

    for (const row of data ?? []) {
      if (row.type in counts) counts[row.type as SpotType]++
    }
    return counts
  },
  ['marketing-spot-counts'],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
)

export const getLivingNumbers = unstable_cache(
  async (): Promise<LivingNumbers> => {
    const supabase = createAnonReadClient()
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [totalRes, weekRes, usersRes] = await Promise.all([
      supabase.from('spots').select('id', { count: 'exact', head: true }).eq('visibility', 'public'),
      supabase.from('spots').select('id', { count: 'exact', head: true }).eq('visibility', 'public').gte('created_at', oneWeekAgo),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ])

    return {
      total: totalRes.count ?? 0,
      thisWeek: weekRes.count ?? 0,
      betaUsers: usersRes.count ?? 0,
    }
  },
  ['marketing-living-numbers'],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
)

export const getRecentActivity = unstable_cache(
  async (limit = 3): Promise<ActivityEvent[]> => {
    const supabase = createAnonReadClient()
    const { data: spots } = await supabase
      .from('spots')
      .select('id, type, created_at')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit)

    return (spots ?? []).map((s) => ({
      id: s.id,
      kind: 'spot_created' as const,
      spotType: s.type as SpotType,
      createdAt: s.created_at,
    }))
  },
  ['marketing-recent-activity'],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
)

export const getHeroSampleSpots = unstable_cache(
  async (limit = 6): Promise<HeroSpot[]> => {
    const supabase = createAnonReadClient()
    const { data } = await supabase
      .from('spots')
      .select('id, lat, lng, type')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data ?? []).map((s) => ({
      id: s.id,
      lat: s.lat,
      lng: s.lng,
      type: s.type as SpotType,
    }))
  },
  ['marketing-hero-spots'],
  { revalidate: REVALIDATE_SECONDS, tags: TAGS },
)
