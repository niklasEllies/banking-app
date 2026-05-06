import { redirect } from 'next/navigation'
import { IconAlertTriangle } from '@tabler/icons-react'
import PageHeader from '@/components/ui/PageHeader'
import { requireAdmin, getAllDescriptions, hasServiceRoleKey } from '@/lib/admin-data'
import AdminDescriptions from './AdminDescriptions'

export default async function AdminModerationPage() {
  const ctx = await requireAdmin()
  if (!ctx) redirect('/map')

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <PageHeader
          title="Tipps moderieren"
          subtitle="Alle Community-Tipps. Lösche unangemessene Inhalte direkt."
          backHref="/admin"
          backLabel="Zum Dashboard"
        />

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
