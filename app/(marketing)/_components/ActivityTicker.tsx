'use client'

import { useEffect, useState } from 'react'
import { IconChevronRight } from '@tabler/icons-react'
import { SPOT_TYPE_MAP } from '@/lib/spot-types'
import { formatTimeAgo, type ActivityEvent } from '@/lib/activity-utils'

export default function ActivityTicker({ initialEvents }: { initialEvents: ActivityEvent[] }) {
  const [now, setNow] = useState(() => new Date())
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30_000)
    const rotate = setInterval(() => setIndex((i) => (i + 1) % Math.max(initialEvents.length, 1)), 3000)
    return () => { clearInterval(tick); clearInterval(rotate) }
  }, [initialEvents.length])

  if (!initialEvents.length) return null

  const ev = initialEvents[index]
  const meta = SPOT_TYPE_MAP[ev.spotType]

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="mt-8 pt-4 border-t border-[#e6e3d3]/12 font-mono text-xs text-[#c8c8c0] tracking-wide min-h-10 leading-6 whitespace-nowrap overflow-hidden"
    >
      <div key={ev.id} className="opacity-0 animate-[fadeIn_0.5s_forwards]">
        <IconChevronRight size={12} className="text-[#5e9e3e] inline-block mr-1" aria-hidden />
        Neue {meta?.label ?? 'Eintrag'} · {formatTimeAgo(ev.createdAt, now)}
      </div>
    </div>
  )
}
