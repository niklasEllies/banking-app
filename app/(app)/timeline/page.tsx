import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { listFriends } from '@/actions/friends'
import { getTimelineSpots } from '@/lib/timeline-data'
import MapHeader from '@/components/MapHeader'
import TimelineClient from './TimelineClient'

export const metadata: Metadata = {
  title: 'Verlauf',
  description: 'Wann welche Plätzchen eingetragen wurden — Time-Lapse über die Karte.',
}

export default async function TimelinePage() {
  const supabase = await createClient()
  const [{ data: { user } }, spots] = await Promise.all([
    supabase.auth.getUser(),
    getTimelineSpots(),
  ])

  const friends = user ? await listFriends() : []
  const friendIds = friends.map((f) => f.id)

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <MapHeader />
      <TimelineClient
        spots={spots}
        userId={user?.id ?? null}
        friendIds={friendIds}
      />
    </div>
  )
}
