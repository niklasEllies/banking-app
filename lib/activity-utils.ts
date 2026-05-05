import type { SpotType } from '@/lib/spot-types'

export type ActivityEvent = {
  id: string
  kind: 'spot_created' | 'description_added'
  spotType: SpotType
  createdAt: string
}

export function formatTimeAgo(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - d.getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return 'gerade eben'
  const min = Math.floor(sec / 60)
  if (min < 60) return `vor ${min} Min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `vor ${hr} Std`
  const days = Math.floor(hr / 24)
  return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`
}
