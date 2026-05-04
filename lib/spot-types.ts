export type SpotType = 'bench' | 'viewpoint' | 'shelter' | 'picnic' | 'meadow' | 'water'

export interface SpotTypeMeta {
  key: SpotType
  emoji: string
  label: string
}

export const SPOT_TYPES: readonly SpotTypeMeta[] = [
  { key: 'bench',     emoji: '🪑',  label: 'Bank' },
  { key: 'viewpoint', emoji: '🏔️', label: 'Aussichtspunkt' },
  { key: 'shelter',   emoji: '⛺',  label: 'Schutzhütte' },
  { key: 'picnic',    emoji: '🧺',  label: 'Rastplatz' },
  { key: 'meadow',    emoji: '🌿',  label: 'Liegewiese' },
  { key: 'water',     emoji: '💧',  label: 'Wasserstelle' },
] as const

export const SPOT_TYPE_MAP: Record<SpotType, SpotTypeMeta> = Object.fromEntries(
  SPOT_TYPES.map((t) => [t.key, t]),
) as Record<SpotType, SpotTypeMeta>
