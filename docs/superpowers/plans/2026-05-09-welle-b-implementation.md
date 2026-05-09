# Welle B (UI-Konsolidierung 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drei UI-Components (`<Button>`, `<TabBar>`, `<SearchInput>`) in `components/ui/` extrahieren und 15 Call-Sites migrieren — Nachfolger von Welle A (PageHeader/Card/ListRow).

**Architecture:** Components sind dumm und kontrolliert (Caller besitzt State). Keine neuen Dependencies. TabBar ist generisch in `<T extends string>`. Migration läuft component-by-component: zuerst Component + ein Beispiel-Consumer in einem Commit, dann restliche Migrations in einem zweiten Commit pro Familie.

**Tech Stack:** Next.js 16.2.4, React 19.2, Tailwind v4, TypeScript, `@tabler/icons-react` 3.42, Vitest 4 (nur existing tests — keine neuen Component-Tests, analog zu Welle A).

**Spec:** [docs/superpowers/specs/2026-05-08-welle-b-design.md](../specs/2026-05-08-welle-b-design.md)

---

## Pre-flight

### Worktree

- [ ] **Step 1: Use `superpowers:using-git-worktrees` skill**

Erstellt isolierten Worktree für Branch `feature/phase9.2-welle-b`. Skill setzt das Setup auf, prüft `.gitignore`, lädt deps, und verifiziert clean baseline.

- [ ] **Step 2: Baseline-Tests verifizieren**

Run: `npm test`
Expected: alle existing tests grün (sollte keine neuen Failures geben — wir haben Component noch nicht angefasst)

- [ ] **Step 3: Build verifizieren**

Run: `npm run build`
Expected: Build succeeds

---

## Task 1: `<Button>` Component + erste Migration (Login/Signup)

**Files:**
- Create: `components/ui/Button.tsx`
- Modify: `app/(auth)/login/page.tsx:43-49`
- Modify: `app/(auth)/signup/page.tsx:56-62`

- [ ] **Step 1: Create `components/ui/Button.tsx`**

