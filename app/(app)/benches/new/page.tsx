import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AddBenchForm from '@/components/AddBenchForm'

interface PageProps {
  searchParams: Promise<{ lat?: string; lng?: string }>
}

export default async function NewBenchPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const params = await searchParams
  const lat = parseFloat(params.lat ?? '51.1')
  const lng = parseFloat(params.lng ?? '10.4')

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-sm mx-auto px-4 py-8">
        <Link
          href="/"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 mb-6"
        >
          ← Zurück zur Karte
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Bank eintragen</h1>
        <AddBenchForm initialLat={lat} initialLng={lng} />
      </div>
    </div>
  )
}
