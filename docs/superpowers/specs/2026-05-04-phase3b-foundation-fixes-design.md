# Phase 3b — Foundation Fixes Design Spec

**Date:** 2026-05-04
**Status:** Approved
**Goal:** Stabilize the app foundation before generalizing to Plätzchen (Phase 4): GPS UX, mobile sheet behavior, photo size, backend bugs, accessibility minimums.

## Architecture / Approach

Seven small, focused improvements. No large architectural shifts. Each delivers as its own commit, mostly independent. Order is: backend safety → photo resize → GPS UX → BottomSheet scroll → empty state → loading skeleton → a11y polish.

## 1. GPS-Permission-Warnung

**Trigger:** When `navigator.geolocation.getCurrentPosition` calls fail with `PositionError.PERMISSION_DENIED` or `POSITION_UNAVAILABLE`, OR `navigator.geolocation` is undefined entirely.

**State management:**
- New piece of state in `MapLayout`: `gpsState: 'unknown' | 'available' | 'denied' | 'unavailable'`
- `BenchMap` reports state via callback `onGpsStateChange`.
- Flow: starts `'unknown'` → if Phase-1 GPS resolves → `'available'`; if denied → `'denied'`; if `navigator.geolocation === undefined` → `'unavailable'`.
- `'denied'` and `'unavailable'` both render the warning UI; `'unknown'` and `'available'` do not.

**Banner UI (under MapHeader, dismissible):**
- Background: `bg-amber-50 dark:bg-amber-950/40`. Text: `text-amber-900 dark:text-amber-200`. Border: `border-amber-200 dark:border-amber-800`.
- Icon: ⚠️
- Copy: *"Standort nicht verfügbar — Distanz und Zentrieren-Button sind deaktiviert. Erlaube den Standort in den Browser-Einstellungen."*
- Close button (✕) on right, padding ≥44×44px.
- Persistence: `localStorage` key `benchmarks-gps-banner-dismissed = "true"` after close. Reappears on next session if GPS still failing.

**Single Sheet-Hinweis (replaces per-row distance):**
- ONE line at top of bottom sheet (above first list row): "📍 Standort aus — Distanzen werden nicht angezeigt"
- Smaller text (`text-xs text-gray-500 dark:text-gray-400`), italic.
- Per-row distance badges are hidden globally when `gpsState !== 'available'` (no per-bench inline hint).

**Zentrieren-Button (📍):** disabled (`disabled` attr + `opacity-40`) when `gpsState !== 'available'`. Tooltip: "Standort nicht verfügbar".

## 2. BottomSheet Scroll-vs-Swipe

**Current bug:** Swipe-to-dismiss touchstart/touchmove fires on inner content scrolling, closing the sheet unintentionally when the user scrolls down through detail content.

**Solution (Option C from brainstorming):**
- **Drag-handle area (top ~24px, the visible handle bar):** swipe-to-dismiss always works. Current handle behavior is preserved.
- **Content area (everything below the handle):** swipe-to-dismiss only fires when:
  - `contentScrollEl.scrollTop === 0` at touchstart, AND
  - swipe direction is downward (Δy > Δx and Δy > 8px threshold).

