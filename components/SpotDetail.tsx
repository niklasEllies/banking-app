'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Spot } from '@/components/SpotMap'
import { getSpotStats, type AggregatedStats, type UserVote } from '@/actions/stats'
import { conditionLabel, shadowLabel, extrasIcon } from '@/lib/stats-utils'
import { spotDisplayName } from '@/lib/spot-utils'
import { SPOT_TYPE_MAP } from '@/lib/spot-types'
import { SPOT_VISIBILITY_MAP } from '@/lib/spot-visibility'
import RarityBadge from '@/components/RarityBadge'
import StatsVoteForm from '@/components/StatsVoteForm'
import SpotDescriptionFeed from '@/components/SpotDescriptionFeed'

interface SpotDetailProps {
  spot: Spot
  userId: string | null
}

export default function SpotDetail({ spot, userId }: SpotDetailProps) {
  const [aggregated, setAggregated] = useState<AggregatedStats | null>(null)
  const [userVote, setUserVote] = useState<UserVote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getSpotStats(spot.id).then(({ aggregated: agg, userVote: vote }) => {
      setAggregated(agg)
      setUserVote(vote)
      setLoading(false)
    })
  }, [spot.id])

  if (loading) {
    return (
      <div>
        {/* Photo header skeleton (matches 110px height of real header) */}
        <div className="bg-gray-200 dark:bg-[#2a3124] animate-pulse" style={{ height: '110px' }} />
        {/* Stats body skeleton */}
        <div className="px-5 py-3 space-y-3 animate-pulse">
          <div className="h-4 w-24 bg-gray-200 dark:bg-[#2a3124] rounded" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-9 bg-gray-200 dark:bg-[#2a3124] rounded-lg" />
            <div className="h-9 bg-gray-200 dark:bg-[#2a3124] rounded-lg" />
            <div className="h-9 bg-gray-200 dark:bg-[#2a3124] rounded-lg" />
          </div>
          <div className="h-4 w-1/2 bg-gray-200 dark:bg-[#2a3124] rounded" />
        </div>
      </div>
    )
  }

  const condition = conditionLabel(aggregated?.condition_median ?? null)
  const shadow = shadowLabel(aggregated?.shadow_mode ?? null)
  const hasAnyStats = aggregated && aggregated.vote_count > 0

  return (
    <div>
      {/* Photo header */}
      <div className="relative" style={{ height: '110px' }}>
        {spot.photo_url ? (
          <img
            src={spot.photo_url}
            alt="Bank"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl"
            style={{ background: '#2d3a1e' }}
          >
            {SPOT_TYPE_MAP[spot.type].emoji}
          </div>
        )}
        {/* Name + rarity overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 px-4 py-2 flex items-end justify-between"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }}
        >
          <span
            className="text-sm font-bold text-white truncate mr-2"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
          >
            {spotDisplayName(spot.name, spot.created_at, spot.type)}
          </span>
          {aggregated && aggregated.rarity_median !== null && (
            <RarityBadge median={aggregated.rarity_median} size="sm" />
          )}
        </div>
      </div>

      {/* Type badge */}
      <div className="px-5 pt-3 -mb-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {SPOT_TYPE_MAP[spot.type].emoji} {SPOT_TYPE_MAP[spot.type].label}
        </span>
        {spot.visibility !== 'public' && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            {SPOT_VISIBILITY_MAP[spot.visibility].emoji} {SPOT_VISIBILITY_MAP[spot.visibility].label}
          </span>
        )}
      </div>

      {/* Stats body */}
      <div className="px-5 py-3 space-y-4">
        {aggregated && aggregated.vote_count > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {aggregated.vote_count} {aggregated.vote_count === 1 ? 'Bewertung' : 'Bewertungen'}
          </span>
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
                style={{ background: condition.color, color: '#141810' }}
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
              benchId={spot.id}
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

        <SpotDescriptionFeed spotId={spot.id} userId={userId} />
      </div>
    </div>
  )
}
