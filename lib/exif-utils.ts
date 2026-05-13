import exifr from 'exifr'

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
    const gps = await exifr.gps(file)
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
