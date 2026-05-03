'use client'

import { useState, useTransition } from 'react'
import { upsertStats, getBenchStats, type UserVote, type AggregatedStats } from '@/actions/stats'
import { CONDITION_PRESETS, type ConditionPreset, conditionToPreset, shadowLabel } from '@/lib/stats-utils'

const SHADOW_OPTIONS = [
  { value: 'none',    label: 'Keinen' },
  { value: 'morning', label: 'Morgens' },
  { value: 'evening', label: 'Abends' },
  { value: 'allday',  label: 'Ganztags' },
]

const EXTRAS_OPTIONS = [
  { value: 'bin',        icon: '🗑',  label: 'Mülleimer' },
  { value: 'roof',       icon: '☂',  label: 'Überdachung' },
  { value: 'accessible', icon: '♿', label: 'Barrierefrei' },
  { value: 'table',      icon: '🍽', label: 'Tisch' },
  { value: 'bicycle',    icon: '🚲', label: 'Fahrradständer' },
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
      const { aggregated } = await getBenchStats(benchId)
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
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">⭐ Komfort</p>
        <StarPicker value={comfort} onChange={setComfort} />
      </div>

      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">🌄 Aussicht</p>
        <StarPicker value={viewRating} onChange={setViewRating} />
      </div>

      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">🏆 Rarität</p>
        <StarPicker value={rarity} onChange={setRarity} />
      </div>

      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">🏚 Zustand</p>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(CONDITION_PRESETS) as ConditionPreset[]).map(preset => (
            <button
              key={preset}
              onClick={() => setCondition(condition === preset ? null : preset)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
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
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">☀️ Schatten</p>
        <div className="flex gap-2 flex-wrap">
          {SHADOW_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setShadow(shadow === opt.value ? null : opt.value)}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
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
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">✅ Extras</p>
        <div className="flex gap-2 flex-wrap">
          {EXTRAS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggleExtra(opt.value)}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                extras.includes(opt.value)
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-[#2a3124] text-gray-600 dark:text-gray-400'
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      {saved && <p className="text-xs text-primary">Bewertung gespeichert ✓</p>}

      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Speichern…' : 'Bewertung speichern'}
      </button>
    </div>
  )
}

function StarPicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(value === n ? null : n)}
          className="text-2xl leading-none transition-opacity"
          style={{ opacity: value !== null && n <= value ? 1 : 0.25 }}
          aria-label={`${n} Stern${n > 1 ? 'e' : ''}`}
        >
          ⭐
        </button>
      ))}
    </div>
  )
}