```tsx
import type { ButtonHTMLAttributes, ComponentType } from 'react'
import type { IconProps } from '@tabler/icons-react'

export type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger'
export type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  Icon?: ComponentType<IconProps>
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  ghost: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
  outline:
    'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1e231a]',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'py-2 text-sm',
  md: 'py-2.5 text-sm',
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#141810]'

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  Icon,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  // ghost = pure text-link look, no padding-x or background box
  const padX = variant === 'ghost' ? '' : 'px-4'
  const width = fullWidth ? 'w-full' : ''
  const cls = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${padX} ${width} ${className}`.trim()

  return (
    <button {...rest} disabled={disabled || loading} className={cls}>
      {Icon && <Icon size={16} stroke={2} aria-hidden />}
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Lint + build clean**

Run: `npm run lint && npm run build`
Expected: PASS

- [ ] **Step 3: Migrate `app/(auth)/login/page.tsx`**

Replace lines 43-49:

```tsx
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#141810]"
          >
            {pending ? 'Einloggen...' : 'Einloggen'}
          </button>
```

with:

```tsx
          <Button type="submit" variant="primary" size="sm" fullWidth loading={pending}>
            {pending ? 'Einloggen...' : 'Einloggen'}
          </Button>
```

Add at top of file (after existing `useActionState` line):

```tsx
import Button from '@/components/ui/Button'
```

- [ ] **Step 4: Migrate `app/(auth)/signup/page.tsx`**

Replace lines 56-62:

```tsx
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#141810]"
          >
            {pending ? 'Registrieren...' : 'Konto erstellen'}
          </button>
```

with:

```tsx
          <Button type="submit" variant="primary" size="sm" fullWidth loading={pending}>
            {pending ? 'Registrieren...' : 'Konto erstellen'}
          </Button>
```

Add import:

```tsx
import Button from '@/components/ui/Button'
```

- [ ] **Step 5: Lint + build clean**

Run: `npm run lint && npm run build`
Expected: PASS

- [ ] **Step 6: Tests grün**

Run: `npm test`
Expected: existing tests pass (kein direkter Bezug zu Login/Signup)

- [ ] **Step 7: Manueller Smoketest**

Run: `npm run dev`
Open: http://localhost:3000/login und http://localhost:3000/signup
Verify:
- Buttons rendern visuell identisch (gleiche Höhe, Farbe, Hover-State)
- Disabled-State während pending wirkt unverändert
- Focus-Ring (Tab-Navigation) funktioniert
- Dark-Mode (System-Theme oder via `/profil`-Toggle) konsistent

- [ ] **Step 8: Commit**

```powershell
git add components/ui/Button.tsx app/(auth)/login/page.tsx app/(auth)/signup/page.tsx
git commit -m "feat(ui): <Button> component + migrate auth submits

4 variants (primary/ghost/outline/danger) x 2 sizes (sm/md), polymorphic
fullWidth, loading state. Auth-Pages als erste Consumer migriert.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Restliche Button-Migrations (Forms)

**Files:**
- Modify: `components/AddSpotForm.tsx:119-134`
- Modify: `components/SpotEditForm.tsx:72-87`
- Modify: `app/(app)/spots/[id]/edit-photo/EditPhotoForm.tsx:84-90`
- Modify: `components/StatsVoteForm.tsx:185-191`
- Modify: `components/FriendsClient.tsx:299-306`

- [ ] **Step 1: Migrate `components/AddSpotForm.tsx`**

Replace lines 119-134:

```tsx
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
          disabled={pending}
          className="flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
        >
          {pending ? 'Speichern...' : 'Plätzchen eintragen'}
        </button>
      </div>
```

with:

```tsx
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
        >
          Abbrechen
        </Button>
        <Button type="submit" variant="primary" loading={pending} className="flex-1">
          {pending ? 'Speichern...' : 'Plätzchen eintragen'}
        </Button>
      </div>
```

Add import at top:

```tsx
import Button from '@/components/ui/Button'
```

> Note: `flex-1` via `className` weil zwei nebeneinander liegen — nicht `fullWidth`, das wäre `w-full`.

- [ ] **Step 2: Migrate `components/SpotEditForm.tsx`**

Replace lines 72-87:

```tsx
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
```

with:

```tsx
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button type="submit" variant="primary" loading={isPending} className="flex-1">
              {isPending ? 'Speichern…' : 'Änderungen speichern'}
            </Button>
          </div>
```

Add import:

```tsx
import Button from '@/components/ui/Button'
```

- [ ] **Step 3: Migrate `app/(app)/spots/[id]/edit-photo/EditPhotoForm.tsx`**

Replace lines 84-90:

```tsx
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
          >
            {isPending ? 'Hochladen…' : 'Foto speichern'}
          </button>
```

with:

```tsx
          <Button type="submit" variant="primary" fullWidth loading={isPending}>
            {isPending ? 'Hochladen…' : 'Foto speichern'}
          </Button>
```

Add import:

```tsx
import Button from '@/components/ui/Button'
```

- [ ] **Step 4: Migrate `components/StatsVoteForm.tsx`**

Replace lines 185-191:

```tsx
      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-dark disabled:opacity-60 transition-colors"
      >
        {isPending ? 'Speichern…' : 'Bewertung speichern'}
      </button>
```

with:

```tsx
      <Button type="button" variant="primary" fullWidth onClick={handleSave} loading={isPending}>
        {isPending ? 'Speichern…' : 'Bewertung speichern'}
      </Button>
```

Add import:

```tsx
import Button from '@/components/ui/Button'
```

> Note: explizit `type="button"` weil StatsVoteForm in einem Parent-Form liegen könnte und Default-`type="submit"` ungewollte Submits triggert.

- [ ] **Step 5: Migrate `components/FriendsClient.tsx` Cancel-Anfrage button (Z.299-306)**

Replace lines 299-306:

```tsx
                      <button
                        type="button"
                        onClick={() => handleCancel(r.id)}
                        disabled={isPending}
                        className="shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-60"
                      >
                        Anfrage zurückziehen
                      </button>
```

with:

```tsx
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(r.id)}
                        disabled={isPending}
                        className="shrink-0 font-medium"
                      >
                        Anfrage zurückziehen
                      </Button>
