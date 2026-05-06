import { IconWorld, IconUsers, IconLock } from '@tabler/icons-react'
import type { SpotIcon } from '@/lib/spot-types'

export type SpotVisibility = 'public' | 'friends' | 'private'

export interface SpotVisibilityMeta {
  key: SpotVisibility
  /** Stopgap emoji for legacy renderers; UI should prefer `Icon`. */
  emoji: string
  label: string
  Icon: SpotIcon
}

export const SPOT_VISIBILITIES: readonly SpotVisibilityMeta[] = [
  { key: 'public',  emoji: '🌍', label: 'Öffentlich',  Icon: IconWorld },
  { key: 'friends', emoji: '👥', label: 'Nur Freunde', Icon: IconUsers },
  { key: 'private', emoji: '🔒', label: 'Privat',       Icon: IconLock },
] as const

export const SPOT_VISIBILITY_MAP: Record<SpotVisibility, SpotVisibilityMeta> =
  Object.fromEntries(SPOT_VISIBILITIES.map((v) => [v.key, v])) as Record<SpotVisibility, SpotVisibilityMeta>
