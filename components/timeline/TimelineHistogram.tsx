'use client'

import type { Bucket } from './useTimelineBucketing'

interface Props {
  buckets: Bucket[]
  scrubberNowISO: string
  onJumpTo: (isoDate: string) => void
}

export default function TimelineHistogram({ buckets, scrubberNowISO, onJumpTo }: Props) {
  if (buckets.length === 0) {
    return (
      <div className="h-8 flex items-center justify-center text-[10px] text-[#8aa376] font-mono uppercase tracking-wider">
        Keine Daten
      </div>
    )
  }
  const max = Math.max(...buckets.map((b) => b.count), 1)
  const nowMs = new Date(scrubberNowISO).getTime()

  return (
    <div className="h-8 flex items-end gap-[2px]" role="group" aria-label="Aktivitäts-Histogramm">
      {buckets.map((b) => {
        const startMs = new Date(b.startISO).getTime()
        const endMs = new Date(b.endISO).getTime()
        const isPast = endMs <= nowMs
        const isCurrent = startMs <= nowMs && nowMs < endMs
        const heightPct = (b.count / max) * 100
        const cls = isCurrent
          ? 'bg-white shadow-[0_0_4px_rgba(255,255,255,0.5)]'
          : isPast
            ? 'bg-primary'
            : 'bg-primary/30'
        return (
          <button
            key={b.startISO}
            type="button"
            onClick={() => onJumpTo(b.startISO)}
            className={`flex-1 ${cls} rounded-[1px] hover:opacity-80 transition-opacity`}
            style={{ height: `${heightPct}%`, minHeight: '2px' }}
            aria-label={`${b.count} Plätzchen ab ${formatBucketLabel(b.startISO)}`}
            title={`${b.count} Plätzchen`}
          />
        )
      })}
    </div>
  )
}

function formatBucketLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}
