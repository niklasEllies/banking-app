'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { IconCamera } from '@tabler/icons-react'
import { uploadSpotPhoto } from '@/actions/spots'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import { resizeImage } from '@/lib/image-utils'

export default function EditPhotoForm({ spotId }: { spotId: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const photo = formData.get('photo') as File | null
      if (photo && photo.size > 0) {
        const resized = await resizeImage(photo)
        formData.set('photo', resized)
      }
      const result = await uploadSpotPhoto(spotId, formData)
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
          title="Foto hinzufügen"
          backHref="/map"
          backLabel="Zurück zur Karte"
        />

        <form onSubmit={handleSubmit} className="space-y-5">
          {preview ? (
            <img
              src={preview}
              alt="Vorschau"
              className="w-full h-48 object-cover rounded-xl"
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 dark:bg-[#1e231a] rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500">
              <IconCamera size={48} aria-hidden />
            </div>
          )}

          <div>
            <label
              htmlFor="photo"
              className="block text-sm text-gray-800 dark:text-gray-200 font-medium mb-1"
            >
              Foto auswählen
            </label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={handleFileChange}
              className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-dark"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">max 5MB · jpg, png, webp</p>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <Button type="submit" variant="primary" fullWidth loading={isPending}>
            {isPending ? 'Hochladen…' : 'Foto speichern'}
          </Button>
        </form>
      </div>
    </div>
  )
}
