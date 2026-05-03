'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBenchStats, type AggregatedStats, type UserVote } from '@/actions/stats'
import { conditionLabel, shadowLabel, extrasIcon } from '@/lib/stats-utils'
import RarityBadge from '@/components/RarityBadge'
import StatsVoteForm from '@/components/StatsVoteForm'

interface BenchDetailProps {
  benchId: string
  userId: string | null
}

export default function BenchDetail({ benchId, userId }: BenchDetailProps) {
  const [aggregated, setAggregated] = useState<AggregatedStats | null>(null)
  const [userVote, setUserVote] = useState<UserVote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getBenchStats(benchId).then(({ aggregated: agg, userVote: vote }) => {
      setAggregated(agg)
      setUserVote(vote)
      setLoading(false)
    })
  }, [benchId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <span className="text-sm text-gray-500 dark:text-gray-400">Lädt…</span>
      </div>
    )
  }

  const condition = conditionLabel(aggregated?.condition_median ?? null)
  const shadow = shadowLabel(aggregated?.shadow_mode ?? null)
  const hasAnyStats = aggregated && aggregated.vote_count > 0

  return (
    <div className="px-5 py-3 space-y-4">
      {aggregated && aggregated.vote_count > 0 && (
        <div className="flex items-center gap-2">
          <RarityBadge median={aggregated.rarity_median} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {aggregated.vote_count} {aggregated.vote_count === 1 ? 'Bewertung' : 'Bewertungen'}
          </span>
        </div>
      )}

      {hasAnyStats && (
        <div className="flex flex-wrap gap-2">
          {aggregated.comfort_median !== null && (
            <div className="bg-gray-100 dark:bg-[#2a3124] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200">
              ⭐ <strong>{aggregated.comfort_median.toFixed(1)}</strong>/5 Komfort
            </div>
          )}
          {aggregated.view_median !== null && (
            <div className="bg-gray-100 dark:bg-[#2a3124] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200">
              🌄 <strong>{aggregated.view_median.toFixed(1)}</strong>/5 Aussicht
            </div>
          )}
          {condition && (
            <div
              className="rounded-lg px-3 py-1.5 text-sm font-semibold"
              style={{ background: condition.color, color: '#1a1c17' }}
            >
              🏚 {condition.short} — {condition.full}
            </div>
          )}
          {shadow && (
            <div className="bg-gray-100 dark:bg-[#2a3124] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200">
              ☀️ {shadow}
            </div>
          )}
          {(aggregated.extras_threshold?.length ?? 0) > 0 && (
            <div className="bg-gray-100 dark:bg-[#2a3124] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200">
              {aggregated.extras_threshold.map(e => extrasIcon(e)).join(' ')}
            </div>
          )}
        </div>
      )}

      {!hasAnyStats && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Noch keine Bewertungen — sei der Erste!
        </p>
      )}

      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        {userId ? (
          <StatsVoteForm
            benchId={benchId}
            initialVote={userVote}
            onSaved={(agg, vote) => { setAggregated(agg); setUserVote(vote) }}
          />
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <Link href="/login" className="text-primary font-medium hover:underline">
              Einloggen
            </Link>{' '}
            um eine Bewertung abzugeben
          </p>
        )}
      </div>
    </div>
  )
}
