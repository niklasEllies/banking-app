'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface FriendUser {
  id: string
  username: string | null
}

export interface FriendRequest extends FriendUser {
  created_at: string
}

interface ProfileJoin {
  id: string
  username: string | null
}

type ProfileJoinValue = ProfileJoin | ProfileJoin[] | null

interface FriendshipListRow {
  requester_id: string
  addressee_id: string
  requester: ProfileJoinValue
  addressee: ProfileJoinValue
}

interface FriendshipRequestRow {
  requester_id?: string
  addressee_id?: string
  created_at: string
  profiles: ProfileJoinValue
}

function pickProfile(p: ProfileJoinValue): ProfileJoin | null {
  if (!p) return null
  return Array.isArray(p) ? p[0] ?? null : p
}

export async function searchUserByUsername(
  query: string,
): Promise<FriendUser | null> {
  const trimmed = query.trim()
  if (trimmed.length < 1) return null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', trimmed)
    .maybeSingle()

  if (!data) return null
  if (data.id === user.id) return null // hide self
  return { id: data.id, username: data.username }
}

export async function sendFriendRequest(
  addresseeId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }
  if (addresseeId === user.id) {
    return { error: 'Du kannst dir nicht selbst eine Anfrage senden' }
  }

  const { error } = await supabase.from('friendships').insert({
    requester_id: user.id,
    addressee_id: addresseeId,
    status: 'pending',
  })

  if (error) {
    // 23505 = unique_violation — request already exists in this direction
    if ((error as { code?: string }).code === '23505') {
      return { error: 'Anfrage existiert bereits' }
    }
    return { error: error.message }
  }

  revalidatePath('/friends')
  revalidatePath('/profil')
  revalidatePath('/')
  revalidatePath('/map')
  return {}
}

export async function acceptFriendRequest(
  requesterId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('requester_id', requesterId)
    .eq('addressee_id', user.id)
    .eq('status', 'pending')

  if (error) return { error: error.message }

  revalidatePath('/friends')
  revalidatePath('/profil')
  revalidatePath('/')
  revalidatePath('/map')
  return {}
}

export async function declineFriendRequest(
  requesterId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('requester_id', requesterId)
    .eq('addressee_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/friends')
  revalidatePath('/profil')
  return {}
}

export async function cancelFriendRequest(
  addresseeId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('requester_id', user.id)
    .eq('addressee_id', addresseeId)

  if (error) return { error: error.message }

  revalidatePath('/friends')
  revalidatePath('/profil')
  return {}
}

export async function removeFriend(
  otherUserId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  // Friendship row could be in either direction — delete whichever matches
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${user.id})`,
    )

  if (error) return { error: error.message }

  revalidatePath('/friends')
  revalidatePath('/profil')
  revalidatePath('/')
  revalidatePath('/map')
  return {}
}

export async function listFriends(): Promise<FriendUser[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('friendships')
    .select(
      'requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(id, username), addressee:profiles!friendships_addressee_id_fkey(id, username)',
    )
    .eq('status', 'accepted')

  if (error || !data) return []

  return (data as FriendshipListRow[])
    .map((row) => {
      const isRequester = row.requester_id === user.id
      const other = isRequester ? row.addressee : row.requester
      const profile = pickProfile(other)
      if (!profile) return null
      return { id: profile.id, username: profile.username }
    })
    .filter((v): v is FriendUser => v !== null)
}

export async function listIncomingRequests(): Promise<FriendRequest[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('friendships')
    .select(
      'requester_id, created_at, profiles!friendships_requester_id_fkey(id, username)',
    )
    .eq('addressee_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as FriendshipRequestRow[]).map((row) => {
    const profile = pickProfile(row.profiles)
    return {
      id: row.requester_id ?? profile?.id ?? '',
      username: profile?.username ?? null,
      created_at: row.created_at,
    }
  })
}

export async function listOutgoingRequests(): Promise<FriendRequest[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('friendships')
    .select(
      'addressee_id, created_at, profiles!friendships_addressee_id_fkey(id, username)',
    )
    .eq('requester_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as FriendshipRequestRow[]).map((row) => {
    const profile = pickProfile(row.profiles)
    return {
      id: row.addressee_id ?? profile?.id ?? '',
      username: profile?.username ?? null,
      created_at: row.created_at,
    }
  })
}

export async function countIncomingRequests(): Promise<number> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0

  const { count } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('addressee_id', user.id)
    .eq('status', 'pending')

  return count ?? 0
}
