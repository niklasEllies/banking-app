'use client'

import dynamic from 'next/dynamic'
import type { Spot } from '@/components/SpotMap'
import type { GpsState } from '@/components/MapLayout'

export type { Spot } from '@/components/SpotMap'

const SpotMap = dynamic(() => import('@/components/SpotMap'), { ssr: false })

interface SpotMapClientProps {
  spots: Spot[]
  isAuthenticated: boolean
  userId: string | null
  sheetExpanded: boolean
  onBenchSelect?: (benchId: string) => void
  flyTarget?: { lat: number; lng: number } | null
  onFlyTargetUsed?: () => void
  isAdmin?: boolean
  onPositionUpdate?: (pos: { lat: number; lng: number }) => void
  onGpsStateChange?: (state: GpsState) => void
  gpsState?: GpsState
}

export default function SpotMapClient(props: SpotMapClientProps) {
  return <SpotMap {...props} />
}
