const MAX_EDGE = 1600
const WEBP_QUALITY = 0.8
const JPEG_QUALITY = 0.85

/**
 * Resizes an image File so its longest edge is at most 1600px, encoding as
 * WebP (q=0.8) with a JPEG (q=0.85) fallback. Returns the original File
 * unchanged when:
 *  - the file's MIME type does not start with `image/`
 *  - the image's longest edge is already <= 1600px
 *  - canvas/2D context is unavailable, or both encoders fail
 */
export async function resizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  let img: HTMLImageElement
  try {
    img = await loadImage(file)
  } catch {
    return file
  }

  const longestEdge = Math.max(img.width, img.height)
  if (longestEdge <= MAX_EDGE) return file

  const scale = MAX_EDGE / longestEdge
  const targetW = Math.round(img.width * scale)
  const targetH = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(img, 0, 0, targetW, targetH)

  let blob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY)
  let ext = 'webp'
  let mime = 'image/webp'
  if (!blob) {
    blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY)
    ext = 'jpg'
    mime = 'image/jpeg'
  }
  if (!blob) return file

  const baseName = file.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.${ext}`, { type: mime })
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}
