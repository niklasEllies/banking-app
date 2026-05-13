import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import PhotoFirstForm from '@/components/PhotoFirstForm'

export default async function PhotoFirstPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-sm mx-auto px-4 py-8">
        <PageHeader
          title="Plätzchen aus Foto"
          subtitle="Wähle ein Foto — wenn es Ortsangaben enthält, übernehmen wir den Standort."
          backHref="/map"
          backLabel="Zurück zur Karte"
        />
        <PhotoFirstForm />
      </div>
    </div>
  )
}
