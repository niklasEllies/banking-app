// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { resizeImage } from '@/lib/image-utils'

// Stub URL object-URL helpers (jsdom doesn't fully implement them)
beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:mock')
  global.URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function makeFakeImage(width: number, height: number) {
  // Patch the global Image constructor; src setter triggers async onload
  vi.stubGlobal(
    'Image',
    class {
      width = width
      height = height
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) {
        setTimeout(() => this.onload?.(), 0)
      }
    },
  )
}

function stubCanvasToBlob(
  impl: (
    this: HTMLCanvasElement,
    cb: BlobCallback,
    type?: string,
    quality?: number,
  ) => void,
) {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    drawImage: vi.fn(),
  })) as never
  HTMLCanvasElement.prototype.toBlob = vi.fn(impl) as never
}

describe('resizeImage', () => {
  it('returns the original file when image is <=1600px on both axes', async () => {
    const file = new File(['x'], 'small.jpg', { type: 'image/jpeg' })
    makeFakeImage(800, 600)
    const result = await resizeImage(file)
    expect(result).toBe(file)
  })

  it('resizes a 3200x2400 image to 1600x1200 WebP', async () => {
    const file = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    makeFakeImage(3200, 2400)
    stubCanvasToBlob(function (cb) {
      cb(new Blob(['x'], { type: 'image/webp' }))
    })
    const result = await resizeImage(file)
    expect(result).not.toBe(file)
    expect(result.name).toBe('big.webp')
    expect(result.type).toBe('image/webp')
  })

  it('falls back to JPEG when WebP encoding returns null', async () => {
    const file = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    makeFakeImage(3200, 2400)
    let callCount = 0
    stubCanvasToBlob(function (cb, type) {
      callCount++
      if (type === 'image/webp') cb(null)
      else cb(new Blob(['x'], { type: 'image/jpeg' }))
    })
    const result = await resizeImage(file)
    expect(callCount).toBe(2)
    expect(result.type).toBe('image/jpeg')
    expect(result.name).toBe('big.jpg')
  })

  it('returns original when file is not an image type', async () => {
    const file = new File(['x'], 'data.txt', { type: 'text/plain' })
    const result = await resizeImage(file)
    expect(result).toBe(file)
  })
})
