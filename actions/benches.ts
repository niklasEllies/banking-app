'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type FormState = { error: string } | undefined

async function getLocationName(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=17&accept-language=de`,
      {
        headers: { 'User-Agent': 'BenchMarks/1.0 (community bench finder)' },
        signal: AbortSignal.timeout(5000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const addr = data.address ?? {}
    return (
      addr.park ?? addr.leisure ?? addr.tourism ?? addr.road ??
      addr.footway ?? addr.path ?? addr.suburb ?? addr.neighbourhood ??
      addr.village ?? addr.town ?? addr.city ?? null
    )
  } catch {
    return null
  }
}

export async function createBench(state: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Nicht eingeloggt' }

  const lat = parseFloat(formData.get('lat') as string)
  const lng = parseFloat(formData.get('lng') as string)

  if (isNaN(lat) || isNaN(lng)) return { error: 'Koordinaten fehlen' }

  const nameRaw = formData.get('name') as string
  const name = nameRaw?.trim() || await getLocationName(lat, lng)

  const { error } = await supabase.from('benches').insert({
    lat,
    lng,
    name,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  redirect('/')
}

export async function deleteBench(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase.from('benches').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/')
  return {}
}
