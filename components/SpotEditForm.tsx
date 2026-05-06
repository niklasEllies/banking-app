'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateSpot } from '@/actions/spots'
import PageHeader from '@/components/ui/PageHeader'
import SpotTypePicker from '@/components/SpotTypePicker'
import VisibilityPicker from '@/components/VisibilityPicker'
import type { SpotType } from '@/lib/spot-types'
import type { SpotVisibility } from '@/lib/spot-visibility'

interface SpotEditFormProps {
  spot: { id: string; name: string | null; type: SpotType; visibility: SpotVisibility; created_by: string }
}

export default function SpotEditForm({ spot }: SpotEditFormProps) {
  const router = useRouter()
  const [name, setName] = useState(spot.name ?? '')
  const [type, setType] = useState<SpotType>(spot.type)
  const [visibility, setVisibility] = useState<SpotVisibility>(spot.visibility)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateSpot(spot.id, { name: name || null, type, visibility })
      if (result.error) {
        setError(result.error)
        return
      }
      router.push('/map')
    })
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-sm mx-auto px-4 py-8">
        <PageHeader
          title="Spot bearbeiten"
          backHref="/map"
          backLabel="Zurück zur Karte"
        />

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="block text-sm text-gray-800 dark:text-gray-200 font-medium mb-2">Was ist hier?</p>
            <SpotTypePicker value={type} onChange={setType} />
          </div>

          <div>
            <p className="block text-sm text-gray-800 dark:text-gray-200 font-medium mb-2">Wer kann den Spot sehen?</p>
            <VisibilityPicker value={visibility} onChange={setVisibility} />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm text-gray-800 dark:text-gray-200 font-medium mb-1">
              Name <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-400 dark:border-gray-600 dark:bg-[#1a1f14] dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#262b1f] hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
            >
              {isPending ? 'Speichern…' : 'Änderungen speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