```

Add import at top of file (after existing imports):

```tsx
import Button from '@/components/ui/Button'
```

> Note: `font-medium` ist via Base in Button schon dabei — Override nicht nötig. `shrink-0` bleibt für Flex-Layout. Inline-Buttons in den Friend-/Request-Listen ("Annehmen", "Ablehnen", "Entfernen", "Anfrage senden") bleiben **bewusst unmigriert** — sind text-primary inline action-buttons, keine generischen Submits.

- [ ] **Step 6: Lint + build clean**

Run: `npm run lint && npm run build`
Expected: PASS

- [ ] **Step 7: Tests grün**

Run: `npm test`
Expected: existing tests pass (Spot/Friend/Stats actions stay unaffected)

- [ ] **Step 8: Manueller Smoketest**

Run: `npm run dev`
Test paths:
- `/spots/new` (AddSpot) — Submit + Cancel-Buttons rendern, Cancel ist outline (border), Submit ist primary
- `/spots/<any>/edit` (SpotEdit) — gleiche optisch wie AddSpot
- `/spots/<any>/edit-photo` (EditPhoto) — full-width primary Submit
- `/map` → einen Spot wählen → "Bewertung speichern" (StatsVote) — primary full-width
- `/freunde` → outgoing Tab → "Anfrage zurückziehen" — text-only ghost-Button

Verify visual parity zu vorher: gleiche Höhen, Border bei Cancel, Disabled-States.

- [ ] **Step 9: Commit**

```powershell
git add components/AddSpotForm.tsx components/SpotEditForm.tsx app/(app)/spots/[id]/edit-photo/EditPhotoForm.tsx components/StatsVoteForm.tsx components/FriendsClient.tsx
git commit -m "refactor(ui): migrate forms to <Button>

AddSpot/SpotEdit Cancel auf outline, Submits auf primary, EditPhoto +
StatsVote Save full-width primary, FriendsClient Cancel-Anfrage ghost.
Inline text-primary action-buttons in Friend-/Request-Listen bleiben
custom (eigene Semantik).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: `<TabBar>` Component + erste Migration (FriendsClient)

**Files:**
- Create: `components/ui/TabBar.tsx`
- Modify: `components/FriendsClient.tsx:133-179`

- [ ] **Step 1: Create `components/ui/TabBar.tsx`**

