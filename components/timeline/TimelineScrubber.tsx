'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { IconPlayerPlayFilled, IconPlayerPauseFilled } from '@tabler/icons-react'
import type { TimelineTab } from '@/lib/timeline-types'
import type { Bucket } from './useTimelineBucketing'
import TimelineHistogram from './TimelineHistogram'

interface Props {
  buckets: Bucket[]
  firstISO: string | null
  lastISO: string | null
  scrubberNowISO: string
  visibleCount: number
  tab: TimelineTab
  onScrub: (iso: string) => void
  onTabChange: (tab: TimelineTab) => void
}

const TABS: { value: TimelineTab; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'mine', label: 'Eigene' },
  { value: 'friends', label: 'Freunde' },
]

const PLAY_INTERVAL_MS = 600

export default function TimelineScrubber({
  buckets,
  firstISO,
  lastISO,
  scrubberNowISO,
  visibleCount,
  tab,
  onScrub,
  onTabChange,
}: Props) {
  const [playing, setPlaying] = useState(false)
  const playRef = useRef<number | null>(null)

  const togglePlay = useCallback(() => setPlaying((p) => !p), [])

  useEffect(() => {
    if (!playing || buckets.length === 0 || !lastISO) return
    const tick = () => {
      const idx = buckets.findIndex(
        (b) => new Date(b.startISO).getTime() <= new Date(scrubberNowISO).getTime()
              && new Date(scrubberNowISO).getTime() < new Date(b.endISO).getTime(),
      )
      const next = buckets[idx + 1]
      if (!next) {
        setPlaying(false)
        return
      }
      onScrub(next.startISO)
    }
    playRef.current = window.setInterval(tick, PLAY_INTERVAL_MS) as unknown as number
    return () => {
      if (playRef.current !== null) clearInterval(playRef.current)
    }
  }, [playing, buckets, scrubberNowISO, onScrub, lastISO])

  const min = firstISO ? new Date(firstISO).getTime() : 0
  const max = lastISO ? new Date(lastISO).getTime() : 1
  const value = new Date(scrubberNowISO).getTime()
  const dateLabel = new Date(scrubberNowISO).toLocaleDateString('de-DE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const handleSliderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaying(false)
    onScrub(new Date(parseInt(e.target.value, 10)).toISOString())
  }

  const handleHistogramJump = (iso: string) => {
    setPlaying(false)
    onScrub(iso)
  }

  return (
    <aside
      aria-label="Zeit-Steuerung"
      className="absolute bottom-0 left-0 right-0 z-1000 bg-[#1d2218]/92 backdrop-blur-md border-t border-primary/20 px-4 py-3"
    >
      <div role="tablist" className="flex bg-[#14180f]/80 rounded-full p-1 border border-primary/20 mb-3 max-w-md mx-auto">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => onTabChange(t.value)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-colors ${
              tab === t.value
                ? 'bg-primary text-[#14180f] font-bold'
                : 'text-[#8aa376] hover:text-[#c8c8c0]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-baseline mb-2">
        <span aria-live="polite" className="text-sm font-bold text-white">{dateLabel}</span>
        <span className="font-mono text-[10px] text-primary uppercase tracking-wider">
          {visibleCount} Plätzchen
        </span>
      </div>

      <TimelineHistogram
        buckets={buckets}
        scrubberNowISO={scrubberNowISO}
        onJumpTo={handleHistogramJump}
      />

      <div className="flex justify-between font-mono text-[8px] text-[#8aa376] uppercase tracking-wider mt-1 mb-3">
        <span>{firstISO ? new Date(firstISO).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }) : '—'}</span>
        <span>heute</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          disabled={buckets.length === 0}
          className="w-9 h-9 rounded-full bg-primary text-[#14180f] flex items-center justify-center shadow-md hover:bg-[#6cb046] transition-colors disabled:opacity-50"
          aria-label={playing ? 'Pause' : 'Abspielen'}
        >
          {playing ? <IconPlayerPauseFilled size={14} /> : <IconPlayerPlayFilled size={14} />}
        </button>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleSliderInput}
          aria-label="Zeitpunkt"
          aria-valuetext={dateLabel}
          className="flex-1 h-2 accent-primary"
        />
      </div>
    </aside>
  )
}
