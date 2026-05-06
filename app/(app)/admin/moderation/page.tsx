import { redirect } from 'next/navigation'
import Link from 'next/link'
import { IconChevronLeft, IconAlertTriangle } from '@tabler/icons-react'
import { requireAdmin, getAllDescriptions, hasServiceRoleKey } from '@/lib/admin-data'
import AdminDescriptions from './AdminDescriptions'

export default async function AdminModerationPage() {
  const ctx = await requireAdmin()
  if (!ctx) redirect('/map')

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/admin"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center gap-1 mb-6"
        >
          <IconChevronLeft size={16} aria-hidden /> Zum Dashboard
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Tipps moderieren</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Alle Community-Tipps. Lösche unangemessene Inhalte direkt.
        </p>

        {!hasServiceRoleKey() && (
          <div className="mb-6 rounded-lg border border-yellow-300 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-900/15 p-3">
            <p className="text-xs text-yellow-700 dark:text-yellow-300 inline-flex items-center gap-2">
              <IconAlertTriangle size={14} aria-hidden /> Ohne <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> sind nur Tipps zu Spots sichtbar, die du selbst sehen darfst.
            </p>
          </div>
        )}

        {ctx.admin ? (
          <AdminDescriptions descriptions={await getAllDescriptions(ctx.admin)} />
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Bitte konfiguriere den Service-Role-Key, um alle Tipps zu sehen.
          </p>
        )}
      </div>
    </div>
  )
}
