import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditPhotoForm from './EditPhotoForm'

export default async function EditPhotoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <EditPhotoForm spotId={id} />
}
