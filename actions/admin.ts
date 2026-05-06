'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-data'

export async function setAdminRole(userId: string, isAdmin: boolean) {
  const ctx = await requireAdmin()
  if (!ctx) return { error: 'Kein Zugriff' }

  // Use admin client when available (still works with user-client too,
  // but admin-client is more reliable across schema changes).
  const client = ctx.admin ?? ctx.supabase
  const { error } = await client
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

  // Admin client bypasses RLS so private/friends-only spots can be removed too.
  const client = ctx.admin ?? ctx.supabase
  const { error } = await client.from('spots').delete().eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath('/map')
  return {}
}

export async function adminDeleteDescription(id: string) {
  const ctx = await requireAdmin()
  if (!ctx) return { error: 'Kein Zugriff' }

  const client = ctx.admin ?? ctx.supabase
  const { error } = await client.from('spot_descriptions').delete().eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return {}
}