```tsx
'use client'

export interface TabItem<T extends string> {
  value: T
  label: string
  count?: number
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[]
  active: T
  onChange: (value: T) => void
  ariaLabel: string
}

export default function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
}: TabBarProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex border-b border-gray-200 dark:border-[#2a2f24]"
    >
      {tabs.map((t) => {
        const isActive = active === t.value
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.value)}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              isActive
                ? 'text-primary border-primary'
                : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
            {typeof t.count === 'number' && ` (${t.count})`}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Lint + build clean**

Run: `npm run lint && npm run build`
Expected: PASS

- [ ] **Step 3: Migrate `components/FriendsClient.tsx` tabs**

Replace lines 133-179:

```tsx
  const tabBtnClass = (active: boolean) =>
    `flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'text-primary border-primary'
        : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'
    }`

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-md mx-auto px-4 py-8">
        <PageHeader
          title="Freunde"
          subtitle="Verwalte deine Freunde und Anfragen."
          backHref="/profil"
          backLabel="Zurück zum Profil"
        />

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 dark:border-[#2a2f24] mb-4">
          <button
            type="button"
            onClick={() => setTab('friends')}
            role="tab"
            aria-selected={tab === 'friends'}
            className={tabBtnClass(tab === 'friends')}
          >
            Freunde ({friends.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('requests')}
            role="tab"
            aria-selected={tab === 'requests'}
            className={tabBtnClass(tab === 'requests')}
          >
            Anfragen ({requestsCount})
          </button>
          <button
            type="button"
            onClick={() => setTab('search')}
            role="tab"
            aria-selected={tab === 'search'}
            className={tabBtnClass(tab === 'search')}
          >
            Suchen
          </button>
        </div>
```

with:

```tsx
  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-md mx-auto px-4 py-8">
        <PageHeader
          title="Freunde"
          subtitle="Verwalte deine Freunde und Anfragen."
          backHref="/profil"
          backLabel="Zurück zum Profil"
        />

        <div className="mb-4">
          <TabBar<TabKey>
            tabs={[
              { value: 'friends', label: 'Freunde', count: friends.length },
              { value: 'requests', label: 'Anfragen', count: requestsCount },
              { value: 'search', label: 'Suchen' },
            ]}
            active={tab}
            onChange={setTab}
            ariaLabel="Freunde-Ansicht"
          />
        </div>
```

Add import (after existing PageHeader import):

```tsx
import TabBar from '@/components/ui/TabBar'
```

> Note: `tabBtnClass` Helper wird komplett gestrichen — wird im Cleanup-Task später nochmal verifiziert.

- [ ] **Step 4: Lint + build clean**

Run: `npm run lint && npm run build`
Expected: PASS — TypeScript inferiert `TabKey` aus `tabs`-Array, explizite Generic-Annotation `<TabKey>` ist optional aber dokumentarisch

- [ ] **Step 5: Tests grün**

Run: `npm test`
Expected: existing friend-action tests pass

- [ ] **Step 6: Manueller Smoketest**

Run: `npm run dev`
Open: http://localhost:3000/freunde
Verify:
- Drei Tabs sichtbar mit Counts ("Freunde (N)", "Anfragen (M)", "Suchen")
- Default-Tab gemäß Logic (`incoming.length > 0 ? 'requests' : 'friends'`)
- Tab-Klick wechselt Inhalt
- Active-Tab hat primary-Underline + primary-Text
- Aria-selected-State korrekt (Tab-Navigation, Screenreader)
- Visuell identisch zu vorher

- [ ] **Step 7: Commit**

```powershell
git add components/ui/TabBar.tsx components/FriendsClient.tsx
git commit -m "feat(ui): <TabBar> component + migrate FriendsClient tabs

Generischer Tab-Wechsler in <T extends string>, underline-Style mit
optional count-Suffix. tabBtnClass Helper in FriendsClient ersatzlos
entfernt.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: TabBar-Migration BottomSheet

**Files:**
- Modify: `components/BottomSheet.tsx:184-204`

- [ ] **Step 1: Migrate `components/BottomSheet.tsx`**

Replace lines 184-204 (the tab-bar section):

```tsx
      {/* Tab bar (list view only) */}
      {!selectedSpotId && (
        <div className="flex border-b border-gray-100 dark:border-[#2a2f24]">
          {(['all', 'mine', 'friends', 'favorites'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleViewModeChange(m)}
              role="tab"
              aria-selected={viewMode === m}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                viewMode === m
                  ? 'text-primary border-primary'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {m === 'all' ? 'Alle' : m === 'mine' ? 'Eigene' : m === 'friends' ? 'Freunde' : 'Favoriten'}
            </button>
          ))}
        </div>
      )}
```

with:

```tsx
      {/* Tab bar (list view only) */}
      {!selectedSpotId && (
        <TabBar<'all' | 'mine' | 'friends' | 'favorites'>
          tabs={[
            { value: 'all', label: 'Alle' },
            { value: 'mine', label: 'Eigene' },
            { value: 'friends', label: 'Freunde' },
            { value: 'favorites', label: 'Favoriten' },
          ]}
          active={viewMode}
          onChange={handleViewModeChange}
          ariaLabel="Plätzchen-Ansicht"
        />
      )}
```

Add import at top of file:

```tsx
import TabBar from '@/components/ui/TabBar'
```

> Note: BottomSheet hat 4 Tabs, nicht 3. Die Border-Color war `border-gray-100 dark:border-[#2a2f24]` — minimal heller in light-mode als unsere TabBar-Default `border-gray-200`. Akzeptable Vereinheitlichung, oder wenn pixelgenau gewünscht, nachträglich `className`-Prop in TabBar hinzufügen — vorerst nicht.

- [ ] **Step 2: Lint + build clean**

Run: `npm run lint && npm run build`
Expected: PASS — `viewMode` und `handleViewModeChange` müssen den Type `'all' | 'mine' | 'friends' | 'favorites'` haben (sind sie schon, via `as const`-Tuple in Original)

- [ ] **Step 3: Tests grün**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Manueller Smoketest**

Run: `npm run dev`
Open: http://localhost:3000/map
Verify:
- BottomSheet öffnet, 4 Tabs sichtbar (Alle/Eigene/Freunde/Favoriten)
- Default-Tab "Alle"
- Tab-Klick wechselt gefilterte Liste
- Sobald ein Spot selected wird: Tab-Bar verschwindet (Bedingung `!selectedSpotId`)
- Visuell konsistent mit FriendsClient-Tabs

- [ ] **Step 5: Commit**

```powershell
git add components/BottomSheet.tsx
git commit -m "refactor(ui): migrate BottomSheet view-mode tabs to <TabBar>

4 Tabs (Alle/Eigene/Freunde/Favoriten) jetzt via generischer TabBar.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: `<SearchInput>` Component + erste Migration (FriendsClient)

**Files:**
- Create: `components/ui/SearchInput.tsx`
- Modify: `components/FriendsClient.tsx:317-330`

- [ ] **Step 1: Create `components/ui/SearchInput.tsx`**

```tsx
'use client'

import type { InputHTMLAttributes } from 'react'
import { IconSearch, IconX } from '@tabler/icons-react'

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** When provided AND value is non-empty, renders a clear (X) button. */
  onClear?: () => void
}

export default function SearchInput({
  onClear,
  value,
  className = '',
  ...rest
}: SearchInputProps) {
  const showClear = onClear !== undefined && typeof value === 'string' && value.length > 0

  return (
    <div className="relative w-full">
      <IconSearch
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        aria-hidden
      />
      <input
        {...rest}
        type="search"
        value={value}
        className={`w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e231a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent [&::-webkit-search-cancel-button]:hidden ${className}`.trim()}
      />
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Suche zurücksetzen"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <IconX size={14} aria-hidden />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Lint + build clean**

Run: `npm run lint && npm run build`
Expected: PASS

- [ ] **Step 3: Migrate `components/FriendsClient.tsx` search-input**

Replace lines 317-330 (search-section input wrapper):

```tsx
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Username suchen… (mind. 1 Zeichen)"
                aria-label="Username suchen"
                className="w-full rounded-lg border border-gray-200 dark:border-[#2a2f24] bg-white dark:bg-[#1e231a] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-primary"
              />
              {searchPending && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">…</span>
              )}
            </div>
```

with:

```tsx
            <div className="relative">
              <SearchInput
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onClear={() => setSearchInput('')}
                placeholder="Username suchen… (mind. 1 Zeichen)"
                aria-label="Username suchen"
              />
              {searchPending && (
                <span className="absolute right-9 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">…</span>
              )}
            </div>
```

Add import at top:

```tsx
import SearchInput from '@/components/ui/SearchInput'
```

> Note: Loading-Indikator (`…`) wandert nach `right-9` damit er neben dem Clear-X (Position `right-2`) Platz hat statt drüber. Das ist eine kleine UX-Verbesserung — zeigt Pending- und Clear-Affordance gleichzeitig.

- [ ] **Step 4: Lint + build clean**

Run: `npm run lint && npm run build`
Expected: PASS

- [ ] **Step 5: Tests grün**

Run: `npm test`
Expected: PASS — Friend-Search-Action-Tests bleiben unbehelligt (nur visuelle Hülle ändert sich)

- [ ] **Step 6: Manueller Smoketest**

Run: `npm run dev`
Open: http://localhost:3000/freunde → Tab "Suchen"
Verify:
- Search-Icon links, Padding stimmt
- Tippen einer Query (mind. 1 Zeichen) — Debounce nach 300ms triggert Search-Action
- Ergebnisse erscheinen (oder "Keinen User gefunden" bei No-Match)
- **Clear-X erscheint rechts wenn Input nicht leer**
- Klick auf Clear-X leert Input → Empty-State erscheint wieder
- Loading-Pulse `…` erscheint links vom Clear-X während Pending
- Dark-Mode: Border + Background korrekt

- [ ] **Step 7: Commit**

```powershell
git add components/ui/SearchInput.tsx components/FriendsClient.tsx
git commit -m "feat(ui): <SearchInput> component + migrate friend-search

Search-Icon links, optionaler Clear-Button rechts (X), reine visuelle
Hülle. FriendsClient als erster Consumer — externe 300ms-Debounce-Logik
bleibt unverändert.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: SearchInput-Migration Admin-Pages (3 files)

**Files:**
- Modify: `app/(app)/admin/AdminUsers.tsx:30-39`
- Modify: `app/(app)/admin/AdminSpots.tsx:44-53`
- Modify: `app/(app)/admin/moderation/AdminDescriptions.tsx:41-50`

- [ ] **Step 1: Migrate `app/(app)/admin/AdminUsers.tsx`**

Replace lines 30-39 (the relative-search wrapper):

```tsx
        <div className="relative flex-1">
          <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Username oder E-Mail suchen…"
            className="w-full rounded-lg border border-gray-200 dark:border-[#2a2f24] bg-white dark:bg-[#1e231a] pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-primary"
          />
        </div>
```

with:

```tsx
        <div className="flex-1">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery('')}
            placeholder="Username oder E-Mail suchen…"
            aria-label="User suchen"
          />
        </div>
```

Update import line — replace `IconSearch` import (it's no longer used directly here):

```tsx
import { IconCheck, IconChevronRight } from '@tabler/icons-react'
import { setAdminRole } from '@/actions/admin'
import EmptyState from '@/components/EmptyState'
import { IconUserOff } from '@tabler/icons-react'
import SearchInput from '@/components/ui/SearchInput'
```

> Note: alte Import-Zeile war `import { IconCheck, IconSearch, IconChevronRight } from '@tabler/icons-react'`. `IconSearch` raus weil unused. Doppelter Import von `@tabler/icons-react` ist OK (existing pattern).

- [ ] **Step 2: Migrate `app/(app)/admin/AdminSpots.tsx`**

Replace lines 44-53:

```tsx
        <div className="relative flex-1 min-w-45">
          <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name oder User…"
            className="w-full rounded-lg border border-gray-200 dark:border-[#2a2f24] bg-white dark:bg-[#1e231a] pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-primary"
          />
        </div>
```

with:

```tsx
        <div className="flex-1 min-w-45">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery('')}
            placeholder="Name oder User…"
            aria-label="Plätzchen suchen"
          />
        </div>
```

Update import — `IconSearch` raus:

```tsx
import { IconTrash, IconMapPinOff } from '@tabler/icons-react'
```

Add SearchInput import:

```tsx
import SearchInput from '@/components/ui/SearchInput'
```

- [ ] **Step 3: Migrate `app/(app)/admin/moderation/AdminDescriptions.tsx`**

Replace lines 41-50:

```tsx
      <div className="relative">
        <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Im Text, User oder Spot-Name suchen…"
          className="w-full rounded-lg border border-gray-200 dark:border-[#2a2f24] bg-white dark:bg-[#1e231a] pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-primary"
        />
      </div>
```

with:

```tsx
      <SearchInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery('')}
        placeholder="Im Text, User oder Spot-Name suchen…"
        aria-label="Tipps suchen"
      />