**Implementation:**
- Split touch handlers between handle and content scroll container.
- Handle keeps current logic (always responds to drag-down).
- Content container: at touchstart, capture `scrollTop`. On touchmove, if `scrollTop > 0` → release the gesture (don't preventDefault, let native scroll continue). Only intercept when scrollTop reached 0 AND user keeps pulling down.
- Touch handlers refactored from BottomSheet.tsx into a small custom hook `useSheetSwipe` for clarity.

## 3. Empty State / Onboarding Hint

**Trigger:** `benches.length === 0` in BottomSheet list mode (current code already detects this — replace existing message).

**Design:**
- Centered vertical block with generous padding (`py-12 px-6 text-center`).
- Large 🪑 emoji (`text-5xl mb-3`).
- Headline (`text-base font-semibold mb-1`): "Noch keine Bänke in der Nähe."
- Sub (`text-sm text-gray-500 dark:text-gray-400`): "Tippe auf **+** unten rechts, um deine erste einzutragen." (`+` rendered with `<strong className="text-primary">`)

No arrow indicator pointing to FAB (intentional: text reference is sufficient and less visually busy).

## 4. Photo Resize on Upload

**Approach:** Client-side resize before passing to FormData. Original is never uploaded.

**Algorithm (`lib/image-utils.ts` → `resizeImage(file: File): Promise<File>`):**
1. If file is not an image MIME type → return original (defensive — server still validates).
2. Read via `URL.createObjectURL(file)` → `<img>` to get dimensions.
3. If `Math.max(width, height) <= 1600` → return original (no transcode penalty).
4. Else: compute `scale = 1600 / Math.max(width, height)`, draw to `<canvas>` at scaled dimensions.
5. Encode: try `canvas.toBlob(blob, 'image/webp', 0.80)`.
6. Fallback: if toBlob returns `null` (rare; old browsers without WebP support) → retry `canvas.toBlob(blob, 'image/jpeg', 0.85)`.
7. Wrap blob in new File with original name (extension swapped) + new size; revoke object URL.

**Target size:** 100–250 KB after resize.

**Integration points:**
- `components/AddBenchForm.tsx` — before `formData.append('photo', file)`, replace file with resized version.
- `app/(app)/benches/[id]/edit-photo/page.tsx` — same.

**Test plan (vitest + jsdom):**
- Mock Image with width/height; verify no resize when ≤1600.
- Verify scale math for portrait, landscape, square at >1600.
- Mock toBlob returning null → verify JPG fallback path.
- Verify output File has same `name` base with adjusted extension.

## 5. Backend Critical Fixes

### Migration 005_phase3b_backend_fixes.sql

```sql
-- Allow users to delete their own stats votes (was missing)
CREATE POLICY "Users can delete own votes" ON bench_stats_votes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

(Apply via Supabase MCP after spec approval.)

### Code fixes

**`actions/benches.ts` `uploadBenchPhoto` — orphan cleanup:**
After successful upload, if `update photo_url` fails:
```ts
await supabase.storage.from('bench-photos').remove([uploadPath])
return { error: 'Failed to update bench record' }
```

**`.single()` → `.maybeSingle()` (defensive):**
- `actions/benches.ts:76` (verify ownership in `uploadBenchPhoto`)
- `actions/benches.ts:100` (delete bench)
- `app/(app)/page.tsx:20` (profile lookup for `is_admin`)
- `app/(app)/admin/page.tsx:17` (admin verification)

After conversion, each call site gets explicit `null` handling: return error / redirect / 404 as appropriate.

## 6. Accessibility Minimums

### Touch targets ≥44×44px

- `StatsVoteForm` StarPicker buttons: change `px-3 py-1` → `min-w-11 min-h-11 px-3 py-2`.
- `StatsVoteForm` condition presets / shadow / extras buttons: same minimum sizing.
- `BottomSheet` row delete-icon (×): wrap in `<button className="p-2 -m-2">` so hit-area is 44px even with small icon.
- `BottomSheet` ✏️ edit-photo link: same wrap.

### ARIA labels

**StarPicker (3 instances: comfort, view, rarity):**
```tsx
<div role="radiogroup" aria-label={ariaLabelForMetric}>
  {[1,2,3,4,5].map(n =>
    <button
      role="radio"
      aria-checked={value === n}
      aria-label={`${n} von 5 Sternen`}
      ...
    />
  )}
</div>
```

**EmojiPicker:**
- Map: `🧍‍♂️` → "Stehende Person", `🧍‍♀️` → "Stehende Person (weiblich)", `👫` → "Paar", `🐕` → "Hund".
- Each option button gets `aria-label={mapping[emoji]}`.

### Focus indicators

- `app/(auth)/login/page.tsx` and `app/(auth)/signup/page.tsx`: add `focus:ring-2 focus:ring-primary focus:outline-none` to all `<input>` and submit `<button>`. Match the existing `AddBenchForm` pattern for consistency.

## 7. BenchDetail Loading Skeleton

Replace `<span>Lädt…</span>` (current `BenchDetail.tsx:31-36`) with a Tailwind `animate-pulse` skeleton:

```tsx
<div className="space-y-3 animate-pulse">
  <div className="h-5 w-24 bg-gray-200 dark:bg-[#2a3124] rounded" />
  <div className="grid grid-cols-3 gap-2">
    <div className="h-16 bg-gray-200 dark:bg-[#2a3124] rounded" />
    <div className="h-16 bg-gray-200 dark:bg-[#2a3124] rounded" />
    <div className="h-16 bg-gray-200 dark:bg-[#2a3124] rounded" />
  </div>
  <div className="h-4 w-1/2 bg-gray-200 dark:bg-[#2a3124] rounded" />
</div>
```

Renders identically in light + dark mode (Forest Deep `#2a3124` chip color for dark).

## Out of Scope (deferred)

| Item | Phase |
|---|---|
| Plätzchen rebrand / `spot_type` enum | 4 |
| Modal focus-trap in BottomSheet | 7 |
| Kontrast-Tweaks (Drag-handle, disabled states) | 7 |
| N+1 query in admin/page.tsx | 7 |
| Service-role key build-time validation | 7 |
| BenchMap refactor / Custom Hooks split | 7 |
| Vector icons (per spot type) | 4 (icons follow types) |
| Favorites / List view modes | 5 |
| Friends / Privacy | 6 |

## Testing

- **Unit (vitest):** new tests for `lib/image-utils.ts` resize logic. All 49 existing tests must remain green.
- **Manual (mobile):** GPS-denied flow on real iOS + Android (deny permission, verify banner + sheet hint). Scroll-vs-swipe on iOS Safari and Chrome Android. Upload large 5MB JPG → verify resized output via DevTools network tab.
- **Migration:** apply migration via Supabase MCP, verify DELETE works as authenticated user, verify still blocked for other users' votes.

## Files Touched (preview)

**New:**
- `lib/image-utils.ts`
- `__tests__/image-utils.test.ts`
- `components/SheetSwipe.ts` (custom hook for split touch handling) or inline in BottomSheet
- `supabase/migrations/005_phase3b_backend_fixes.sql`

**Modified:**
- `components/MapLayout.tsx` (gpsState, banner)
- `components/BenchMap.tsx` (onGpsStateChange callback)
- `components/BottomSheet.tsx` (sheet hint, empty state, scroll-vs-swipe, ✏️ wrap)
- `components/BenchDetail.tsx` (skeleton)
- `components/StatsVoteForm.tsx` (touch targets, aria-labels)
- `components/EmojiPicker.tsx` (aria-labels)
- `components/MapHeader.tsx` (banner-aware spacing)
- `actions/benches.ts` (orphan cleanup, .maybeSingle)
- `app/(app)/page.tsx` (.maybeSingle)
- `app/(app)/admin/page.tsx` (.maybeSingle)
- `app/(app)/benches/[id]/edit-photo/page.tsx` (image-utils integration)
- `app/(app)/benches/new/page.tsx` (image-utils integration)
- `app/(auth)/login/page.tsx` (focus-ring)
- `app/(auth)/signup/page.tsx` (focus-ring)

Estimated commits: ~10–12.
