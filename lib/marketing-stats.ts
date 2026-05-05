export { formatTimeAgo, type ActivityEvent } from '@/lib/activity-utils'

import { createClient } from '@/lib/supabase/server'
import { SPOT_TYPES, type SpotType } from '@/lib/spot-types'
import type { ActivityEvent } from '@/lib/activity-utils'

export type SpotTypeCounts = Record<SpotType, number>

export async function getSpotCounts(): Promise<SpotTypeCounts> {
  const supabase = await createClient()
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
}

export type LivingNumbers = { total: number; thisWeek: number; betaUsers: number }

export async function getLivingNumbers(): Promise<LivingNumbers> {
  const supabase = await createClient()
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
}

export async function getRecentActivity(limit = 3): Promise<ActivityEvent[]> {
  const supabase = await createClient()

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
}

export type HeroSpot = { id: string; lat: number; lng: number; type: SpotType }

export async function getHeroSampleSpots(limit = 6): Promise<HeroSpot[]> {
  const supabase = await createClient()
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
}