```

Update import — `IconSearch` raus:

```tsx
import { IconTrash, IconMessage2 } from '@tabler/icons-react'
```

Add SearchInput import:

```tsx
import SearchInput from '@/components/ui/SearchInput'
```

- [ ] **Step 4: Lint + build clean**

Run: `npm run lint && npm run build`
Expected: PASS

- [ ] **Step 5: Tests grün**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Manueller Smoketest** (Admin-only — als Admin-User einloggen)

Run: `npm run dev`
Open paths (admin login required):
- `/admin` → User-Liste sucht via SearchInput → Clear-X funktioniert
- `/admin` → Plätzchen-Liste search → Clear-X functional
- `/admin/moderation` → Tipp-Suche → Clear-X functional

Verify visual parity (gleiche Höhe wie alte Inputs, korrekte Padding, dark-mode).

- [ ] **Step 7: Commit**

```powershell
git add app/(app)/admin/AdminUsers.tsx app/(app)/admin/AdminSpots.tsx app/(app)/admin/moderation/AdminDescriptions.tsx
git commit -m "refactor(ui): migrate admin searches to <SearchInput>

3 Admin-Pages (Users/Spots/Descriptions) nutzen jetzt SearchInput mit
Clear-Button.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Cleanup + Final Smoketest

**Files:**
- Verify: `components/FriendsClient.tsx` (no orphan helpers)
- Verify: no unused imports anywhere

