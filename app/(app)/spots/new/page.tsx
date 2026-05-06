import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AddSpotForm from '@/components/AddSpotForm'
import PageHeader from '@/components/ui/PageHeader'

interface PageProps {
  searchParams: Promise<{ lat?: string; lng?: string }>
}

export default async function NewSpotPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const params = await searchParams
  const lat = parseFloat(params.lat ?? '51.1')
  const lng = parseFloat(params.lng ?? '10.4')

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-sm mx-auto px-4 py-8">
        <PageHeader
          title="Neues Plätzchen eintragen"
          backHref="/map"
          backLabel="Zurück zur Karte"
        />
        <AddSpotForm initialLat={lat} initialLng={lng} />
      </div>
    </div>
  )
}
