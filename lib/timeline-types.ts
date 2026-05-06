import type { SpotType } from '@/lib/spot-types'

export type TimelineTab = 'all' | 'mine' | 'friends'

export interface TimelineSpot {
  id: string
  lat: number
  lng: number
  type: SpotType
  created_at: string
  created_by: string | null
}

export function applyTabFilter(
  spots: TimelineSpot[],
  tab: TimelineTab,
  userId: string | null,
  friendIds: Set<string>,
): TimelineSpot[] {
  if (tab === 'all') return spots
  if (tab === 'mine') {
    if (!userId) return []
    return spots.filter((s) => s.created_by === userId)
  }
  return spots.filter(
    (s) => s.created_by !== null && s.created_by !== userId && friendIds.has(s.created_by),
  )
}
