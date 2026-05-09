'use client'

import { useState, useTransition } from 'react'
import {
  IconTrash, IconUmbrella, IconAccessible, IconToolsKitchen2, IconBike,
  IconStar, IconMountain, IconTrophy, IconHome, IconSun, IconCheck,
} from '@tabler/icons-react'
import type { ComponentType } from 'react'
import Button from '@/components/ui/Button'
import { upsertStats, getSpotStats, type UserVote, type AggregatedStats } from '@/actions/stats'
import { CONDITION_PRESETS, type ConditionPreset, conditionToPreset } from '@/lib/stats-utils'

const SHADOW_OPTIONS = [
  { value: 'none',    label: 'Keinen' },
  { value: 'morning', label: 'Morgens' },
  { value: 'evening', label: 'Abends' },
  { value: 'allday',  label: 'Ganztags' },
]

type IconComponent = ComponentType<{ size?: number; 'aria-hidden'?: boolean }>

interface ExtraOption {
  value: string
  Icon: IconComponent
  label: string
}

const EXTRAS_OPTIONS: ExtraOption[] = [
  { value: 'bin',        Icon: IconTrash,           label: 'Mülleimer' },
  { value: 'roof',       Icon: IconUmbrella,        label: 'Überdachung' },
  { value: 'accessible', Icon: IconAccessible,      label: 'Barrierefrei' },
  { value: 'table',      Icon: IconToolsKitchen2,   label: 'Tisch' },
  { value: 'bicycle',    Icon: IconBike,            label: 'Fahrradständer' },
]

interface StatsVoteFormProps {
  benchId: string
  initialVote: UserVote | null
  onSaved: (aggregated: AggregatedStats | null, vote: UserVote) => void
}

export default function StatsVoteForm({ benchId, initialVote, onSaved }: StatsVoteFormProps) {
  const [comfort, setComfort] = useState<number | null>(initialVote?.comfort ?? null)
  const [viewRating, setViewRating] = useState<number | null>(initialVote?.view_rating ?? null)
  const [condition, setCondition] = useState<ConditionPreset | null>(
    conditionToPreset(initialVote?.condition ?? null)
  )
  const [shadow, setShadow] = useState<string | null>(initialVote?.shadow ?? null)
  const [extras, setExtras] = useState<string[]>(initialVote?.extras ?? [])
  const [rarity, setRarity] = useState<number | null>(initialVote?.rarity ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const toggleExtra = (value: string) => {
    setExtras(prev =>
      prev.includes(value) ? prev.filter(e => e !== value) : [...prev, value]
    )
  }

  const handleSave = () => {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const vote: UserVote = {
        comfort,
        view_rating: viewRating,
        condition: condition ? CONDITION_PRESETS[condition].float : null,
        shadow,
        extras,
        rarity,
      }
      const result = await upsertStats(benchId, vote)
      if (result.error) {
        setError(result.error)
        return
      }
      const { aggregated } = await getSpotStats(benchId)
      setSaved(true)
      onSaved(aggregated, vote)
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        Deine Bewertung
      </p>

      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
          <IconStar size={13} aria-hidden /> Komfort
        </p>
        <StarPicker value={comfort} onChange={setComfort} ariaLabel="Komfort-Bewertung" />
      </div>

      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
          <IconMountain size={13} aria-hidden /> Aussicht
        </p>
        <StarPicker value={viewRating} onChange={setViewRating} ariaLabel="Aussicht-Bewertung" />
      </div>

      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
          <IconTrophy size={13} aria-hidden /> Rarität
        </p>
        <StarPicker value={rarity} onChange={setRarity} ariaLabel="Raritäts-Bewertung" />
      </div>

      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
          <IconHome size={13} aria-hidden /> Zustand
        </p>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(CONDITION_PRESETS) as ConditionPreset[]).map(preset => (
            <button
              key={preset}
              onClick={() => setCondition(condition === preset ? null : preset)}
              aria-pressed={condition === preset}
              className={`min-h-11 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                condition === preset
                  ? 'text-[#1a1c17]'
                  : 'bg-gray-100 dark:bg-[#2a3124] text-gray-600 dark:text-gray-400'
              }`}
              style={condition === preset ? { background: CONDITION_PRESETS[preset].color } : {}}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
          <IconSun size={13} aria-hidden /> Schatten
        </p>
        <div className="flex gap-2 flex-wrap">
          {SHADOW_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setShadow(shadow === opt.value ? null : opt.value)}
              aria-pressed={shadow === opt.value}
              className={`min-h-11 px-4 py-2.5 rounded-lg text-xs transition-all ${
                shadow === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-[#2a3124] text-gray-600 dark:text-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
          <IconCheck size={13} aria-hidden /> Extras
        </p>
        <div className="flex gap-2 flex-wrap">
          {EXTRAS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggleExtra(opt.value)}
              aria-pressed={extras.includes(opt.value)}
              aria-label={opt.label}
              className={`min-h-11 px-4 py-2.5 rounded-lg text-xs transition-all inline-flex items-center gap-1.5 ${
                extras.includes(opt.value)
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-[#2a3124] text-gray-600 dark:text-gray-400'
              }`}
            >
              <opt.Icon size={14} aria-hidden /> {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      {saved && (
        <p className="text-xs text-primary flex items-center gap-1">
          Bewertung gespeichert <IconCheck size={14} aria-hidden />
        </p>
      )}

      <Button type="button" variant="primary" fullWidth onClick={handleSave} loading={isPending}>
        {isPending ? 'Speichern…' : 'Bewertung speichern'}
      </Button>
    </div>
  )
}

function StarPicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: number | null
  onChange: (v: number | null) => void
  ariaLabel: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} von 5 Sternen`}
          onClick={() => onChange(value === n ? null : n)}
          className="min-w-11 min-h-11 flex items-center justify-center text-2xl leading-none transition-opacity"
          style={{ opacity: value !== null && n <= value ? 1 : 0.25 }}
        >
          ⭐
        </button>
      ))}
    </div>
  )
}
