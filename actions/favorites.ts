'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function listFavoriteSpotIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('favorites')
    .select('spot_id')
    .eq('user_id', user.id)

  if (error || !data) return []
  return (data as { spot_id: string }[]).map((r) => r.spot_id)
}

export async function addFavorite(spotId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase
    .from('favorites')
    .upsert(
      { user_id: user.id, spot_id: spotId },
      { onConflict: 'user_id,spot_id' },
    )

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/map')
  return {}
}

export async function removeFavorite(spotId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('spot_id', spotId)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/map')
  return {}
}
