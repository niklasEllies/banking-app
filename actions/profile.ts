'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ThemePreference = 'light' | 'dark' | 'system'

const VALID_THEMES: readonly ThemePreference[] = ['light', 'dark', 'system'] as const

export async function updateMarkerEmoji(emoji: string | null): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  // Empty string from forms = null (use default emoji)
  const value = emoji && emoji.trim().length > 0 ? emoji.trim() : null

  // Defensive: check schema constraint matches (length 1..16)
  if (value !== null && (value.length < 1 || value.length > 16)) {
    return { error: 'Emoji ungültig' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ marker_emoji: value })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/map')
  revalidatePath('/profil')
  return {}
}

export async function updateThemePreference(theme: ThemePreference): Promise<{ error?: string }> {
  if (!VALID_THEMES.includes(theme)) return { error: 'Theme ungültig' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase
    .from('profiles')
    .update({ theme_preference: theme })
    .eq('id', user.id)

  if (error) return { error: error.message }

  // No revalidatePath — theme is purely client-side rendering, doesn't affect server-rendered data
  return {}
}

export async function getProfilePreferences(): Promise<{ markerEmoji: string | null; theme: ThemePreference }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { markerEmoji: null, theme: 'system' }

  const { data } = await supabase
    .from('profiles')
    .select('marker_emoji, theme_preference')
    .eq('id', user.id)
    .maybeSingle()

  return {
    markerEmoji: data?.marker_emoji ?? null,
    theme: (data?.theme_preference as ThemePreference) ?? 'system',
  }
}
