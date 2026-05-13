'use client'

import dynamic from 'next/dynamic'
import type { SpotType } from '@/lib/spot-types'

const PinPickerMap = dynamic(() => import('@/components/PinPickerMap'), {
  ssr: false,
  loading: () => <div className="h-72 rounded-xl bg-gray-100 dark:bg-[#1e231a] animate-pulse" />,
})

interface PinPickerMapClientProps {
  lat: number | null
  lng: number | null
  type: SpotType
  onPinChange: (lat: number, lng: number) => void
}

export default function PinPickerMapClient(props: PinPickerMapClientProps) {
  return <PinPickerMap {...props} />
}
