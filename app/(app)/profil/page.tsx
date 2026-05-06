import { redirect } from 'next/navigation'
import {
  IconUsers,
  IconSparkles,
  IconTool,
  IconLogout,
  IconSeedling,
  IconWood,
  IconTree,
} from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/server'
import EmojiPicker from '@/components/EmojiPicker'
import { logout } from '@/actions/auth'
import { countIncomingRequests } from '@/actions/friends'
import PageHeader from '@/components/ui/PageHeader'
import ListRow from '@/components/ui/ListRow'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, incomingCount] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, is_admin, marker_emoji')
      .eq('id', user.id)
      .maybeSingle(),
    countIncomingRequests(),
  ])

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-sm mx-auto px-4 py-8">
        <PageHeader
          title="Mein Profil"
          subtitle={`@${profile?.username ?? user.email}`}
          backHref="/map"
          backLabel="Zurück zur Karte"
        />

        <div className="space-y-8">
          <EmojiPicker initialEmoji={profile?.marker_emoji ?? null} />

          {/* Subscription */}
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Abonnement</p>
            <div className="grid grid-cols-3 gap-3">
              {/* Free */}
              <div className="rounded-xl border-2 border-primary bg-primary-light dark:bg-[#2a3f1e] p-3 flex flex-col items-center gap-1 relative">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Aktiv</span>
                <IconSeedling size={28} stroke={1.5} className="mt-1 text-primary" aria-hidden />
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 text-center leading-tight">Small pp</p>
                <p className="text-xs font-semibold text-primary mt-1">0 €</p>
              </div>

              {/* Normal */}
              <a
                href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e231a] p-3 flex flex-col items-center gap-1 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
              >
                <IconWood size={28} stroke={1.5} className="mt-1 text-gray-700 dark:text-gray-300" aria-hidden />
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 text-center leading-tight">Average size</p>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">9,99 €/mo</p>
              </a>

              {/* Premium */}
              <a
                href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e231a] p-3 flex flex-col items-center gap-1 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
              >
                <IconTree size={28} stroke={1.5} className="mt-1 text-gray-700 dark:text-gray-300" aria-hidden />
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 text-center leading-tight">Humongous</p>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">99,99 €/mo</p>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <ListRow
            href="/friends"
            Icon={IconUsers}
            label="Freunde"
            rightSlot={incomingCount > 0 ? <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">{incomingCount}</span> : undefined}
          />

          <ListRow href="/changelog" Icon={IconSparkles} label="Was ist neu" />

          {profile?.is_admin && <ListRow href="/admin" Icon={IconTool} label="Admin Dashboard" />}

          <form action={logout}>
            <ListRow type="submit" Icon={IconLogout} label="Abmelden" tone="danger" />
          </form>
        </div>
      </div>
    </div>
  )
}
