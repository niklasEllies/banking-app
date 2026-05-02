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

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude)
      setLng(pos.coords.longitude)
    })
  }

  return (
    <form action={action} className="space-y-5">
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-1">Position</p>
        <p className="text-sm font-mono text-gray-800">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
        <input type="hidden" name="lat" value={lat} />
        <input type="hidden" name="lng" value={lng} />
        <button
          type="button"
          onClick={useCurrentLocation}
          className="mt-2 text-xs text-green-700 font-medium hover:underline"
        >
          📍 Meinen Standort verwenden
        </button>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name / Bezeichnung{' '}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="z.B. Bank am Teich"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-green-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50"
        >
          {pending ? 'Speichern...' : 'Bank eintragen'}
        </button>
      </div>
    </form>
  )
}
