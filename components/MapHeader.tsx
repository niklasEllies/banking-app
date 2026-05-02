import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/actions/auth'

export default async function MapHeader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="absolute top-3 left-3 right-3 z-1000 flex items-center justify-between bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-md">
      <span className="font-semibold text-gray-900 text-sm">🪑 BenchMarks</span>
      {user ? (
        <div className="flex items-center gap-3 mt-0.5">
          <Link href="/profil" className="text-sm text-gray-600 hover:text-primary">
            Profil
          </Link>
          <form action={logout}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
              Logout
            </button>
          </form>
        </div>
      ) : (
        <Link href="/login" className="text-sm text-primary font-medium hover:underline">
          Login
        </Link>
      )}
    </div>
  )
}
