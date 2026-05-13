'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { IconCamera, IconMapPin, IconAlertTriangle } from '@tabler/icons-react'
import Button from '@/components/ui/Button'
import SpotTypePicker from '@/components/SpotTypePicker'
import VisibilityPicker from '@/components/VisibilityPicker'
import PinPickerMapClient from '@/components/PinPickerMapClient'
import { createSpot } from '@/actions/spots'
import { resizeImage } from '@/lib/image-utils'
import { readExifGps } from '@/lib/exif-utils'
import type { SpotType } from '@/lib/spot-types'
import type { SpotVisibility } from '@/lib/spot-visibility'

type ExifSource = 'exif' | 'gps' | 'manual' | null

export default function PhotoFirstForm() {
  const router = useRouter()
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [exifSource, setExifSource] = useState<ExifSource>(null)
  const [type, setType] = useState<SpotType>('bench')
  const [visibility, setVisibility] = useState<SpotVisibility>('public')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Generation counter to guard against race conditions when user re-picks
  // photos rapidly: stale EXIF reads should not overwrite newer state.
  const pickGenRef = useRef(0)

  // Revoke the last blob preview URL when the component unmounts to avoid
  // leaking object URLs (browser keeps them alive until revoked or page unload).
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Bitte ein Bild auswählen')
      return
    }
    setError(null)

    const myGen = ++pickGenRef.current

    // STEP 1: Read EXIF on the ORIGINAL file (before resize would strip it)
    const exif = await readExifGps(file)
    if (pickGenRef.current !== myGen) return  // stale: another photo was picked
    if (exif) {
      setLat(exif.lat)
      setLng(exif.lng)
      setExifSource('exif')
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      // Fallback: try current GPS (one-shot, low accuracy OK)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (pickGenRef.current !== myGen) return  // stale
          setLat(pos.coords.latitude)
          setLng(pos.coords.longitude)
          setExifSource('gps')
        },
        () => {
          if (pickGenRef.current !== myGen) return  // stale
          setExifSource('manual')
        },
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 }
      )
    } else {
      setExifSource('manual')
    }

    // STEP 2: Set preview + file (resize happens at submit)
    setPhoto(file)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!photo || lat === null || lng === null) {
      setError('Foto und Standort sind erforderlich')
      return
    }
    startTransition(async () => {
      try {
        const resized = await resizeImage(photo)
        const fd = new FormData()
        fd.set('photo', resized)
        fd.set('lat', lat.toString())
        fd.set('lng', lng.toString())
        fd.set('type', type)
        fd.set('visibility', visibility)
        fd.set('name', name)
        const result = await createSpot(undefined, fd)
        if (result?.error) {
          setError(result.error)
          return
        }
        router.push('/map')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Speichern')
      }
    })
  }

  const showMap = photo !== null
  const showDetails = showMap && lat !== null && lng !== null

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Photo Slot */}
      {!photo ? (
        <div>
          <label
            htmlFor="photo"
            className="flex w-full h-48 border-2 border-dashed border-primary/40 rounded-xl items-center justify-center text-primary cursor-pointer hover:bg-primary/5 transition-colors"
          >
            <span className="inline-flex flex-col items-center gap-2">
              <IconCamera size={32} stroke={1.5} aria-hidden />
              <span className="text-sm font-medium">Foto wählen</span>
            </span>
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoPick}
            className="sr-only"
          />
          <p className="text-center mt-4">
            <Link href="/spots/new" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:underline">
              Ohne Foto eintragen →
            </Link>
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {preview && (
            <img src={preview} alt="Foto-Vorschau" className="w-24 h-24 rounded-xl object-cover" />
          )}
          <label htmlFor="photo" className="text-sm text-primary font-medium hover:underline cursor-pointer">
            Anderes Foto wählen
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoPick}
            className="sr-only"
          />
        </div>
      )}

      {/* EXIF Banner */}
      {exifSource === 'exif' && (
        <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-lg p-2 text-xs text-primary inline-flex items-center gap-2">
          <IconMapPin size={14} aria-hidden /> Standort aus Foto übernommen
        </div>
      )}
      {(exifSource === 'gps' || exifSource === 'manual') && photo && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-900/50 rounded-lg p-2 text-xs text-yellow-700 dark:text-yellow-300 inline-flex items-center gap-2">
          <IconAlertTriangle size={14} aria-hidden />
          {exifSource === 'gps'
            ? 'Foto enthält keine Ortsangabe — Standort aus deinem GPS gesetzt, kannst du auf der Karte anpassen.'
            : 'Foto enthält keine Ortsangabe — tippe auf die Karte, um den Standort zu setzen.'}
        </div>
      )}

      {/* Pin Picker Map */}
      {showMap && (
        <PinPickerMapClient
          lat={lat}
          lng={lng}
          type={type}
          onPinChange={(newLat, newLng) => {
            setLat(newLat)
            setLng(newLng)
            if (exifSource === 'gps' || exifSource === null) {
              setExifSource('manual')
            }
          }}
        />
      )}

      {/* Details */}
      {showDetails && (
        <>
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
              placeholder="z.B. Bank am Teich"
              className="w-full border border-gray-400 dark:border-[#2a2f24] dark:bg-[#1a1f14] dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showDetails && (
        <Button type="submit" variant="primary" fullWidth loading={isPending}>
          {isPending ? 'Speichern…' : 'Plätzchen eintragen'}
        </Button>
      )}
    </form>
  )
}
