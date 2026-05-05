import { createClient } from '@/lib/supabase/server'
import MapHeader from '@/components/MapHeader'
import MapLayout from '@/components/MapLayout'
import type { Spot } from '@/components/SpotMap'
import { listFavoriteSpotIds } from '@/actions/favorites'

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: spots }, { data: { user } }] = await Promise.all([
    supabase.from('spots').select('id, type, lat, lng, name, created_by, created_at, photo_url'),
    supabase.auth.getUser(),
  ])

  let isAdmin = false
  let favoriteIds: string[] = []
  if (user) {
    const [profileResult, favIds] = await Promise.all([
      supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle(),
      listFavoriteSpotIds(),
    ])
    isAdmin = profileResult.data?.is_admin ?? false
    favoriteIds = favIds
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
        initialFavoriteIds={favoriteIds}
      />
    </div>
  )
}
