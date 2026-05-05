import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SpotEditForm from '@/components/SpotEditForm'

export default async function EditSpotPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: spot } = await supabase
    .from('spots')
    .select('id, name, type, created_by')
    .eq('id', id)
    .maybeSingle()

  if (!spot) redirect('/')
  if (spot.created_by !== user.id) redirect('/')

  return <SpotEditForm spot={spot} />
}
