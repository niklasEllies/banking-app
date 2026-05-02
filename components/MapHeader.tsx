import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/actions/auth'

export default async function MapHeader() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <div className="absolute top-3 left-3 right-3 z-1000 flex items-center justify-between bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-md">
      <span className="font-semibold text-gray-900 text-sm">🪑 BenchMarks</span>
      {session ? (
        <form action={logout}>
          <button type="submit" className="text-sm text-gray-600 hover:text-gray-900">
            Logout
          </button>
        </form>
      ) : (
        <Link href="/login" className="text-sm text-green-700 font-medium hover:underline">
          Login
        </Link>
      )}
    </div>
  )
}
