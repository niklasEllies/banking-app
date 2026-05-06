import Link from 'next/link'
import { IconMapPin, IconHistory } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/server'
import ThemeToggle from '@/components/ThemeToggle'
import type { ThemePreference } from '@/actions/profile'

export default async function MapHeader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userTheme: ThemePreference | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('theme_preference')
      .eq('id', user.id)
      .maybeSingle()
    userTheme = (data?.theme_preference as ThemePreference) ?? 'system'
  }

  return (
    <div className="absolute top-3 left-3 right-3 z-1000 flex items-center justify-between bg-white/95 dark:bg-[#141810]/95 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-md">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-gray-100 text-sm hover:text-primary dark:hover:text-primary transition-colors"
      >
        <IconMapPin size={16} aria-hidden /> Plätzchen
      </Link>
      <div className="flex items-center gap-3 mt-0.5">
        <Link
          href="/timeline"
          aria-label="Verlauf"
          title="Verlauf"
          className="text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"
        >
          <IconHistory size={18} aria-hidden />
        </Link>
        <ThemeToggle userTheme={userTheme} />
        {user ? (
          <Link href="/profil" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
            Profil
          </Link>
        ) : (
          <Link href="/login" className="text-sm text-primary font-medium hover:underline">
            Login
          </Link>
        )}
      </div>
    </div>
  )
}
