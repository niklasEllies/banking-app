'use client'

import { SPOT_TYPES, type SpotType } from '@/lib/spot-types'

interface SpotTypePickerProps {
  value: SpotType
  onChange: (type: SpotType) => void
}

export default function SpotTypePicker({ value, onChange }: SpotTypePickerProps) {
  return (
    <div role="radiogroup" aria-label="Was ist hier?" className="grid grid-cols-3 gap-2">
      {SPOT_TYPES.map((t) => {
        const selected = value === t.key
        return (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t.label}
            onClick={() => onChange(t.key)}
            className={`min-h-16 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 px-2 py-2 ${
              selected
                ? 'border-primary bg-primary-light dark:bg-[#2a3f1e]'
                : 'border-gray-200 dark:border-[#2a2f24] bg-white dark:bg-[#1e231a] hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <t.Icon size={26} stroke={1.5} className={selected ? 'text-primary' : 'text-gray-600 dark:text-gray-300'} aria-hidden />
            <span className="text-xs text-gray-700 dark:text-gray-300">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
