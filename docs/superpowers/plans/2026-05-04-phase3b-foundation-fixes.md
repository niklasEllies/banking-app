# Phase 3b — Foundation Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize foundation before Plätzchen rebrand: GPS UX, mobile sheet behavior, photo resize, backend bugs, a11y minimums.

**Architecture:** Seven small focused improvements, mostly independent commits. No major architectural shifts. New files: `lib/image-utils.ts`, `__tests__/image-utils.test.ts`, `components/useSheetSwipe.ts`, `supabase/migrations/005_phase3b_backend_fixes.sql`.

**Tech Stack:** Next.js 16.2, React 19, TypeScript, Tailwind v4, Supabase SSR, vitest 4. Mobile-first.

**Spec:** `docs/superpowers/specs/2026-05-04-phase3b-foundation-fixes-design.md`

---

## File Structure Overview

| File | Purpose | Action |
|---|---|---|
| `supabase/migrations/005_phase3b_backend_fixes.sql` | DELETE policy for stats votes | Create |
| `actions/benches.ts` | Orphan photo cleanup, .maybeSingle | Modify |
| `app/(app)/page.tsx` | .maybeSingle for is_admin | Modify |
| `app/(app)/admin/page.tsx` | .maybeSingle for admin verify | Modify |
| `lib/image-utils.ts` | Client resize (≤1600px, WebP) | Create |
| `__tests__/image-utils.test.ts` | Unit tests for resize | Create |
| `components/AddBenchForm.tsx` | Wire image-utils | Modify |
| `app/(app)/benches/[id]/edit-photo/page.tsx` | Wire image-utils | Modify |
| `components/MapLayout.tsx` | gpsState, banner, hint plumbing | Modify |
| `components/BenchMap.tsx` | onGpsStateChange callback, disabled center | Modify |
| `components/MapHeader.tsx` | Render banner under header | Modify |
| `components/BottomSheet.tsx` | Scroll-vs-swipe split, empty state, sheet hint, hide distance when no GPS, ✏️ wrap | Modify |
| `components/useSheetSwipe.ts` | Extracted touch handler hook | Create |
| `components/BenchDetail.tsx` | Skeleton replaces "Lädt…" | Modify |
| `components/StatsVoteForm.tsx` | Touch targets, ARIA on StarPicker | Modify |
| `components/EmojiPicker.tsx` | ARIA labels | Modify |
| `app/(auth)/login/page.tsx` | Focus rings | Modify |
| `app/(auth)/signup/page.tsx` | Focus rings | Modify |

---

## Task 1: Migration 005 — DELETE Policy for bench_stats_votes

**Files:**
- Create: `supabase/migrations/005_phase3b_backend_fixes.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Phase 3b: Add missing DELETE policy for bench_stats_votes
-- Users could not previously delete their own votes.

CREATE POLICY "Users can delete own votes"
  ON bench_stats_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: Apply via Supabase MCP**

Use the `mcp__plugin_supabase_supabase__apply_migration` tool with name `phase3b_delete_votes_policy` and the SQL above.

- [ ] **Step 3: Verify policy is active**

Use `mcp__plugin_supabase_supabase__execute_sql` to run:
```sql
SELECT polname, polcmd FROM pg_policy
WHERE polrelid = 'bench_stats_votes'::regclass;
```
Expected: row with `polname = 'Users can delete own votes'` and `polcmd = 'd'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/005_phase3b_backend_fixes.sql
git commit -m "feat(db): add DELETE policy for bench_stats_votes (migration 005)"
```

---

## Task 2: Replace .single() with .maybeSingle() — Defensive Null Handling

**Files:**
- Modify: `actions/benches.ts` (around lines 76, 100)
- Modify: `app/(app)/page.tsx` (around line 20 — profile is_admin lookup)
- Modify: `app/(app)/admin/page.tsx` (around line 17 — admin verification)

- [ ] **Step 1: Audit current `.single()` usages**

Run: `rg "\.single\(\)" --type ts -n` from project root.
Expected: see 4-5 matches in the files above. Note line numbers.

- [ ] **Step 2: Replace `.single()` → `.maybeSingle()` in `actions/benches.ts:76` (uploadBenchPhoto ownership check)**

Find:
```ts
const { data: bench } = await supabase
  .from('benches')
  .select('created_by')
  .eq('id', benchId)
  .single()

