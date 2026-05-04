'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface Description {
  id: string
  user_id: string
  username: string | null
  text: string
  created_at: string
  updated_at: string
}

interface DescriptionRow {
  id: string
  user_id: string
  text: string
  created_at: string
  updated_at: string
  profiles: { username: string | null } | { username: string | null }[] | null
}

export async function listDescriptions(spotId: string): Promise<Description[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('spot_descriptions')
    .select('id, user_id, text, created_at, updated_at, profiles(username)')
    .eq('spot_id', spotId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as DescriptionRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles
    return {
      id: row.id,
      user_id: row.user_id,
      username: profile?.username ?? null,
      text: row.text,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  })
}

export async function upsertDescription(
  spotId: string,
  text: string,
): Promise<{ error?: string }> {
  const trimmed = text.trim()
  if (trimmed.length === 0) return { error: 'Tipp darf nicht leer sein' }
  if (trimmed.length > 280) return { error: 'Tipp ist zu lang (max 280 Zeichen)' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase
    .from('spot_descriptions')
    .upsert(
      { spot_id: spotId, user_id: user.id, text: trimmed },
      { onConflict: 'spot_id,user_id' },
    )

  if (error) return { error: error.message }

  revalidatePath('/')
  return {}
}

export async function deleteDescription(spotId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase
    .from('spot_descriptions')
    .delete()
    .eq('spot_id', spotId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/')
  return {}
}
