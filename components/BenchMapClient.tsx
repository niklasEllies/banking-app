'use client'

// ssr: false is not allowed in Server Components (Next.js 16).
// This thin client wrapper owns the dynamic import so the restriction is satisfied.
import dynamic from 'next/dynamic'
import type { Bench } from '@/components/BenchMap'

const BenchMap = dynamic(() => import('@/components/BenchMap'), { ssr: false })

interface BenchMapClientProps {
  benches: Bench[]
  isAuthenticated: boolean
  userId: string | null
}

export default function BenchMapClient({ benches, isAuthenticated, userId }: BenchMapClientProps) {
  return <BenchMap benches={benches} isAuthenticated={isAuthenticated} userId={userId} />
}
