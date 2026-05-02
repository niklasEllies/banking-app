'use client'

import { useState } from 'react'
import BenchMapClient from '@/components/BenchMapClient'
import BottomSheet from '@/components/BottomSheet'
import type { Bench } from '@/components/BenchMap'

interface MapLayoutProps {
  benches: Bench[]
  isAuthenticated: boolean
  userId: string | null
}

export default function MapLayout({ benches, isAuthenticated, userId }: MapLayoutProps) {
  const [sheetExpanded, setSheetExpanded] = useState(false)

  return (
    <>
      <BenchMapClient
        benches={benches}
        isAuthenticated={isAuthenticated}
        userId={userId}
        sheetExpanded={sheetExpanded}
      />
      <BottomSheet
        benches={benches}
        userId={userId}
        onExpandedChange={setSheetExpanded}
      />
    </>
  )
}