- [ ] **Step 1: Verify `tabBtnClass` is gone**

Run: `npx grep -n 'tabBtnClass' components/FriendsClient.tsx` (or use Grep tool)
Expected: 0 matches — der Helper wurde in Task 3 gestrichen, dieser Schritt ist Sicherheitsnetz.

If matches found: entfernen, dann zurück zu Task 3 ziehen mit Bezug auf Z.133-138.

- [ ] **Step 2: Verify keine orphan IconSearch-Imports**

Run: `npx grep -rn "IconSearch" --include="*.tsx" --include="*.ts" .` (oder Grep-Tool)
Expected: nur Verwendungen IN `components/ui/SearchInput.tsx` und ggf. EmptyState-Action-Slots wo IconSearch als Empty-State-Icon (Z.334 in FriendsClient — das bleibt).

- [ ] **Step 3: Lint + build clean**

Run: `npm run lint && npm run build`
Expected: PASS — keine `unused-vars`-Warnings

- [ ] **Step 4: Full test run**

Run: `npm test`
Expected: ALLE existing Tests grün — wenn nicht, an der Stelle stoppen und reviewen

- [ ] **Step 5: Full smoketest pass**

Run: `npm run dev`

Liste der zu testenden Routes/Features (gehe alle einmal durch):

1. `/login` — Submit-Button
2. `/signup` — Submit-Button
3. `/spots/new` — AddSpot Submit + Cancel
4. `/spots/<existing>/edit` — SpotEdit Submit + Cancel
5. `/spots/<existing>/edit-photo` — EditPhoto Submit
6. `/map` → Spot wählen → "Bewertung speichern" — StatsVote
7. `/freunde` (Tab "Freunde") — Tab-Bar
8. `/freunde` (Tab "Anfragen" → outgoing → "Anfrage zurückziehen") — Ghost-Button
9. `/freunde` (Tab "Suchen") — SearchInput mit Clear-X + Debounced-Search
10. `/map` BottomSheet öffnen — 4-Tab-Bar (Alle/Eigene/Freunde/Favoriten)
11. `/admin` (Admin-Login) — User-Search + Spots-Search
12. `/admin/moderation` — Tipp-Search
13. `/timeline` — TimelineScrubber-Tabs **müssen unverändert aussehen** (sind nicht migriert!)

