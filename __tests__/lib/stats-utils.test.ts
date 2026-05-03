import { describe, it, expect } from 'vitest'
import {
  conditionLabel,
  rarityLabel,
  shadowLabel,
  extrasIcon,
  floatToConditionPreset,
} from '@/lib/stats-utils'

describe('conditionLabel', () => {
  it('returns FN for 0.9+', () => {
    expect(conditionLabel(0.95)).toEqual({ short: 'FN', full: 'Factory New', color: '#4ade80' })
  })
  it('returns MW for 0.7–0.9', () => {
    expect(conditionLabel(0.75)).toEqual({ short: 'MW', full: 'Minimal Wear', color: '#86efac' })
  })
  it('returns FT for 0.4–0.7', () => {
    expect(conditionLabel(0.5)).toEqual({ short: 'FT', full: 'Field-Tested', color: '#fde047' })
  })
  it('returns WW for 0.15–0.4', () => {
    expect(conditionLabel(0.25)).toEqual({ short: 'WW', full: 'Well-Worn', color: '#fb923c' })
  })
  it('returns BS for <0.15', () => {
    expect(conditionLabel(0.05)).toEqual({ short: 'BS', full: 'Battle-Scarred', color: '#f87171' })
  })
  it('returns null for null input', () => {
    expect(conditionLabel(null)).toBeNull()
  })
})

describe('rarityLabel', () => {
  it('maps 1 to Common', () => expect(rarityLabel(1)).toEqual({ label: 'Common', color: '#9ca3af' }))
  it('maps 3 to Rare', () => expect(rarityLabel(3)).toEqual({ label: 'Rare', color: '#60a5fa' }))
  it('maps 5 to Legendary', () => expect(rarityLabel(5)).toEqual({ label: 'Legendary', color: '#f59e0b' }))
  it('returns null for null', () => expect(rarityLabel(null)).toBeNull())
})

describe('shadowLabel', () => {
  it('maps none to Kein Schatten', () => expect(shadowLabel('none')).toBe('Kein Schatten'))
  it('maps morning to Morgens', () => expect(shadowLabel('morning')).toBe('Morgens'))
  it('maps evening to Abends', () => expect(shadowLabel('evening')).toBe('Abends'))
  it('maps allday to Ganztags', () => expect(shadowLabel('allday')).toBe('Ganztags'))
  it('returns null for null', () => expect(shadowLabel(null)).toBeNull())
})

describe('extrasIcon', () => {
  it('returns icon for bin', () => expect(extrasIcon('bin')).toBe('🗑'))
  it('returns icon for roof', () => expect(extrasIcon('roof')).toBe('☂'))
  it('returns icon for accessible', () => expect(extrasIcon('accessible')).toBe('♿'))
  it('returns icon for table', () => expect(extrasIcon('table')).toBe('🍽'))
  it('returns icon for bicycle', () => expect(extrasIcon('bicycle')).toBe('🚲'))
})

describe('floatToConditionPreset', () => {
  it('returns FN midpoint for FN selection', () => {
    expect(floatToConditionPreset('FN')).toBe(0.95)
  })
  it('returns BS midpoint for BS selection', () => {
    expect(floatToConditionPreset('BS')).toBe(0.075)
  })
})
