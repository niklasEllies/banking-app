import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import EmojiPicker from '@/components/EmojiPicker'
import { logout } from '@/actions/auth'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-sm mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 mb-8">
          ← Zurück zur Karte
        </Link>

        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Mein Profil</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">@{profile?.username ?? user.email}</p>

        <div className="space-y-8">
          <EmojiPicker />

          {/* Subscription */}
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Abonnement</p>
            <div className="grid grid-cols-3 gap-3">
              {/* Free */}
              <div className="rounded-xl border-2 border-primary bg-primary-light dark:bg-[#2a3f1e] p-3 flex flex-col items-center gap-1 relative">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Aktiv</span>
                <span className="text-2xl mt-1">🌱</span>
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
                <span className="text-2xl mt-1">🪵</span>
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
                <span className="text-2xl mt-1">🌳</span>
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 text-center leading-tight">Humongous</p>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">99,99 €/mo</p>
              </a>
            </div>
          </div>
        </div>

        {profile?.is_admin && (
          <Link
            href="/admin"
            className="mt-10 flex items-center justify-center gap-2 w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#1e231a] transition-colors"
          >
            🔧 Admin Dashboard
          </Link>
        )}

        <form action={logout} className="mt-3">
          <button
            type="submit"
            className="w-full text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 py-2 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            Abmelden
          </button>
        </form>
      </div>
    </div>
  )
}
