export type SpotVisibility = 'public' | 'friends' | 'private'

export interface SpotVisibilityMeta {
  key: SpotVisibility
  emoji: string
  label: string
}

export const SPOT_VISIBILITIES: readonly SpotVisibilityMeta[] = [
  { key: 'public',  emoji: '🌍', label: 'Öffentlich' },
  { key: 'friends', emoji: '👥', label: 'Nur Freunde' },
  { key: 'private', emoji: '🔒', label: 'Privat' },
] as const

export const SPOT_VISIBILITY_MAP: Record<SpotVisibility, SpotVisibilityMeta> =
  Object.fromEntries(SPOT_VISIBILITIES.map((v) => [v.key, v])) as Record<SpotVisibility, SpotVisibilityMeta>
