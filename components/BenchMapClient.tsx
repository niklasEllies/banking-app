'use client'

import dynamic from 'next/dynamic'
import type { Bench } from '@/components/BenchMap'
import type { GpsState } from '@/components/MapLayout'

const BenchMap = dynamic(() => import('@/components/BenchMap'), { ssr: false })

interface BenchMapClientProps {
  benches: Bench[]
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

export default function BenchMapClient(props: BenchMapClientProps) {
  return <BenchMap {...props} />
}
