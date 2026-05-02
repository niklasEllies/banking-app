import { createClient } from '@/lib/supabase/server'
import MapHeader from '@/components/MapHeader'
import BottomSheet from '@/components/BottomSheet'
import BenchMapClient from '@/components/BenchMapClient'
import type { Bench } from '@/components/BenchMap'

// Leaflet läuft nicht auf dem Server — BenchMapClient enthält den dynamic-Import
// mit ssr: false in einem Client Component, wie von Next.js 16 gefordert.
// Die Bankdaten werden vom Server geladen und als Props übergeben.

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: benches }, { data: { user } }] = await Promise.all([
    supabase.from('benches').select('id, lat, lng, name, created_by, created_at'),
    supabase.auth.getUser(),
  ])

  const benchList: Bench[] = benches ?? []

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <MapHeader />
      <BenchMapClient benches={benchList} isAuthenticated={!!user} />
      <BottomSheet benches={benchList} userId={user?.id ?? null} />
    </div>
  )
}
