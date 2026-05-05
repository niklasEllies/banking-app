import { createClient } from '@/lib/supabase/server'
import MapHeader from '@/components/MapHeader'
import MapLayout from '@/components/MapLayout'
import ChangelogModal from '@/components/ChangelogModal'
import type { Spot } from '@/components/SpotMap'
import { listFavoriteSpotIds } from '@/actions/favorites'
import { listFriends } from '@/actions/friends'
import { loadChangelog } from '@/lib/changelog-server'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ spot?: string }>
}) {
  const { spot: initialSpotId } = await searchParams
  const supabase = await createClient()

  const [{ data: spots }, { data: { user } }, changelog] = await Promise.all([
    supabase.from('spots').select('id, type, visibility, lat, lng, name, created_by, created_at, photo_url'),
    supabase.auth.getUser(),
    loadChangelog(),
  ])

  let isAdmin = false
  let favoriteIds: string[] = []
  let friendIds: string[] = []
  if (user) {
    const [profileResult, favIds, friends] = await Promise.all([
      supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle(),
      listFavoriteSpotIds(),
      listFriends(),
    ])
    isAdmin = profileResult.data?.is_admin ?? false
    favoriteIds = favIds
    friendIds = friends.map((f) => f.id)
  }

  const spotList: Spot[] = spots ?? []
  const latestEntry = changelog[0]

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <MapHeader />
      <MapLayout
        spots={spotList}
        isAuthenticated={!!user}
        userId={user?.id ?? null}
        isAdmin={isAdmin}
        initialFavoriteIds={favoriteIds}
        initialFriendIds={friendIds}
        initialSpotId={initialSpotId ?? null}
      />
      {latestEntry && <ChangelogModal latest={latestEntry} />}
    </div>
  )
}
