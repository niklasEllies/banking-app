'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { applyTabFilter, type TimelineSpot, type TimelineTab } from '@/lib/timeline-types'
import { useTimelineBuckets } from '@/components/timeline/useTimelineBucketing'
import TimelineMap from '@/components/timeline/TimelineMap'
import TimelineScrubber from '@/components/timeline/TimelineScrubber'

interface Props {
  spots: TimelineSpot[]
  userId: string | null
  friendIds: string[]
}

function todayISO(): string {
  return new Date().toISOString()
}

function isValidTab(v: string | null): v is TimelineTab {
  return v === 'all' || v === 'mine' || v === 'friends'
}

export default function TimelineClient({ spots, userId, friendIds }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  const tabFromUrl = params.get('tab')
  const atFromUrl = params.get('at')

  const [tab, setTabState] = useState<TimelineTab>(isValidTab(tabFromUrl) ? tabFromUrl : 'all')
  const [scrubberNowISO, setScrubberNowISO] = useState<string>(atFromUrl ?? todayISO())
  const [fitTrigger, setFitTrigger] = useState(0)
  const friendIdsSet = useMemo(() => new Set(friendIds), [friendIds])

  // Sync URL with state (no history pollution)
  useEffect(() => {
    const next = new URLSearchParams(params)
    next.set('tab', tab)
    next.set('at', scrubberNowISO.slice(0, 10))
    if (next.toString() !== params.toString()) {
      router.replace(`/timeline?${next.toString()}`, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, scrubberNowISO])

  const setTab = useCallback((next: TimelineTab) => {
    setTabState(next)
    setFitTrigger((n) => n + 1)
  }, [])

  const tabFiltered = useMemo(
    () => applyTabFilter(spots, tab, userId, friendIdsSet),
    [spots, tab, userId, friendIdsSet],
  )

  const { buckets, firstISO, lastISO } = useTimelineBuckets(tabFiltered)

  const visibleSpots = useMemo(() => {
    const nowMs = new Date(scrubberNowISO).getTime()
    return tabFiltered.filter((s) => new Date(s.created_at).getTime() <= nowMs)
  }, [tabFiltered, scrubberNowISO])

  const ghostSpots = useMemo(() => {
    if (tab !== 'all') return []
    const nowMs = new Date(scrubberNowISO).getTime()
    return tabFiltered.filter((s) => new Date(s.created_at).getTime() > nowMs)
  }, [tab, tabFiltered, scrubberNowISO])

  if (tabFiltered.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center px-6 bg-[#141810]">
        <div className="text-center">
          <p className="text-base font-semibold text-white mb-2">
            {tab === 'mine' ? 'Du hast noch keine Plätzchen eingetragen' : tab === 'friends' ? 'Keine Plätzchen von Freunden' : 'Noch keine Plätzchen'}
          </p>
          <p className="text-sm text-[#8aa376] mb-4">
            {tab === 'mine' ? 'Trag dein erstes ein und scroll dich später durch deinen Verlauf.' : 'Sobald welche eingetragen sind, erscheinen sie hier.'}
          </p>
          <a href="/spots/new" className="text-primary hover:underline font-medium">Erstes Plätzchen eintragen →</a>
        </div>
      </div>
    )
  }

  return (
    <>
      <TimelineMap visibleSpots={visibleSpots} ghostSpots={ghostSpots} fitTrigger={fitTrigger} />
      <TimelineScrubber
        buckets={buckets}
        firstISO={firstISO}
        lastISO={lastISO ?? todayISO()}
        scrubberNowISO={scrubberNowISO}
        visibleCount={visibleSpots.length}
        tab={tab}
        onScrub={setScrubberNowISO}
        onTabChange={setTab}
      />
    </>
  )
}