if (!bench) return { error: 'Bench not found' }
if (bench.created_by !== user.id) return { error: 'Not authorized' }
```

Replace with:
```ts
const { data: bench, error: benchError } = await supabase
  .from('benches')
  .select('created_by')
  .eq('id', benchId)
  .maybeSingle()

if (benchError) return { error: 'Failed to verify bench' }
if (!bench) return { error: 'Bench not found' }
if (bench.created_by !== user.id) return { error: 'Not authorized' }
```

- [ ] **Step 3: Replace `.single()` → `.maybeSingle()` in `actions/benches.ts:100` (deleteBench ownership)**

Same pattern as Step 2.

- [ ] **Step 4: Replace in `app/(app)/page.tsx:20`**

Find:
```ts
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', user.id)
  .single()
```

Replace with:
```ts
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', user.id)
  .maybeSingle()
```

(`profile` may be `null` for users without a profile row — existing `profile?.is_admin` access handles that.)

- [ ] **Step 5: Replace in `app/(app)/admin/page.tsx:17`**

Same as Step 4 — change `.single()` to `.maybeSingle()`. Existing `if (!profile?.is_admin) redirect('/')` handles null.

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: 49/49 passing.

- [ ] **Step 7: Commit**

```bash
git add actions/benches.ts app/\(app\)/page.tsx app/\(app\)/admin/page.tsx
git commit -m "fix: use .maybeSingle() with explicit null handling for defensive queries"
```

---

## Task 3: Orphan Photo Cleanup in uploadBenchPhoto

**Files:**
- Modify: `actions/benches.ts` (around lines 110–125 — after upload, before/around `update photo_url`)

- [ ] **Step 1: Read current uploadBenchPhoto implementation**

Look at the path used for upload (the `bench-photos/{benchId}/photo` pattern). Confirm path variable name (likely `uploadPath` or inline `${benchId}/photo`).

- [ ] **Step 2: Wrap update in try/catch with cleanup**

After the storage upload succeeds and the public URL is obtained, change the update to:

```ts
const uploadPath = `${benchId}/photo`

// upload code stays the same...
const { error: uploadError } = await supabase.storage
  .from('bench-photos')
  .upload(uploadPath, file, { upsert: true, contentType: file.type })

if (uploadError) return { error: 'Upload failed' }

const { data: { publicUrl } } = supabase.storage
  .from('bench-photos')
  .getPublicUrl(uploadPath)

const { error: updateError } = await supabase
  .from('benches')
  .update({ photo_url: publicUrl })
  .eq('id', benchId)

if (updateError) {
  // Roll back storage upload to avoid orphaned files
  await supabase.storage.from('bench-photos').remove([uploadPath])
  return { error: 'Failed to update bench record' }
}

revalidatePath('/')
revalidatePath(`/benches/${benchId}/edit-photo`)
return { success: true }
```

- [ ] **Step 3: Verify no regressions**

Run: `npm test`
Expected: 49/49 passing (existing `benches.test.ts` covers happy path; orphan-cleanup branch is exercised manually).

- [ ] **Step 4: Commit**

```bash
git add actions/benches.ts
git commit -m "fix: clean up storage orphan when bench photo_url update fails"
```

---

## Task 4: lib/image-utils.ts — Client-Side Resize

**Files:**
- Create: `lib/image-utils.ts`
- Create: `__tests__/image-utils.test.ts`

- [ ] **Step 1: Write the failing test (TDD)**

Create `__tests__/image-utils.test.ts`:

```ts
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { resizeImage } from '@/lib/image-utils'

// Mock browser APIs that jsdom doesn't provide fully
beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:mock')
  global.URL.revokeObjectURL = vi.fn()
})

function makeFakeImage(width: number, height: number) {
  // Patch the global Image constructor for one test run
  vi.stubGlobal('Image', class {
    width = width
    height = height
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_v: string) { setTimeout(() => this.onload?.(), 0) }
  })
}

