import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { SpotType } from '@/lib/spot-types'
import type { SpotVisibility } from '@/lib/spot-visibility'

export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
}

/**
 * Verify the calling user is an admin. Server-only. Returns null if not admin.
 * Returned object includes both the user-scoped client AND the admin client
 * (the latter being null if SUPABASE_SERVICE_ROLE_KEY is not configured).
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) return null

  const admin = hasServiceRoleKey() ? createAdminClient() : null
  return { user, supabase, admin }
}

export interface AdminSpotRow {
  id: string
  name: string | null
  type: SpotType
  visibility: SpotVisibility
  created_at: string
  created_by: string | null
  owner_username: string | null
}

export interface AdminUserRow {
  id: string
  username: string | null
  is_admin: boolean
  created_at: string
  email: string | null
  spot_count: number
}

export interface AdminStats {
  totalUsers: number
  totalSpots: number
  totalDescriptions: number
  spotsThisWeek: number
  usersThisWeek: number
  byVisibility: Record<SpotVisibility, number>
  byType: Record<SpotType, number>
}

/** Loads all spots regardless of visibility — admin-client bypasses RLS. */
export async function getAllSpots(adminClient: ReturnType<typeof createAdminClient>): Promise<AdminSpotRow[]> {
  const { data } = await adminClient
    .from('spots')
    .select('id, name, type, visibility, created_at, created_by, profiles(username)')
    .order('created_at', { ascending: false })

  return ((data ?? []) as Array<{
    id: string
    name: string | null
    type: SpotType
    visibility: SpotVisibility
    created_at: string
    created_by: string | null
    profiles: { username: string | null } | { username: string | null }[] | null
  }>).map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    visibility: s.visibility,
    created_at: s.created_at,
    created_by: s.created_by,
    owner_username: Array.isArray(s.profiles)
      ? (s.profiles[0]?.username ?? null)
      : (s.profiles?.username ?? null),
  }))
}

export async function getAllUsers(
  adminClient: ReturnType<typeof createAdminClient> | null,
): Promise<AdminUserRow[]> {
  // Profiles can be loaded via user-client (RLS permissive), but spot counts
  // need admin-client to count private/friends-only spots correctly.
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, is_admin, created_at')
    .order('created_at')

  const allSpots = adminClient
    ? (await adminClient.from('spots').select('id, created_by')).data ?? []
    : []

  const spotCountByUser = new Map<string, number>()
  for (const s of allSpots) {
    if (s.created_by) {
      spotCountByUser.set(s.created_by, (spotCountByUser.get(s.created_by) ?? 0) + 1)
    }
  }

  let emailMap: Record<string, string> = {}
  if (adminClient) {
    const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    emailMap = Object.fromEntries((authData?.users ?? []).map((u) => [u.id, u.email ?? '—']))
  }

  return (profiles ?? []).map((p) => ({
    id: p.id,
    username: p.username,
    is_admin: p.is_admin,
    created_at: p.created_at,
    email: emailMap[p.id] ?? null,
    spot_count: spotCountByUser.get(p.id) ?? 0,
  }))
}

export async function getAdminStats(
  adminClient: ReturnType<typeof createAdminClient>,
): Promise<AdminStats> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [usersTotal, usersWeek, spotsAll, descTotal] = await Promise.all([
    adminClient.from('profiles').select('id', { count: 'exact', head: true }),
    adminClient.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo),
    adminClient.from('spots').select('id, type, visibility, created_at'),
    adminClient.from('spot_descriptions').select('id', { count: 'exact', head: true }),
  ])

  const allSpots = (spotsAll.data ?? []) as Array<{
    id: string
    type: SpotType
    visibility: SpotVisibility
    created_at: string
  }>

  const byType: Record<SpotType, number> = {
    bench: 0, viewpoint: 0, shelter: 0, picnic: 0, meadow: 0, water: 0,
  }
  const byVisibility: Record<SpotVisibility, number> = {
    public: 0, friends: 0, private: 0,
  }
  let spotsThisWeek = 0
  for (const s of allSpots) {
    byType[s.type] = (byType[s.type] ?? 0) + 1
    byVisibility[s.visibility] = (byVisibility[s.visibility] ?? 0) + 1
    if (s.created_at >= oneWeekAgo) spotsThisWeek++
  }

  return {
    totalUsers: usersTotal.count ?? 0,
    totalSpots: allSpots.length,
    totalDescriptions: descTotal.count ?? 0,
    usersThisWeek: usersWeek.count ?? 0,
    spotsThisWeek,
    byVisibility,
    byType,
  }
}

export interface AdminDescription {
  id: string
  spot_id: string
  user_id: string | null
  text: string
  created_at: string
  username: string | null
  spot_name: string | null
  spot_type: SpotType
}

export async function getAllDescriptions(
  adminClient: ReturnType<typeof createAdminClient>,
): Promise<AdminDescription[]> {
  const { data } = await adminClient
    .from('spot_descriptions')
    .select('id, spot_id, user_id, text, created_at, profiles(username), spots(name, type)')
    .order('created_at', { ascending: false })

  return ((data ?? []) as Array<{
    id: string
    spot_id: string
    user_id: string | null
    text: string
    created_at: string
    profiles: { username: string | null } | { username: string | null }[] | null
    spots: { name: string | null; type: SpotType } | { name: string | null; type: SpotType }[] | null
  }>).map((d) => ({
    id: d.id,
    spot_id: d.spot_id,
    user_id: d.user_id,
    text: d.text,
    created_at: d.created_at,
    username: Array.isArray(d.profiles)
      ? (d.profiles[0]?.username ?? null)
      : (d.profiles?.username ?? null),
    spot_name: Array.isArray(d.spots)
      ? (d.spots[0]?.name ?? null)
      : (d.spots?.name ?? null),
    spot_type: (Array.isArray(d.spots)
      ? d.spots[0]?.type
      : d.spots?.type) as SpotType,
  }))
}

export interface UserDetail {
  id: string
  username: string | null
  email: string | null
  is_admin: boolean
  created_at: string
  spots: AdminSpotRow[]
  friendCount: number
  descriptionCount: number
}

export async function getUserDetail(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<UserDetail | null> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, is_admin, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) return null

  const [spotsRes, friendsRes, descRes, authRes] = await Promise.all([
    adminClient
      .from('spots')
      .select('id, name, type, visibility, created_at, created_by')
      .eq('created_by', userId)
      .order('created_at', { ascending: false }),
    adminClient
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted'),
    adminClient
      .from('spot_descriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    adminClient.auth.admin.getUserById(userId),
  ])

  const spots: AdminSpotRow[] = (spotsRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type as SpotType,
    visibility: s.visibility as SpotVisibility,
    created_at: s.created_at,
    created_by: s.created_by,
    owner_username: profile.username,
  }))

  return {
    id: profile.id,
    username: profile.username,
    email: authRes.data?.user?.email ?? null,
    is_admin: profile.is_admin,
    created_at: profile.created_at,
    spots,
    friendCount: friendsRes.count ?? 0,
    descriptionCount: descRes.count ?? 0,
  }
}
