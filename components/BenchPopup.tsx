import type { Bench } from '@/components/BenchMap'
import RarityBadge from '@/components/RarityBadge'
import { benchDisplayName } from '@/lib/bench-utils'

interface BenchPopupProps {
  bench: Bench
  userId: string | null
  rarityMedian: number | null
  onDetails: () => void
  onDelete: () => void
}

export default function BenchPopup({
  bench,
  userId,
  rarityMedian,
  onDetails,
  onDelete,
}: BenchPopupProps) {
  const isOwner = userId && bench.created_by === userId

  return (
    <div style={{ minWidth: '160px', fontFamily: 'system-ui' }}>
      {bench.photo_url ? (
        <img
          src={bench.photo_url}
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
          🪑
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <strong style={{ fontSize: '13px', flex: 1 }}>
          {benchDisplayName(bench.name, bench.created_at)}
        </strong>
        <RarityBadge median={rarityMedian} size="sm" />
      </div>

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
