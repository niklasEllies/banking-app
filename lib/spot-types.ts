import type { IconProps } from '@tabler/icons-react'
import {
  IconSofa,
  IconMountain,
  IconTent,
  IconPicnicTable,
  IconTrees,
  IconDroplet,
} from '@tabler/icons-react'

export type SpotType = 'bench' | 'viewpoint' | 'shelter' | 'picnic' | 'meadow' | 'water'

export type SpotIcon = React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>

export interface SpotTypeMeta {
  key: SpotType
  /** Stopgap emoji used on map markers and as fallback when a Tabler icon can't be rendered. */
  emoji: string
  label: string
  /** Tabler line-icon — used in landing showcase, type-picker, future markers. */
  Icon: SpotIcon
}

export const SPOT_TYPES: readonly SpotTypeMeta[] = [
  { key: 'bench',     emoji: '🛋️',  label: 'Bank',           Icon: IconSofa },
  { key: 'viewpoint', emoji: '🏔️', label: 'Aussichtspunkt',  Icon: IconMountain },
  { key: 'shelter',   emoji: '⛺',  label: 'Schutzhütte',     Icon: IconTent },
  { key: 'picnic',    emoji: '🧺',  label: 'Rastplatz',       Icon: IconPicnicTable },
  { key: 'meadow',    emoji: '🌿',  label: 'Liegewiese',      Icon: IconTrees },
  { key: 'water',     emoji: '💧',  label: 'Wasserstelle',    Icon: IconDroplet },
] as const

export const SPOT_TYPE_MAP: Record<SpotType, SpotTypeMeta> = Object.fromEntries(
  SPOT_TYPES.map((t) => [t.key, t]),
) as Record<SpotType, SpotTypeMeta>
