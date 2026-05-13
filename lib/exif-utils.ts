// Deep-import the mini bundle (~28kb unminified, ~10kb gzipped) instead of the full bundle (~74kb).
// We only need GPS extraction; HEIC parser is not needed since the app's file-inputs accept
// only image/jpeg, image/png, image/webp.
// @ts-expect-error — exifr does not ship TypeScript declarations for the deep mini entry
import { gps as readGpsRaw } from 'exifr/dist/mini.esm.mjs'

export interface ExifGps {
  lat: number
  lng: number
}

/**
 * Liest GPS-Koordinaten aus EXIF eines Image-Files.
 * Returns null wenn keine validen Koordinaten extrahiert werden können
 * (non-image MIME, fehlende/zeroed GPS-Tags, oder Parser-Fehler).
 */
export async function readExifGps(file: File): Promise<ExifGps | null> {
  if (!file.type.startsWith('image/')) return null
  try {
    const gps = await readGpsRaw(file)
    if (!gps || typeof gps.latitude !== 'number' || typeof gps.longitude !== 'number') {
      return null
    }
    // 0/0 is invalid — likely zeroed or default coords
    if (gps.latitude === 0 && gps.longitude === 0) return null
    return { lat: gps.latitude, lng: gps.longitude }
  } catch {
    return null
  }
}