Visual-Diff-Check: vergleiche zu master via `git stash` falls verfügbar oder Side-by-Side-Browser-Test.

- [ ] **Step 6: No-op commit unnötig** — alle vorherigen Tasks haben sauber committed.

---

## Task 8: CHANGELOG, Docs-Update, Tag

**Files:**
- Modify: `CHANGELOG.md` (Eintrag vorne anhängen)
- Modify: `docs/feature-status.md` (Welle B als done markieren)
- Modify: `docs/agent-handoff.md` ("🔥 Aktuell offen"-Block aktualisieren — Welle B raus, Welle C/Phase 10/etc. bleiben)
- Modify: `AGENTS.md` (Phase-Status-Zeile)
- Modify: `C:\Users\nikla\.claude\projects\c--Users-nikla-projects-banking-app\memory\project_phase_status.md`

- [ ] **Step 1: CHANGELOG.md Eintrag**

Add at the very top of `CHANGELOG.md` (immediately after the `# Changelog` header):

```markdown
## 0.9.2 — UI-Konsistenz
*9. Mai 2026*

- 🎨 Konsistenteres Look-and-Feel bei Buttons und Suchfeldern
- ❎ Clear-Button (X) in allen Suchfeldern — ein Klick leert die Eingabe
```

> Anwendung der CHANGELOG-Cleanliness-Rule (per AGENTS.md): KEINE Bullets über "PageHeader/Card extracted", "<TabBar> component", "FriendsClient migrated" — das sind interne Refactors die der User nicht sieht. User-facing Outcome: konsistenteres Look + neuer Clear-X-Button (echte UX-Verbesserung in Suchfeldern).

- [ ] **Step 2: `docs/feature-status.md` updaten**

Find the section listing completed phases and add:

```markdown
### Phase 9.2 — UI-Konsolidierung Welle B (v0.9.2) — DONE 2026-05-09

- `<Button>` mit 4 Variants (primary/ghost/outline/danger) × 2 Sizes (sm/md), `fullWidth`/`loading`/`Icon` Props
- `<TabBar>` generisch in `<T extends string>`, underline-Style, optionaler `count`-Suffix
- `<SearchInput>` mit IconSearch + optionalem Clear-Button (X)
- 9 Buttons + 2 TabBars + 4 SearchInputs migriert
- TimelineScrubber-Tabs bewusst nicht migriert (dark-on-map-spezifisch)
- `FriendsClient.tabBtnClass` Helper gestrichen
```

