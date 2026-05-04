import { createClient } from '@/lib/supabase/server'
import MapHeader from '@/components/MapHeader'
import MapLayout from '@/components/MapLayout'
import type { Spot } from '@/components/SpotMap'

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: spots }, { data: { user } }] = await Promise.all([
    supabase.from('spots').select('id, type, lat, lng, name, created_by, created_at, photo_url'),
    supabase.auth.getUser(),
  ])

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    isAdmin = profile?.is_admin ?? false
  }

  const spotList: Spot[] = spots ?? []

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <MapHeader />
      <MapLayout
        spots={spotList}
        isAuthenticated={!!user}
        userId={user?.id ?? null}
        isAdmin={isAdmin}
      />
    </div>
  )
}
