import { describe, it, expect, vi, afterEach } from 'vitest'
import { readExifGps } from '@/lib/exif-utils'
import exifr from 'exifr'

vi.mock('exifr', () => ({
  default: { gps: vi.fn() },
}))

const gpsMock = vi.mocked(exifr.gps)

function makeFile(type: string): File {
  return new File([new Uint8Array([0xff, 0xd8, 0xff])], 'photo.jpg', { type })
}

describe('readExifGps', () => {
  afterEach(() => {
    gpsMock.mockReset()
  })

  it('returns null when file is not an image', async () => {
    const txt = new File(['hi'], 'a.txt', { type: 'text/plain' })
    expect(await readExifGps(txt)).toBeNull()
    expect(gpsMock).not.toHaveBeenCalled()
  })

  it('returns null when exifr returns undefined', async () => {
    gpsMock.mockResolvedValue(undefined)
    expect(await readExifGps(makeFile('image/jpeg'))).toBeNull()
  })

  it('returns null when latitude or longitude is missing', async () => {
    gpsMock.mockResolvedValue({ latitude: 52.5 } as unknown as { latitude: number; longitude: number })
    expect(await readExifGps(makeFile('image/jpeg'))).toBeNull()
  })

  it('returns null when both coords are 0 (likely zeroed)', async () => {
    gpsMock.mockResolvedValue({ latitude: 0, longitude: 0 })
    expect(await readExifGps(makeFile('image/jpeg'))).toBeNull()
  })

  it('returns lat/lng on valid GPS', async () => {
    gpsMock.mockResolvedValue({ latitude: 52.5200, longitude: 13.4050 })
    expect(await readExifGps(makeFile('image/jpeg'))).toEqual({ lat: 52.52, lng: 13.405 })
  })

  it('returns null when exifr throws', async () => {
    gpsMock.mockRejectedValue(new Error('corrupt'))
    expect(await readExifGps(makeFile('image/jpeg'))).toBeNull()
  })

  it('accepts image/png and image/webp', async () => {
    gpsMock.mockResolvedValue({ latitude: 1, longitude: 1 })
    expect(await readExifGps(makeFile('image/png'))).toEqual({ lat: 1, lng: 1 })
    expect(await readExifGps(makeFile('image/webp'))).toEqual({ lat: 1, lng: 1 })
  })
})