(Falls die Datei eine "Aktuell offen" / "Roadmap" Sektion hat: Welle B aus Roadmap entfernen, Welle C bleibt.)

- [ ] **Step 3: `docs/agent-handoff.md` updaten**

Find the "🔥 Aktuell offen" block at the top. Remove the Welle-B bullet (sollte jetzt erledigt sein). Update other items unchanged.

Sample edit (Suche nach dem Bullet "Welle B"):

```markdown
- **Welle B** UI-Konsolidierung 2 (Button/TabBar/SearchInput) — sofort verfügbar
```

remove/replace with status update or just delete the bullet entirely.

- [ ] **Step 4: `AGENTS.md` Phase-Status-Zeile updaten**

Replace the line near top describing Phase 9.1 with Phase 9.2:

Find:
```
**Current state: Phase 9.1 UI-Konsolidierung Welle A complete (v0.9.1).**
```

Replace with:
```
**Current state: Phase 9.2 UI-Konsolidierung Welle B complete (v0.9.2).**
```

Update the description to mention Button/TabBar/SearchInput. Keep the rest of the AGENTS.md unchanged.

- [ ] **Step 5: Memory `project_phase_status.md` updaten**

Read current state:

Run: Use Read tool on `C:\Users\nikla\.claude\projects\c--Users-nikla-projects-banking-app\memory\project_phase_status.md`

Then update:
- Top line: phase 9.2 done as of 2026-05-09, tagged v0.9.2
- "Letzte 3 Major-Phasen" — füge v0.9.2 vorne ein (push älteste raus)
- Komplette Phase-Liste: ", Phase 9.2 (Welle B)" anhängen
- "🔥 Aktuell offene Punkte" Sofort-Verfügbar-Liste: Welle B raus
- "Kritische Patterns" — Button/TabBar/SearchInput-Patterns anfügen analog zu PageHeader/Card/ListRow

- [ ] **Step 6: Lint + build clean (last sanity check)**

Run: `npm run lint && npm run build`
Expected: PASS

- [ ] **Step 7: Commit Docs**

```powershell
git add CHANGELOG.md docs/feature-status.md docs/agent-handoff.md AGENTS.md
git commit -m "docs: Welle B (v0.9.2) — CHANGELOG + handoff + agents

Welle B UI-Konsolidierung complete: <Button>, <TabBar>, <SearchInput>
extrahiert, 15 Call-Sites migriert.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

> Memory-Update ist außerhalb der git-tree, separat geschehen.

- [ ] **Step 8: Final review with code-reviewer**

Use `superpowers:requesting-code-review` skill or dispatch a final reviewer subagent to check all commits in the branch.

- [ ] **Step 9: Use `superpowers:finishing-a-development-branch` skill**

Skill present 4 Optionen — wähle "Push and create a Pull Request" oder "Merge back to master locally" je nach Workflow-Vorlieben des Users.

- [ ] **Step 10: After merge to master — Tag**

```powershell
git checkout master
git pull
git tag -a v0.9.2 -m "v0.9.2 — UI-Konsolidierung Welle B

See CHANGELOG.md for user-facing notes.

Highlights:
- <Button> with 4 variants x 2 sizes
- <TabBar> generic underline component
- <SearchInput> with Clear-X
- 15 call-sites migrated, ~1-2h subagent-driven
"
git push origin v0.9.2
```

Verify with `git tag -l "v*" --sort=-version:refname` — `v0.9.2` muss oben stehen.

---

## Risk & Rollback

**Hauptrisiko:** Visuelle Regression durch Klassen-Verschiebung.
**Mitigation:** Variants 1:1 aus aktuellem Code abgeleitet (siehe Spec). Smoketest nach jeder Migration.

**Falls Rollback nötig:** Reine UI-Refactoring-Welle, keine Schema-Changes.

```bash
git revert <merge-commit>
```

ist ausreichend.

## Out of Scope

- Component-DOM-Tests (jsdom + testing-library) — separate Welle bei Bedarf
- TimelineScrubber-Tabs (dark-on-map specialized)
- Keyboard-Roving in TabBar
- `<Input>` / `<Textarea>` / `<Select>` Components
- Welle C (Form-Components, Modal, Toast)
