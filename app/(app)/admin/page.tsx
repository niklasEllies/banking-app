import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminUsers, { type AdminUser } from './AdminUsers'
import AdminBenches, { type AdminBench } from './AdminBenches'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: self } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!self?.is_admin) redirect('/')

  const [{ data: profiles }, { data: rawBenches }] = await Promise.all([
    supabase.from('profiles').select('id, username, is_admin, created_at').order('created_at'),
    supabase.from('benches').select('id, name, created_at, created_by, profiles(username)').order('created_at', { ascending: false }),
  ])

  const benches: AdminBench[] = (rawBenches ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    created_at: b.created_at,
    created_by: b.created_by,
    profiles: Array.isArray(b.profiles) ? (b.profiles[0] ?? null) : b.profiles,
  }))

  // Emails require service role — only fetch if key is configured
  let emailMap: Record<string, string> = {}
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient()
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    emailMap = Object.fromEntries((authData?.users ?? []).map((u) => [u.id, u.email ?? '—']))
  }

  const users: AdminUser[] = (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap[p.id] ?? null,
    bench_count: (benches ?? []).filter((b) => b.created_by === p.id).length,
  }))

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link
          href="/"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 mb-6"
        >
          ← Zurück zur Karte
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-8">🔧 Admin</h1>

        <div className="space-y-8">
          <AdminUsers users={users} currentUserId={user.id} />
          <AdminBenches benches={benches} />
        </div>
      </div>
    </div>
  )
}
