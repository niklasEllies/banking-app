export type ConditionLabel = { short: string; full: string; color: string }
export type RarityLabel = { label: string; color: string }

export type ConditionPreset = 'FN' | 'MW' | 'FT' | 'WW' | 'BS'

export const CONDITION_PRESETS: Record<ConditionPreset, { full: string; float: number; color: string }> = {
  FN: { full: 'Factory New',    float: 0.95,  color: '#4ade80' },
  MW: { full: 'Minimal Wear',   float: 0.70,  color: '#86efac' },
  FT: { full: 'Field-Tested',   float: 0.475, color: '#fde047' },
  WW: { full: 'Well-Worn',      float: 0.25,  color: '#fb923c' },
  BS: { full: 'Battle-Scarred', float: 0.075, color: '#f87171' },
}

export function conditionLabel(value: number | null): ConditionLabel | null {
  if (value === null || value === undefined) return null
  if (value >= 0.9)  return { short: 'FN', full: 'Factory New',    color: '#4ade80' }
  if (value >= 0.7)  return { short: 'MW', full: 'Minimal Wear',   color: '#86efac' }
  if (value >= 0.4)  return { short: 'FT', full: 'Field-Tested',   color: '#fde047' }
  if (value >= 0.15) return { short: 'WW', full: 'Well-Worn',      color: '#fb923c' }
  return               { short: 'BS', full: 'Battle-Scarred', color: '#f87171' }
}

const RARITY_MAP: Record<number, RarityLabel> = {
  1: { label: 'Common',    color: '#9ca3af' },
  2: { label: 'Uncommon',  color: '#4ade80' },
  3: { label: 'Rare',      color: '#60a5fa' },
  4: { label: 'Epic',      color: '#c084fc' },
  5: { label: 'Legendary', color: '#f59e0b' },
}

export function rarityLabel(value: number | null): RarityLabel | null {
  if (value === null || value === undefined) return null
  return RARITY_MAP[Math.round(value)] ?? null
}

const SHADOW_MAP: Record<string, string> = {
  none:    'Kein Schatten',
  morning: 'Morgens',
  evening: 'Abends',
  allday:  'Ganztags',
}

export function shadowLabel(value: string | null): string | null {
  if (!value) return null
  return SHADOW_MAP[value] ?? null
}

const EXTRAS_ICONS: Record<string, string> = {
  bin:        '🗑',
  roof:       '☂',
  accessible: '♿',
  table:      '🍽',
  bicycle:    '🚲',
}

export function extrasIcon(key: string): string {
  return EXTRAS_ICONS[key] ?? '?'
}

export function floatToConditionPreset(preset: ConditionPreset): number {
  return CONDITION_PRESETS[preset].float
}

export function conditionToPreset(value: number | null): ConditionPreset | null {
  if (value === null || value === undefined) return null
  if (value >= 0.9)  return 'FN'
  if (value >= 0.7)  return 'MW'
  if (value >= 0.4)  return 'FT'
  if (value >= 0.15) return 'WW'
  return 'BS'
}
