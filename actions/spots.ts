'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SpotType } from '@/lib/spot-types'
import type { SpotVisibility } from '@/lib/spot-visibility'

type FormState = { error: string } | undefined

const VALID_TYPES: SpotType[] = ['bench', 'viewpoint', 'shelter', 'picnic', 'meadow', 'water']
const VALID_VISIBILITIES: SpotVisibility[] = ['public', 'friends', 'private']

async function getLocationName(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=17&accept-language=de`,
      {
        headers: { 'User-Agent': 'Plaetzchen/1.0 (community spot finder)' },
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

export async function createSpot(state: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Nicht eingeloggt' }

  const lat = parseFloat(formData.get('lat') as string)
  const lng = parseFloat(formData.get('lng') as string)

  if (isNaN(lat) || isNaN(lng)) return { error: 'Koordinaten fehlen' }

  const typeRaw = (formData.get('type') as string | null) ?? 'bench'
  if (!VALID_TYPES.includes(typeRaw as SpotType)) {
    return { error: 'Ungültiger Spot-Typ' }
  }
  const type = typeRaw as SpotType

  const visibilityRaw = (formData.get('visibility') as string | null) ?? 'public'
  if (!VALID_VISIBILITIES.includes(visibilityRaw as SpotVisibility)) {
    return { error: 'Ungültige Sichtbarkeit' }
  }
  const visibility = visibilityRaw as SpotVisibility

  const nameRaw = formData.get('name') as string
  const name = nameRaw?.trim() || await getLocationName(lat, lng)

  const { data: spot, error } = await supabase
    .from('spots')
    .insert({ lat, lng, name, type, visibility, created_by: user.id })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const photoFile = formData.get('photo') as File
  if (photoFile && photoFile.size > 0) {
    const photoResult = await uploadSpotPhoto(spot.id, formData)
    if (photoResult.error) {
      revalidatePath('/')
      redirect(`/spots/${spot.id}/edit-photo`)
    }
  }

  revalidatePath('/')
  redirect('/')
}

export async function deleteSpot(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Nicht eingeloggt' }

  const { data: spot, error: spotError } = await supabase
    .from('spots')
    .select('created_by')
    .eq('id', id)
    .maybeSingle()

  if (spotError) return { error: 'Plätzchen konnte nicht geprüft werden' }
  if (!spot || spot.created_by !== user.id) return { error: 'Keine Berechtigung' }

  const { error } = await supabase.from('spots').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/')
  return {}
}

export async function updateSpot(
  spotId: string,
  fields: { name: string | null; type: SpotType; visibility: SpotVisibility },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  if (!VALID_TYPES.includes(fields.type)) {
    return { error: 'Ungültiger Spot-Typ' }
  }
  if (!VALID_VISIBILITIES.includes(fields.visibility)) {
    return { error: 'Ungültige Sichtbarkeit' }
  }

  const { data: spot, error: spotError } = await supabase
    .from('spots')
    .select('created_by')
    .eq('id', spotId)
    .maybeSingle()

  if (spotError) return { error: 'Spot konnte nicht geprüft werden' }
  if (!spot) return { error: 'Spot nicht gefunden' }
  if (spot.created_by !== user.id) return { error: 'Keine Berechtigung' }

  const cleanedName = fields.name?.trim() || null
  const { error } = await supabase
    .from('spots')
    .update({ name: cleanedName, type: fields.type, visibility: fields.visibility })
    .eq('id', spotId)

  if (error) return { error: error.message }

  revalidatePath('/')
  return {}
}

export async function uploadSpotPhoto(
  spotId: string,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { data: spot, error: spotError } = await supabase
    .from('spots')
    .select('created_by')
    .eq('id', spotId)
    .maybeSingle()
  if (spotError) return { error: 'Plätzchen konnte nicht geprüft werden' }
  if (!spot || spot.created_by !== user.id) return { error: 'Keine Berechtigung' }

  const file = formData.get('photo') as File
  if (!file || file.size === 0) return { error: 'Kein Foto ausgewählt' }
  if (file.size > 5 * 1024 * 1024) return { error: 'Foto zu groß (max 5MB)' }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { error: 'Ungültiges Format (nur jpg, png, webp)' }
  }

  const uploadPath = `${spotId}/photo`

  const { error: uploadError } = await supabase.storage
    .from('bench-photos')
    .upload(uploadPath, file, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('bench-photos')
    .getPublicUrl(uploadPath)

  const { error: updateError } = await supabase
    .from('spots')
    .update({ photo_url: publicUrl })
    .eq('id', spotId)

  if (updateError) {
    await supabase.storage.from('bench-photos').remove([uploadPath])
    return { error: updateError.message }
  }

  revalidatePath('/')
  return { url: publicUrl }
}
