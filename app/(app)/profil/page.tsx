import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import EmojiPicker from '@/components/EmojiPicker'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-sm mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-8">
          ← Zurück zur Karte
        </Link>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Mein Profil</h1>
        <p className="text-sm text-gray-500 mb-8">@{profile?.username ?? user.email}</p>

        <div className="space-y-8">
          <EmojiPicker />

          {/* Subscription */}
          <div>
            <p className="text-sm font-medium text-gray-800 mb-3">Abonnement</p>
            <div className="grid grid-cols-3 gap-3">
              {/* Free */}
              <div className="rounded-xl border-2 border-primary bg-primary-light p-3 flex flex-col items-center gap-1 relative">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Aktiv</span>
                <span className="text-2xl mt-1">🌱</span>
                <p className="text-xs font-bold text-gray-900 text-center leading-tight">Gratis</p>
                <p className="text-[10px] text-gray-500 text-center leading-tight italic">Small pp</p>
                <p className="text-xs font-semibold text-primary mt-1">0 €</p>
              </div>

              {/* Normal */}
              <a
                href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border-2 border-gray-200 bg-white p-3 flex flex-col items-center gap-1 hover:border-gray-300 transition-colors cursor-pointer"
              >
                <span className="text-2xl mt-1">🪵</span>
                <p className="text-xs font-bold text-gray-900 text-center leading-tight">Normal</p>
                <p className="text-[10px] text-gray-500 text-center leading-tight italic">Average size</p>
                <p className="text-xs font-semibold text-gray-700 mt-1">9,99 €/mo</p>
              </a>

              {/* Premium */}
              <a
                href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border-2 border-gray-200 bg-white p-3 flex flex-col items-center gap-1 hover:border-gray-300 transition-colors cursor-pointer"
              >
                <span className="text-2xl mt-1">🌳</span>
                <p className="text-xs font-bold text-gray-900 text-center leading-tight">Premium</p>
                <p className="text-[10px] text-gray-500 text-center leading-tight italic">Humongous</p>
                <p className="text-xs font-semibold text-gray-700 mt-1">99,99 €/mo</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
