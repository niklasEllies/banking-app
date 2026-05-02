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

        <div className="space-y-6">
          <EmojiPicker />
        </div>
      </div>
    </div>
  )
}
