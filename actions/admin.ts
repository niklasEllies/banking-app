'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  return profile?.is_admin ? { user, supabase } : null
}

export async function setAdminRole(userId: string, isAdmin: boolean) {
  const ctx = await requireAdmin()
  if (!ctx) return { error: 'Kein Zugriff' }

  const { error } = await ctx.supabase
    .from('profiles')
    .update({ is_admin: isAdmin })
    .eq('id', userId)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}

export async function adminDeleteSpot(id: string) {
  const ctx = await requireAdmin()
  if (!ctx) return { error: 'Kein Zugriff' }

  const { error } = await ctx.supabase
    .from('spots')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath('/map')
  return {}
}
