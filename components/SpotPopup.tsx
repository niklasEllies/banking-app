'use client'

import { useState, useEffect } from 'react'
import type { Spot } from '@/components/SpotMap'
import RarityBadge from '@/components/RarityBadge'
import { spotDisplayName } from '@/lib/spot-utils'
import { getSpotStats } from '@/actions/stats'
import { SPOT_TYPE_MAP } from '@/lib/spot-types'

interface SpotPopupProps {
  spot: Spot
  userId: string | null
  onDetails: () => void
  onDelete: () => void
}

export default function SpotPopup({
  spot,
  userId,
  onDetails,
  onDelete,
}: SpotPopupProps) {
  const isOwner = userId && spot.created_by === userId
  const [rarityMedian, setRarityMedian] = useState<number | null>(null)

  useEffect(() => {
    getSpotStats(spot.id).then(({ aggregated }) => {
      setRarityMedian(aggregated?.rarity_median ?? null)
    })
  }, [spot.id])

  return (
    <div style={{ minWidth: '160px', fontFamily: 'system-ui' }}>
      {spot.photo_url ? (
        <img
          src={spot.photo_url}
          alt="Bank"
          style={{
            width: '100%',
            height: '80px',
            objectFit: 'cover',
            borderRadius: '6px',
            marginBottom: '8px',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '80px',
            borderRadius: '6px',
            marginBottom: '8px',
            background: '#2d3a1e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
          }}
        >
          {SPOT_TYPE_MAP[spot.type].emoji}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <strong style={{ fontSize: '13px', flex: 1 }}>
          {spotDisplayName(spot.name, spot.created_at, spot.type)}
        </strong>
        <RarityBadge median={rarityMedian} size="sm" />
      </div>
      <small style={{ display: 'block', marginTop: '2px', marginBottom: '8px', color: '#888', fontSize: '11px' }}>
        {SPOT_TYPE_MAP[spot.type].emoji} {SPOT_TYPE_MAP[spot.type].label}
      </small>

      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={onDetails}
          style={{
            flex: 1,
            background: '#3d6b2c',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '5px 0',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Details →
        </button>
        {isOwner && (
          <button
            onClick={onDelete}
            style={{
              background: 'none',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              padding: '5px 8px',
              fontSize: '12px',
              cursor: 'pointer',
              color: '#ef4444',
            }}
          >
            🗑
          </button>
        )}
      </div>
    </div>
  )
}
