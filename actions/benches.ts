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

  const { data: bench, error } = await supabase
    .from('benches')
    .insert({ lat, lng, name, created_by: user.id })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const photoFile = formData.get('photo') as File
  if (photoFile && photoFile.size > 0) {
    const photoResult = await uploadBenchPhoto(bench.id, formData)
    if (photoResult.error) {
      revalidatePath('/')
      redirect(`/benches/${bench.id}/edit-photo`)
    }
  }

  revalidatePath('/')
  redirect('/')
}

export async function deleteBench(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Nicht eingeloggt' }

  const { data: bench } = await supabase
    .from('benches')
    .select('created_by')
    .eq('id', id)
    .single()

  if (!bench || bench.created_by !== user.id) return { error: 'Keine Berechtigung' }

  const { error } = await supabase.from('benches').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/')
  return {}
}

export async function uploadBenchPhoto(
  benchId: string,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { data: bench } = await supabase
    .from('benches')
    .select('created_by')
    .eq('id', benchId)
    .single()
  if (!bench || bench.created_by !== user.id) return { error: 'Keine Berechtigung' }

  const file = formData.get('photo') as File
  if (!file || file.size === 0) return { error: 'Kein Foto ausgewählt' }
  if (file.size > 5 * 1024 * 1024) return { error: 'Foto zu groß (max 5MB)' }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { error: 'Ungültiges Format (nur jpg, png, webp)' }
  }

  const { error: uploadError } = await supabase.storage
    .from('bench-photos')
    .upload(`${benchId}/photo`, file, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('bench-photos')
    .getPublicUrl(`${benchId}/photo`)

  const { error: updateError } = await supabase
    .from('benches')
    .update({ photo_url: publicUrl })
    .eq('id', benchId)

  if (updateError) return { error: updateError.message }

  revalidatePath('/')
  return { url: publicUrl }
}
