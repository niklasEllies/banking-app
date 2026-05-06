import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  IconChevronLeft,
  IconAlertTriangle,
  IconUsers,
  IconMapPin,
  IconMessage2,
  IconChevronRight,
} from '@tabler/icons-react'
import {
  requireAdmin,
  getAllSpots,
  getAllUsers,
  getAdminStats,
  hasServiceRoleKey,
} from '@/lib/admin-data'
import AdminUsers from './AdminUsers'
import AdminSpots from './AdminSpots'
import AdminStatsCard from './AdminStatsCard'

export default async function AdminPage() {
  const ctx = await requireAdmin()
  if (!ctx) redirect('/map')
  const { user, admin } = ctx

  // Without admin client we cannot see private/friends-only spots — fall back
  // to user-bound client which respects RLS (limited but still useful).
  const [spotsAll, users, stats] = await Promise.all([
    admin
      ? getAllSpots(admin)
      : (async () => {
          const { data } = await ctx.supabase
            .from('spots')
            .select('id, name, type, visibility, created_at, created_by, profiles(username)')
            .order('created_at', { ascending: false })
          return ((data ?? []) as Array<{
            id: string
            name: string | null
            type: string
            visibility: string
            created_at: string
            created_by: string | null
            profiles: { username: string | null } | { username: string | null }[] | null
          }>).map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type as never,
            visibility: s.visibility as never,
            created_at: s.created_at,
            created_by: s.created_by,
            owner_username: Array.isArray(s.profiles)
              ? (s.profiles[0]?.username ?? null)
              : (s.profiles?.username ?? null),
          }))
        })(),
    getAllUsers(admin),
    admin ? getAdminStats(admin) : null,
  ])

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/profil"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center gap-1 mb-6"
        >
          <IconChevronLeft size={16} aria-hidden /> Zurück zum Profil
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Admin</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Übersicht und Moderation für Plätzchen-Admins.
        </p>

        {!hasServiceRoleKey() && (
          <div className="mb-6 rounded-lg border border-yellow-300 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-900/15 p-3">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 inline-flex items-center gap-2">
              <IconAlertTriangle size={16} aria-hidden /> SUPABASE_SERVICE_ROLE_KEY fehlt
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Ohne diese Env-Variable fehlen E-Mail-Adressen, private Spots sind unsichtbar, und Statistiken sowie User-Details funktionieren nicht.
              Setze sie in <code className="font-mono">.env.local</code> oder im Vercel-Dashboard.
            </p>
          </div>
        )}

        {stats && <AdminStatsCard stats={stats} />}

        <div className="mt-8 mb-4 flex items-center justify-between">
          <Link
            href="/admin/moderation"
            className="inline-flex items-center justify-between gap-2 w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 py-2.5 px-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#1e231a] transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <IconMessage2 size={18} stroke={1.5} aria-hidden />
              <span>Tipps moderieren</span>
            </span>
            <IconChevronRight size={16} className="text-gray-300 dark:text-gray-600" aria-hidden />
          </Link>
        </div>

        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3 inline-flex items-center gap-2">
              <IconUsers size={16} aria-hidden /> User ({users.length})
            </h2>
            <AdminUsers users={users} currentUserId={user.id} />
          </section>

          <section>
            <h2 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3 inline-flex items-center gap-2">
              <IconMapPin size={16} aria-hidden /> Plätzchen ({spotsAll.length})
            </h2>
            <AdminSpots spots={spotsAll} />
          </section>
        </div>
      </div>
    </div>
  )
}
