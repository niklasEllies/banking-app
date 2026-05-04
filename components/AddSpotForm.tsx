'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSpot } from '@/actions/spots'
import { resizeImage } from '@/lib/image-utils'
import SpotTypePicker from '@/components/SpotTypePicker'
import type { SpotType } from '@/lib/spot-types'

interface AddSpotFormProps {
  initialLat: number
  initialLng: number
}

export default function AddSpotForm({ initialLat, initialLng }: AddSpotFormProps) {
  const router = useRouter()
  const [state, action, pending] = useActionState(createSpot, undefined)
  const [lat, setLat] = useState(initialLat)
  const [lng, setLng] = useState(initialLng)
  const [type, setType] = useState<SpotType>('bench')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
      },
      () => {}
    )
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPhotoPreview(URL.createObjectURL(file))
  }

  const handleAction = async (formData: FormData) => {
    const photo = formData.get('photo') as File | null
    if (photo && photo.size > 0) {
      const resized = await resizeImage(photo)
      formData.set('photo', resized)
    }
    action(formData)
  }

  return (
    <form action={handleAction} className="space-y-5">
      <div className="bg-surface dark:bg-[#1e231a] rounded-xl p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Position</p>
        <p className="text-sm font-mono text-gray-800 dark:text-gray-200">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
        <input type="hidden" name="lat" value={lat} />
        <input type="hidden" name="lng" value={lng} />
        <input type="hidden" name="type" value={type} />
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="mt-2 text-xs text-primary font-medium hover:underline"
        >
          📍 Meinen Standort verwenden
        </button>
      </div>

      <div>
        <p className="block text-sm text-gray-800 dark:text-gray-200 font-medium mb-2">Was ist hier?</p>
        <SpotTypePicker value={type} onChange={setType} />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm text-gray-800 dark:text-gray-200 font-medium mb-1">
          Name / Bezeichnung{' '}
          <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="z.B. Bank am Teich"
          className="w-full border border-gray-400 dark:border-gray-600 dark:bg-[#1a1f14] dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Optional photo */}
      <div>
        <label htmlFor="photo" className="block text-sm text-gray-800 dark:text-gray-200 font-medium mb-1">
          Foto{' '}
          <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
        </label>
        {photoPreview && (
          <img src={photoPreview} alt="Vorschau" className="w-full h-32 object-cover rounded-lg mb-2" />
        )}
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoChange}
          className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-white hover:file:bg-primary-dark"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-surface"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
        >
          {pending ? 'Speichern...' : 'Plätzchen eintragen'}
        </button>
      </div>
    </form>
  )
}