function makeFakeCanvasToBlob(blobOrNull: Blob | null) {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    drawImage: vi.fn(),
  })) as never
  HTMLCanvasElement.prototype.toBlob = vi.fn(function (
    this: HTMLCanvasElement,
    cb: BlobCallback,
  ) {
    cb(blobOrNull)
  })
}

describe('resizeImage', () => {
  it('returns the original file when image is ≤1600px on both axes', async () => {
    const file = new File(['x'], 'small.jpg', { type: 'image/jpeg' })
    makeFakeImage(800, 600)
    const result = await resizeImage(file)
    expect(result).toBe(file)
  })

  it('resizes a 3200×2400 image to 1600×1200 WebP', async () => {
    const file = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    makeFakeImage(3200, 2400)
    makeFakeCanvasToBlob(new Blob(['x'], { type: 'image/webp' }))
    const result = await resizeImage(file)
    expect(result).not.toBe(file)
    expect(result.name).toBe('big.webp')
    expect(result.type).toBe('image/webp')
  })

  it('falls back to JPEG when WebP encoding returns null', async () => {
    const file = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    makeFakeImage(3200, 2400)
    let callCount = 0
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
    })) as never
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (
      this: HTMLCanvasElement,
      cb: BlobCallback,
      type?: string,
    ) {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- image-utils`
Expected: FAIL — module `@/lib/image-utils` does not exist.

- [ ] **Step 3: Implement `lib/image-utils.ts`**

```ts
const MAX_EDGE = 1600
const WEBP_QUALITY = 0.8
const JPEG_QUALITY = 0.85

export async function resizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  const img = await loadImage(file)
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
```

- [ ] **Step 4: Run tests**

Run: `npm test -- image-utils`
Expected: 4/4 passing.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: 53/53 passing (49 existing + 4 new).

- [ ] **Step 6: Commit**

```bash
git add lib/image-utils.ts __tests__/image-utils.test.ts
git commit -m "feat: add client-side image resize util (max 1600px, WebP w/ JPEG fallback)"
```

---

## Task 5: Wire image-utils into Upload Forms

**Files:**
- Modify: `components/AddBenchForm.tsx`
- Modify: `app/(app)/benches/[id]/edit-photo/page.tsx`

- [ ] **Step 1: Locate file input handler in AddBenchForm**

Search for `<input type="file"` or where photo file is added to FormData.

- [ ] **Step 2: Wrap file with resize before append**

In the form submit handler (likely the `useActionState` action wrapper or `onSubmit`), find where `formData.append('photo', file)` happens. Insert before:

```ts
import { resizeImage } from '@/lib/image-utils'

// inside submit handler, where file is obtained
const photoFile = formData.get('photo') as File | null
if (photoFile && photoFile.size > 0) {
  const resized = await resizeImage(photoFile)
  formData.set('photo', resized)
}
```

(`set` replaces the existing entry. Use this regardless of resize result — `resizeImage` returns original if no resize needed.)

- [ ] **Step 3: Same wiring in edit-photo page**

In `app/(app)/benches/[id]/edit-photo/page.tsx` find the form submission:

```ts
import { resizeImage } from '@/lib/image-utils'

// in submit handler before action call
const fileInput = e.currentTarget.elements.namedItem('photo') as HTMLInputElement
if (fileInput.files?.[0]) {
  const resized = await resizeImage(fileInput.files[0])
  formData.set('photo', resized)
}
```

- [ ] **Step 4: Verify type checking**

Run: `npm run build`
Expected: clean build, no TS errors.

- [ ] **Step 5: Manual sanity (note for reviewer)**

The actual upload requires a running dev server + real file. Mark this as "manual verification recommended" in the commit message.

- [ ] **Step 6: Commit**

```bash
git add components/AddBenchForm.tsx app/\(app\)/benches/\[id\]/edit-photo/page.tsx
git commit -m "feat: resize uploaded photos client-side before submission"
```

---

## Task 6: gpsState in MapLayout + onGpsStateChange Callback

**Files:**
- Modify: `components/MapLayout.tsx`
- Modify: `components/BenchMap.tsx`

- [ ] **Step 1: Add gpsState to MapLayout**

In `components/MapLayout.tsx`, add state next to `userPosition`:

```ts
const [gpsState, setGpsState] = useState<'unknown' | 'available' | 'denied' | 'unavailable'>('unknown')

const handleGpsStateChange = (state: 'unknown' | 'available' | 'denied' | 'unavailable') => {
  setGpsState(state)
}
```

Pass to BenchMapClient: `onGpsStateChange={handleGpsStateChange}` AND `gpsState={gpsState}` (latter is needed to disable center button).

Pass to BottomSheet: `gpsState={gpsState}` (used in Tasks 8 to hide distances).

- [ ] **Step 2: Plumb through BenchMapClient**

In `components/BenchMapClient.tsx`, accept new props and pass through.

- [ ] **Step 3: Add detection in BenchMap LocationController**

In `components/BenchMap.tsx`, the `LocationController` component runs the GPS calls. Modify it to:

```ts
// At top
const handlePositionFound = (lat: number, lng: number) => {
  onPositionUpdate?.({ lat, lng })
  onGpsStateChange?.('available')
}

const handleGpsError = (err: GeolocationPositionError) => {
  if (err.code === err.PERMISSION_DENIED) onGpsStateChange?.('denied')
  else onGpsStateChange?.('unavailable')
}

// Where Phase-1 getCurrentPosition is called:
if (typeof navigator.geolocation === 'undefined') {
  onGpsStateChange?.('unavailable')
  return
}

navigator.geolocation.getCurrentPosition(
  (pos) => handlePositionFound(pos.coords.latitude, pos.coords.longitude),
  handleGpsError,
  { enableHighAccuracy: false, timeout: 5000 },
)
```

Add `onGpsStateChange?: (state: 'unknown' | 'available' | 'denied' | 'unavailable') => void` to `BenchMapProps`.

- [ ] **Step 4: Disable center (📍) button when not available**

In `BenchMap.tsx`, find the center FAB. Add:

```tsx
<button
  onClick={handleCenter}
  disabled={gpsState !== 'available'}
  aria-label={gpsState === 'available' ? 'Auf meinen Standort zentrieren' : 'Standort nicht verfügbar'}
  className={`... ${gpsState !== 'available' ? 'opacity-40 cursor-not-allowed' : ''}`}
>
  📍
</button>
```

Add `gpsState` to `BenchMapProps`.

- [ ] **Step 5: Run tests + build**

Run: `npm test && npm run build`
Expected: 53/53 tests, clean build.

- [ ] **Step 6: Commit**

```bash
git add components/MapLayout.tsx components/BenchMapClient.tsx components/BenchMap.tsx
git commit -m "feat: track GPS state in MapLayout, disable center button when unavailable"
```

---

## Task 7: GPS Warning Banner

**Files:**
- Modify: `components/MapLayout.tsx` (render banner conditionally)
- Modify: `components/MapHeader.tsx` (no changes if banner is sibling, but verify spacing)

- [ ] **Step 1: Add banner state to MapLayout**

```ts
const [bannerDismissed, setBannerDismissed] = useState(() => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('benchmarks-gps-banner-dismissed') === 'true'
})

const handleDismissBanner = () => {
  localStorage.setItem('benchmarks-gps-banner-dismissed', 'true')
  setBannerDismissed(true)
}

const showBanner = !bannerDismissed && (gpsState === 'denied' || gpsState === 'unavailable')
```

- [ ] **Step 2: Render banner JSX**

Place between MapHeader and the map area:

```tsx
{showBanner && (
  <div
    role="status"
    className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-4 py-3 flex items-start gap-3 z-[600]"
  >
    <span aria-hidden="true" className="flex-shrink-0 mt-0.5">⚠️</span>
    <p className="text-sm flex-1">
      Standort nicht verfügbar — Distanz und Zentrieren-Button sind deaktiviert.
      Erlaube den Standort in den Browser-Einstellungen.
    </p>
    <button
      onClick={handleDismissBanner}
      aria-label="Hinweis schließen"
      className="flex-shrink-0 p-2 -m-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40"
    >
      ✕
    </button>
  </div>
)}
```

(z-[600] keeps it above leaflet panes (~400) but below modals if any.)

- [ ] **Step 3: Verify spacing of map under banner**

Banner is in normal flow, the map below should auto-shift. Test in dev that map fills available height.

- [ ] **Step 4: Build + sanity check**

Run: `npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add components/MapLayout.tsx
git commit -m "feat: warn user when GPS is denied/unavailable via dismissible banner"
```

---

## Task 8: Sheet GPS Hint + Hide Per-Row Distances

**Files:**
- Modify: `components/BottomSheet.tsx`

- [ ] **Step 1: Accept gpsState prop**

Add `gpsState: 'unknown' | 'available' | 'denied' | 'unavailable'` to BottomSheet props.

- [ ] **Step 2: Add hint above first list item**

In list-mode JSX, before mapping over `benches`:

```tsx
{benches.length > 0 && gpsState !== 'available' && gpsState !== 'unknown' && (
  <div className="px-5 py-2 text-xs italic text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#2a2f24]">
    📍 Standort aus — Distanzen werden nicht angezeigt
  </div>
)}
```

- [ ] **Step 3: Hide per-row distance when GPS not available**

Find the existing `distanceTo` rendering. Wrap:

```tsx
{userPosition && gpsState === 'available' && (
  <span className="text-xs text-gray-500 dark:text-gray-400">
    {distanceTo(userPosition, { lat: bench.lat, lng: bench.lng })}
  </span>
)}
```

(Previously the check was just `userPosition` — now also gated on `gpsState === 'available'` for consistency.)

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add components/BottomSheet.tsx
git commit -m "feat: surface GPS-off state in bench list, hide per-row distances"
```

---

## Task 9: BottomSheet Scroll-vs-Swipe Fix

**Files:**
- Create: `components/useSheetSwipe.ts`
- Modify: `components/BottomSheet.tsx`

- [ ] **Step 1: Read current touch-handling logic in BottomSheet**

Find the `onTouchStart`, `onTouchMove`, `onTouchEnd` handlers. Note which element they're attached to and the conditions for triggering dismiss.

- [ ] **Step 2: Extract handle-only swipe logic into hook**

Create `components/useSheetSwipe.ts`:

```ts
import { useRef } from 'react'

interface SheetSwipeConfig {
  onDismiss: () => void
  threshold?: number
}

export function useSheetSwipe({ onDismiss, threshold = 60 }: SheetSwipeConfig) {
  const startY = useRef<number | null>(null)
  const startScrollTop = useRef<number>(0)
  const armedFromContent = useRef<boolean>(false)
  const contentEl = useRef<HTMLElement | null>(null)

  // Always-active handlers for the drag handle
  const handleHandleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    armedFromContent.current = false
  }

  const handleHandleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > threshold) {
      onDismiss()
      startY.current = null
    }
  }

  const handleHandleTouchEnd = () => {
    startY.current = null
  }

  // Content-area handlers (only dismiss if scrollTop===0)
  const setContentRef = (el: HTMLElement | null) => {
    contentEl.current = el
  }

  const handleContentTouchStart = (e: React.TouchEvent) => {
    if (!contentEl.current) return
    startScrollTop.current = contentEl.current.scrollTop
    if (startScrollTop.current === 0) {
      startY.current = e.touches[0].clientY
      armedFromContent.current = true
    } else {
      startY.current = null
      armedFromContent.current = false
    }
  }

  const handleContentTouchMove = (e: React.TouchEvent) => {
    if (!armedFromContent.current || startY.current === null) return
    if (!contentEl.current) return
    // If user scrolled up since touchstart, abandon dismiss
    if (contentEl.current.scrollTop > 0) {
      startY.current = null
      armedFromContent.current = false
      return
    }
    const dy = e.touches[0].clientY - startY.current
    if (dy > threshold) {
      onDismiss()
      startY.current = null
      armedFromContent.current = false
    }
  }

  const handleContentTouchEnd = () => {
    startY.current = null
    armedFromContent.current = false
  }

  return {
    handleProps: {
      onTouchStart: handleHandleTouchStart,
      onTouchMove: handleHandleTouchMove,
      onTouchEnd: handleHandleTouchEnd,
    },
    contentProps: {
      onTouchStart: handleContentTouchStart,
      onTouchMove: handleContentTouchMove,
      onTouchEnd: handleContentTouchEnd,
      ref: setContentRef,
    },
  }
}
```

- [ ] **Step 3: Integrate hook into BottomSheet**

Replace existing touch handlers. The drag handle div (the visible bar) gets `{...handleProps}`; the scrollable content area gets `{...contentProps}` including the ref.

```tsx
const { handleProps, contentProps } = useSheetSwipe({ onDismiss: handleCollapse })

// Drag handle:
<div className="..." {...handleProps}>
  <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto" />
</div>

// Scrollable content:
<div className="overflow-y-auto" {...contentProps}>
  {/* list or detail */}
</div>
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 5: Tests stay green**

Run: `npm test`
Expected: 53/53.

- [ ] **Step 6: Commit**

```bash
git add components/useSheetSwipe.ts components/BottomSheet.tsx
git commit -m "fix: split BottomSheet swipe-vs-scroll — handle always swipes, content only at top"
```

---

## Task 10: Empty State in BottomSheet

**Files:**
- Modify: `components/BottomSheet.tsx`

- [ ] **Step 1: Locate existing empty branch**

Find `if (benches.length === 0)` or the existing "Noch keine Bänke eingetragen" message.

- [ ] **Step 2: Replace with new empty state**

```tsx
{benches.length === 0 && (
  <div className="py-12 px-6 text-center">
    <div className="text-5xl mb-3">🪑</div>
    <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
      Noch keine Bänke in der Nähe.
    </p>
    <p className="text-sm text-gray-500 dark:text-gray-400">
      Tippe auf <strong className="text-primary">+</strong> unten rechts, um deine erste einzutragen.
    </p>
  </div>
)}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/BottomSheet.tsx
git commit -m "feat: friendlier empty state in bench list with FAB hint"
```

---

## Task 11: BenchDetail Loading Skeleton

**Files:**
- Modify: `components/BenchDetail.tsx`

- [ ] **Step 1: Locate "Lädt…" text**

Find `<span>Lädt…</span>` (likely lines 31–36) or similar loading text.

- [ ] **Step 2: Replace with skeleton**

```tsx
{loading ? (
  <div className="space-y-3 animate-pulse">
    <div className="h-5 w-24 bg-gray-200 dark:bg-[#2a3124] rounded" />
    <div className="grid grid-cols-3 gap-2">
      <div className="h-16 bg-gray-200 dark:bg-[#2a3124] rounded" />
      <div className="h-16 bg-gray-200 dark:bg-[#2a3124] rounded" />
      <div className="h-16 bg-gray-200 dark:bg-[#2a3124] rounded" />
    </div>
    <div className="h-4 w-1/2 bg-gray-200 dark:bg-[#2a3124] rounded" />
  </div>
) : (
  /* existing rendered content */
)}
```

(Adapt variable name `loading` to whatever the current component uses.)

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/BenchDetail.tsx
git commit -m "feat: BenchDetail loading skeleton replaces 'Lädt…' text"
```

---

## Task 12: Touch Targets ≥44px

**Files:**
- Modify: `components/StatsVoteForm.tsx`
- Modify: `components/BottomSheet.tsx` (delete + edit-photo icon-buttons)

- [ ] **Step 1: StatsVoteForm StarPicker**

Find the StarPicker buttons (`px-3 py-1` or similar). Change to:
```tsx
<button
  className="min-w-11 min-h-11 px-3 py-2 ..."
  ...
/>
```

- [ ] **Step 2: StatsVoteForm condition / shadow / extras buttons**

Apply `min-w-11 min-h-11` (or `min-h-11 px-4 py-2.5` if pill style) to all interactive buttons.

- [ ] **Step 3: BottomSheet delete-row button**

Find the row delete icon. Wrap or change:
```tsx
<button
  className="p-3 -m-3 ..."
  aria-label="Bank löschen"
>
  ×
</button>
```

(`-m-3` keeps visual size; padding extends touch area.)

- [ ] **Step 4: BottomSheet edit-photo (✏️) link**

Same pattern: ensure the wrapping `<Link>` or `<button>` has at least `p-3` padding so the touchable area is ≥44×44.

- [ ] **Step 5: Build + visual sanity in dev**

Run: `npm run build` (clean) and `npm run dev` (open, eyeball that buttons aren't visually massive — only their hit-area expanded).

- [ ] **Step 6: Commit**

```bash
git add components/StatsVoteForm.tsx components/BottomSheet.tsx
git commit -m "a11y: bump interactive elements to 44×44 min touch target"
```

---

## Task 13: ARIA Labels for StarPicker + EmojiPicker

**Files:**
- Modify: `components/StatsVoteForm.tsx`
- Modify: `components/EmojiPicker.tsx`

- [ ] **Step 1: StarPicker as radiogroup**

Find the StarPicker subcomponent. Wrap each instance:

```tsx
function StarPicker({ value, onChange, label }: { value: number | null; onChange: (n: number) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} von 5 Sternen`}
          onClick={() => onChange(n)}
          className="..."
        >
          {value && value >= n ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}
```

Add the `label` prop everywhere StarPicker is used (e.g., `label="Komfort-Bewertung"`, `"Aussicht-Bewertung"`, `"Rarität-Bewertung"`).

- [ ] **Step 2: EmojiPicker labels map**

In `components/EmojiPicker.tsx`, define:
```ts
const EMOJI_LABELS: Record<string, string> = {
  '🧍‍♂️': 'Stehende Person',
  '🧍‍♀️': 'Stehende Person (weiblich)',
  '👫': 'Paar',
  '🐕': 'Hund',
  // (extend with whatever emojis the app supports)
}
```

Each option button:
```tsx
<button
  aria-label={EMOJI_LABELS[emoji] ?? emoji}
  ...
>
  {emoji}
</button>
```

- [ ] **Step 3: Build + tests**

Run: `npm run build && npm test`
Expected: clean build, 53/53 tests.

- [ ] **Step 4: Commit**

```bash
git add components/StatsVoteForm.tsx components/EmojiPicker.tsx
git commit -m "a11y: add ARIA labels to StarPicker (radiogroup) and EmojiPicker options"
```

---

## Task 14: Focus Indicators in Auth Forms

**Files:**
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/signup/page.tsx`

- [ ] **Step 1: Add focus rings to login inputs + submit**

In `app/(auth)/login/page.tsx`, on each `<input>` and the submit `<button>`, append the focus classes:

```tsx
className="... focus:ring-2 focus:ring-primary focus:outline-none"
```

(Match the pattern in `components/AddBenchForm.tsx`.)

- [ ] **Step 2: Same for signup**

In `app/(auth)/signup/page.tsx`, all inputs and the submit button.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/\(auth\)/login/page.tsx app/\(auth\)/signup/page.tsx
git commit -m "a11y: visible focus rings on auth form inputs and submit"
```

---

## Final Steps (after all tasks)

- [ ] **Run full test suite**

Run: `npm test`
Expected: 53/53 passing.

- [ ] **Run full build**

Run: `npm run build`
Expected: clean.

- [ ] **Manual QA list (handed to user)**

1. GPS denied: open in incognito, deny location prompt → banner appears, sheet shows "📍 Standort aus" hint, distance hidden, center button disabled.
2. GPS available: banner does not appear, distances visible, center button works.
3. Banner dismiss persists across reload (until permission state changes).
4. Empty DB: list shows new empty state with 🪑 + FAB hint.
5. Mobile (real phone): scroll inside expanded BottomSheet — sheet does NOT close. Pull down from drag handle — sheet closes.
6. Photo upload: pick a 5MB JPG, upload → DevTools network shows ~150KB WebP request.
7. Tab through login form → focus ring visible on each input.
8. VoiceOver/TalkBack on a star button → announces "1 von 5 Sternen, radio button".
9. Migration 005 verified active.

- [ ] **Update docs** (small follow-up, after merge)

After Phase 3b merges to master, update `docs/feature-status.md` to add a new "Phase 3b ✅" section, and update `docs/agent-handoff.md` to point to Phase 4 (Plätzchen) as next.
