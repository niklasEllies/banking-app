'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type FormState = { error: string } | undefined

export async function signUp(state: FormState, formData: FormData): Promise<FormState> {
  const email = (formData.get('email') as string)?.trim()
  const password = (formData.get('password') as string)?.trim()
  const username = (formData.get('username') as string)?.trim()

  if (!email || !password || !username) {
    return { error: 'Email, Passwort und Username sind erforderlich' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })

  if (error) return { error: error.message }

  redirect('/map')
}

export async function login(state: FormState, formData: FormData): Promise<FormState> {
  const email = (formData.get('email') as string)?.trim()
  const password = (formData.get('password') as string)?.trim()

  if (!email || !password) {
    return { error: 'Email und Passwort sind erforderlich' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  redirect('/map')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/map')
}
