'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type FormState = { error: string } | undefined

export async function createBench(state: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Nicht eingeloggt' }

  const lat = parseFloat(formData.get('lat') as string)
  const lng = parseFloat(formData.get('lng') as string)

  if (isNaN(lat) || isNaN(lng)) return { error: 'Koordinaten fehlen' }

  const nameRaw = formData.get('name') as string
  const name = nameRaw?.trim() || null

  const { error } = await supabase.from('benches').insert({
    lat,
    lng,
    name,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  redirect('/')
}
