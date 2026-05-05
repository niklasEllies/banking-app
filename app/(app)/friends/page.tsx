import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
} from '@/actions/friends'
import FriendsClient from '@/components/FriendsClient'

export const metadata = {
  title: 'Freunde — Plätzchen',
}

export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [friends, incoming, outgoing] = await Promise.all([
    listFriends(),
    listIncomingRequests(),
    listOutgoingRequests(),
  ])

  return <FriendsClient friends={friends} incoming={incoming} outgoing={outgoing} />
}
