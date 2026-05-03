'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBench } from '@/actions/benches'

interface AddBenchFormProps {
  initialLat: number
  initialLng: number
}

export default function AddBenchForm({ initialLat, initialLng }: AddBenchFormProps) {
  const router = useRouter()
  const [state, action, pending] = useActionState(createBench, undefined)
  const [lat, setLat] = useState(initialLat)
  const [lng, setLng] = useState(initialLng)

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude)
      setLng(pos.coords.longitude)
    })
  }

  return (
    <form action={action} className="space-y-5">
      <div className="bg-surface dark:bg-[#252720] rounded-xl p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Position</p>
        <p className="text-sm font-mono text-gray-800 dark:text-gray-200">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
        <input type="hidden" name="lat" value={lat} />
        <input type="hidden" name="lng" value={lng} />
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="mt-2 text-xs text-primary font-medium hover:underline"
        >
          📍 Meinen Standort verwenden
        </button>
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
          className="w-full border border-gray-400 dark:border-gray-600 dark:bg-[#1e2019] dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
          {pending ? 'Speichern...' : 'Bank eintragen'}
        </button>
      </div>
    </form>
  )
}
