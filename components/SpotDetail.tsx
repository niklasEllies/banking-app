'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { IconSun, IconStar, IconMountain, IconHome, IconTrash, IconUmbrella, IconAccessible, IconToolsKitchen2, IconBike } from '@tabler/icons-react'
import type { ComponentType } from 'react'
import type { Spot } from '@/components/SpotMap'
import { getSpotStats, type AggregatedStats, type UserVote } from '@/actions/stats'
import { conditionLabel, shadowLabel } from '@/lib/stats-utils'

const EXTRAS_ICON_MAP: Record<string, ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  bin:        IconTrash,
  roof:       IconUmbrella,
  accessible: IconAccessible,
  table:      IconToolsKitchen2,
  bicycle:    IconBike,
}
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
  const TypeIcon = SPOT_TYPE_MAP[spot.type].Icon

  return (
    <div>
      {/* Photo header */}
      <div className="relative" style={{ height: '110px' }}>
        {spot.photo_url ? (
          <Image
            src={spot.photo_url}
            alt={SPOT_TYPE_MAP[spot.type].label}
            fill
            sizes="(max-width: 640px) 100vw, 600px"
            className="object-cover"
            priority
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: '#2d3a1e' }}
          >
            <TypeIcon size={42} stroke={1.5} color="#c8c8c0" aria-hidden />
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
              <div className="bg-gray-100 dark:bg-[#2a3124] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 inline-flex items-center gap-1">
                <IconStar size={13} aria-hidden /> <strong>{aggregated.comfort_median.toFixed(1)}</strong>/5 Komfort
              </div>
            )}
            {aggregated.view_median !== null && (
              <div className="bg-gray-100 dark:bg-[#2a3124] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 inline-flex items-center gap-1">
                <IconMountain size={13} aria-hidden /> <strong>{aggregated.view_median.toFixed(1)}</strong>/5 Aussicht
              </div>
            )}
            {condition && (
              <div
                className="rounded-lg px-3 py-1.5 text-sm font-semibold inline-flex items-center gap-1"
                style={{ background: condition.color, color: '#141810' }}
              >
                <IconHome size={13} aria-hidden /> {condition.short} — {condition.full}
              </div>
            )}
            {shadow && (
              <div className="bg-gray-100 dark:bg-[#2a3124] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 inline-flex items-center gap-1">
                <IconSun size={13} aria-hidden /> {shadow}
              </div>
            )}
            {(aggregated.extras_threshold?.length ?? 0) > 0 && (
              <div className="bg-gray-100 dark:bg-[#2a3124] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                {aggregated.extras_threshold.map(e => {
                  const ExtraIcon = EXTRAS_ICON_MAP[e]
                  return ExtraIcon ? <ExtraIcon key={e} size={14} aria-hidden /> : null
                })}
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
