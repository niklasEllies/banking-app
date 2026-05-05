import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminUsers, { type AdminUser } from './AdminUsers'
import AdminSpots, { type AdminSpot } from './AdminSpots'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: self } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!self?.is_admin) redirect('/map')

  const [{ data: profiles }, { data: rawSpots }] = await Promise.all([
    supabase.from('profiles').select('id, username, is_admin, created_at').order('created_at'),
    supabase.from('spots').select('id, name, type, visibility, created_at, created_by, profiles(username)').order('created_at', { ascending: false }),
  ])

  const spots: AdminSpot[] = (rawSpots ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    visibility: s.visibility,
    created_at: s.created_at,
    created_by: s.created_by,
    profiles: Array.isArray(s.profiles) ? (s.profiles[0] ?? null) : s.profiles,
  }))

  // Emails require service role — only fetch if key is configured
  let emailMap: Record<string, string> = {}
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient()
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    emailMap = Object.fromEntries((authData?.users ?? []).map((u) => [u.id, u.email ?? '—']))
  }

  const spotCountByUser = new Map<string, number>()
  for (const s of spots) {
    if (s.created_by) {
      spotCountByUser.set(s.created_by, (spotCountByUser.get(s.created_by) ?? 0) + 1)
    }
  }

  const users: AdminUser[] = (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap[p.id] ?? null,
    spot_count: spotCountByUser.get(p.id) ?? 0,
  }))

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link
          href="/map"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 mb-6"
        >
          ← Zurück zur Karte
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-8">🔧 Admin</h1>

        <div className="space-y-8">
          <AdminUsers users={users} currentUserId={user.id} />
          <AdminSpots spots={spots} />
        </div>
      </div>
    </div>
  )
}
