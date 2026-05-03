'use server'

import { createClient } from '@/lib/supabase/server'

export interface UserVote {
  comfort?: number | null
  view_rating?: number | null
  condition?: number | null
  shadow?: string | null
  extras?: string[]
  rarity?: number | null
}

export interface AggregatedStats {
  comfort_median: number | null
  view_median: number | null
  condition_median: number | null
  rarity_median: number | null
  shadow_mode: string | null
  extras_threshold: string[]
  vote_count: number
}

export async function getBenchStats(benchId: string): Promise<{
  aggregated: AggregatedStats | null
  userVote: UserVote | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: aggData }, { data: voteData }] = await Promise.all([
    supabase.rpc('get_bench_aggregated_stats', { p_bench_id: benchId }),
    user
      ? supabase
          .from('bench_stats_votes')
          .select('comfort, view_rating, condition, shadow, extras, rarity')
          .eq('bench_id', benchId)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const agg = (aggData as AggregatedStats[] | null)?.[0] ?? null

  return {
    aggregated: agg,
    userVote: voteData as UserVote | null,
  }
}

export async function upsertStats(benchId: string, vote: UserVote): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase
    .from('bench_stats_votes')
    .upsert(
      { bench_id: benchId, user_id: user.id, ...vote },
      { onConflict: 'bench_id,user_id' }
    )

  if (error) return { error: error.message }
  return {}
}
