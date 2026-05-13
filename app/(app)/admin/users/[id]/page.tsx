import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { IconChevronLeft } from '@tabler/icons-react'
import { requireAdmin, getUserDetail } from '@/lib/admin-data'
import AdminUserSpots from './AdminUserSpots'

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await requireAdmin()
  if (!ctx) redirect('/map')

  if (!ctx.admin) {
    return (
      <div className="min-h-screen bg-surface dark:bg-[#141810]">
        <div className="max-w-lg mx-auto px-4 py-8">
          <Link href="/admin" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center gap-1 mb-6">
            <IconChevronLeft size={16} aria-hidden /> Zum Dashboard
          </Link>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            User-Details brauchen den <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code>. Setze die Env-Variable.
          </p>
        </div>
      </div>
    )
  }

  const detail = await getUserDetail(ctx.admin, id)
  if (!detail) notFound()

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link href="/admin" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center gap-1 mb-6">
          <IconChevronLeft size={16} aria-hidden /> Zum Dashboard
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              @{detail.username ?? '—'}
            </h1>
            {detail.is_admin && (
              <span className="text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">
                Admin
              </span>
            )}
          </div>
          {detail.email && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{detail.email}</p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Mitglied seit {new Date(detail.created_at).toLocaleDateString('de-DE')}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <Stat label="Plätzchen" value={detail.spots.length} />
          <Stat label="Freunde" value={detail.friendCount} />
          <Stat label="Tipps" value={detail.descriptionCount} />
        </div>

        <h2 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
          Plätzchen ({detail.spots.length})
        </h2>
        <AdminUserSpots spots={detail.spots} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-[#1e231a] rounded-xl px-3 py-3 text-center">
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
