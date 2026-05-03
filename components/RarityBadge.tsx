import { rarityLabel } from '@/lib/stats-utils'

interface RarityBadgeProps {
  median: number | null
  size?: 'sm' | 'md'
}

export default function RarityBadge({ median, size = 'md' }: RarityBadgeProps) {
  const r = rarityLabel(median)
  if (!r) return null

  const textSize = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'

  return (
    <span
      className={`inline-block font-bold rounded-full ${textSize}`}
      style={{ background: r.color, color: '#1a1c17' }}
    >
      {r.label.toUpperCase()}
    </span>
  )
}
