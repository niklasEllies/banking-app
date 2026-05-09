# Welle B — UI-Konsolidierung 2: Button, TabBar, SearchInput

*Design-Spec, 8. Mai 2026 — Vorbereitung auf v0.9.2*

## Goal

Drei wiederverwendbare Components extrahieren, die aktuell als Inline-Tailwind-Klassen über ~30 Call-Sites dupliziert sind. Konsequenz: ein konsistentes Look-and-Feel und eine zentrale Stelle für künftige Anpassungen (Dark-Mode-Polish, Focus-Styles, Accessibility-Fixes).

Nachfolger von **Welle A** (v0.9.1: `<PageHeader>`, `<Card>`, `<ListRow>`).

## Architecture

Drei neue Files in `components/ui/`:

- `Button.tsx` — generischer Button mit 4 Variants × 2 Sizes
- `TabBar.tsx` — generischer Tab-Wechsler (underline-Style, light/dark-adaptive)
- `SearchInput.tsx` — Such-Input mit Icon links + optionalem Clear-Button rechts

Alle drei sind **Client Components** (interaktiv). Kein State außerhalb von Standard-React-Patterns. Components sind dumm/kontrolliert — Caller besitzt den State.

Keine neuen Dependencies. Tabler-Icons + Tailwind v4 reichen.

## Component 1: Button

**File:** `components/ui/Button.tsx`

```tsx
type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant   // default 'primary'
  size?: ButtonSize         // default 'md'
  fullWidth?: boolean       // setzt 'w-full'
  loading?: boolean         // disabled + opacity-60 (kein Spinner — nutze Loading-Text)
  Icon?: ComponentType<{ size?: number; stroke?: number; 'aria-hidden'?: boolean }>  // Tabler-Icon, links vor Label
}
```

### Variant-Styles

| Variant | Klassen |
|---------|---------|
| `primary` | `bg-primary text-white hover:bg-primary-dark` |
| `ghost` | `text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200` |
| `outline` | `border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1e231a]` |
| `danger` | `bg-red-600 text-white hover:bg-red-700` |

### Size-Styles

| Size | Klassen |
|------|---------|
| `sm` | `py-2 text-sm` |
| `md` | `py-2.5 text-sm` |

### Common-Klassen (für alle Variants)

`inline-flex items-center justify-center gap-2 rounded-lg px-4 font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#141810]`

`fullWidth` → `w-full`.

### Edge-Cases

- `loading={true}` → setzt `disabled` und Caller zeigt Lade-Text in Children (Pattern bleibt wie bisher: `{pending ? 'Speichern…' : 'Speichern'}`)
- Icon + Label: Icon size 16, default stroke 2, gap-2
- `ghost`-Variant droppt `px-4` (kein Padding-Box-Look — Inline-Text-Look). Wer eine Form-neben-Primary-Cancel will, nimmt **`outline`** — der hat Padding und matched die Höhe von Primary

### Migration-Targets (8 Call-Sites)

| Datei | Änderung |
|-------|----------|
| `app/(auth)/login/page.tsx` | Submit → `<Button variant="primary" size="sm" fullWidth loading={pending}>` |
| `app/(auth)/signup/page.tsx` | Submit → dito |
| `components/AddSpotForm.tsx` | Submit `primary md fullWidth` + Cancel `outline md fullWidth` (aktuell `border border-gray-300` — passt zu outline) |
| `components/SpotEditForm.tsx` | dito (Submit + outline-Cancel) |
| `app/(app)/spots/[id]/edit-photo/EditPhotoForm.tsx` | Submit → `primary md fullWidth` |
| `components/StatsVoteForm.tsx` | Save-Button (Z.185-189) → `<Button variant="primary" size="md" fullWidth>` |
| `components/FriendsClient.tsx` | Cancel-Anfrage → `<Button variant="ghost" size="sm">` (text-only) |

### Bewusst NICHT migriert

- **Stateful Icon-Only-Buttons** (`FavoriteToggle`, `SpotShareButton`, `ThemeToggle`, `SpotActionMenu`, `EmojiPicker`-Header) — eigene Semantik (Toggle-State, Popover-Trigger), passen nicht in die generische API
- **Toggle-Buttons mit `aria-pressed`** in StatsVoteForm (Condition/Shadow/Extras) und Star-Rating-Radios — andere Semantik (Pressed-State, Radio-Group), separate UI-Welle wenn nötig
- **SpotDescriptionFeed Inline-Edit-Form** (Z.107-119) — verwendet `px-3 py-1.5 rounded` (kompakter als unser `sm`), bewusster Inline-Mini-Form-Style. Refactor wäre ein Visual-Downgrade
- **Border-dashed-Add-Description-Button** (SpotDescriptionFeed Z.148-152) — `border-dashed border-primary/40` ist eine eigene "Ghost-Add"-Variante, kein generischer Button

## Component 2: TabBar

**File:** `components/ui/TabBar.tsx`

```tsx
interface TabItem<T extends string> {
  value: T
  label: string
  count?: number  // optional, rendert " (3)" hinter dem Label
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[]
  active: T
  onChange: (value: T) => void
  ariaLabel: string         // required, z.B. "Freunde-Ansicht"
}
```

### Style (nur Underline-Variant)

- Container: `flex border-b border-gray-200 dark:border-[#2a2f24]`, `role="tablist"`, `aria-label`
- Tab: `flex-1 py-2 text-sm font-medium border-b-2 transition-colors -mb-px`
- Active: `text-primary border-primary`
- Inactive: `text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200`

### Accessibility

- Container `role="tablist"` + `aria-label` (Pflichtfeld)
- Buttons `role="tab"` + `aria-selected={active === t.value}` + `type="button"`
- Bewusst **kein** Keyboard-Roving (←/→) — die aktuellen Tabs nutzen es auch nicht; vermeidet Scope-Creep. Tab-Index per Browser-Default.

### Generic-Type

```tsx
<TabBar<'friends' | 'requests' | 'search'>
  tabs={[…]}
  active={tab}
  onChange={setTab}
  ariaLabel="Freunde-Ansicht"
/>
```

Type-Inferenz aus `tabs`-Array funktioniert ohne explizite Generic-Annotation.

### Migration-Targets (2 Call-Sites)

| Datei | Tabs |
|-------|------|
| `components/FriendsClient.tsx` | 3 Tabs: Freunde / Anfragen / Suchen |
| `components/BottomSheet.tsx` | 4 Tabs: Alle / Eigene / Freunde / Favoriten |

`FriendsClient.tabBtnClass` Helper wird ersatzlos gestrichen.

### Bewusst NICHT migriert

- `components/timeline/TimelineScrubber.tsx` — Tabs sind dark-on-map-spezifisch (`bg-[#14180f]/80` over Karte, `bg-primary text-[#14180f]` invertiert active-State). Kein generischer light/dark-Pattern, sondern Map-Overlay-UI analog zu `SpotPopup`/`MapHeader`. Bleibt custom, vermeidet künstlichen `tone="overlay"`-Prop ohne weiteren Consumer.

Pill-Variant ist deshalb in dieser Welle nicht implementiert (YAGNI). Wenn ein zukünftiger Use-Case Pill-Tabs auf einer Light/Dark-Page benötigt, kann TabBar dann um den Variant erweitert werden.

## Component 3: SearchInput

**File:** `components/ui/SearchInput.tsx`

```tsx
interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void  // wenn gesetzt + value !== '' → Clear-Button (X) rechts
}
```

### Style

- Wrapper: `relative w-full`
- Input: `w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e231a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`
- IconSearch: absolute `left-3 top-1/2 -translate-y-1/2 text-gray-400`, size 16, `aria-hidden`
- Clear-Button (wenn `onClear` && `value`): `<button type="button" onClick={onClear} aria-label="Suche zurücksetzen">` mit absolute `right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary` und IconX size 14
- `pr-9` ist permanent reserviert → keine Layout-Shift wenn Clear-Button erscheint

### Behaviour

- Komplett kontrolliert: Caller managed `value`/`onChange`
- `type="search"` intern festgenagelt (browser-native Clear-X versteckt via `[&::-webkit-search-cancel-button]:hidden` — wir liefern unseren eigenen)
- Debounce ist Caller-Problem (FriendsClient hat externe 500ms-Debounce, Admin-Stellen sync)

### Migration-Targets (4 Call-Sites)

| Datei | Notizen |
|-------|---------|
| `components/FriendsClient.tsx` | Externe Debounce-Logik bleibt; SearchInput nur visuell |
| `app/(app)/admin/AdminUsers.tsx` | Sync-Filter |
| `app/(app)/admin/AdminSpots.tsx` | Sync-Filter |
| `app/(app)/admin/moderation/AdminDescriptions.tsx` | Sync-Filter |

## Testing

**Keine neuen Component-Tests** — analog zu Welle A (`PageHeader`/`Card`/`ListRow` haben auch keine). Vitest läuft mit `environment: 'node'`, DOM-Component-Tests würden jsdom + `@testing-library/react` Setup voraussetzen — das ist eine separate Welle.

Coverage kommt über:
1. **TypeScript** — Component-API ist strikt typisiert, Caller-Mismatches werden vom Compiler abgefangen (Discriminated Unions für ListRow-artige Patterns, Generic-Types für TabBar)
2. **Existing tests** — `__tests__/` (actions, lib) müssen weiterhin grün bleiben; Migrations berühren keine getestete Logik
3. **Manueller Smoketest** nach jeder Component-Familie: `npm run dev`, betroffene Routes durchklicken, Visual-Diff prüfen
4. **`npm run build` + `npm run lint`** vor jedem Commit — beides muss clean sein

Wenn künftig Welle (z.B. Form-Components Welle C) testbarer werden soll, kann jsdom + Testing-Library als separates Setup eingeführt werden. Für Welle B nicht im Scope.

## Migration Strategy

1. **Components extrahieren** in dieser Reihenfolge: Button → TabBar → SearchInput. Component + erste Beispiel-Migration in einem Commit (Login/Signup für Button, FriendsClient für TabBar, FriendsClient für SearchInput)
2. **Per Component → restliche Migration** in einem Commit pro Component-Familie (z.B. `refactor(ui): migrate forms to <Button>`, `refactor(ui): migrate BottomSheet tabs to <TabBar>`, `refactor(ui): migrate admin searches to <SearchInput>`)
3. **Cleanup-Commit:** `FriendsClient.tabBtnClass` Helper entfernen (sollte nach Migration unbenutzt sein)
4. **CHANGELOG-Eintrag** v0.9.2 mit user-facing-Bullet (z.B. "🎨 Konsistenteres Look-and-Feel bei Buttons, Tabs, Suche") — bewusst nichts über Component-Namen ("PageHeader extracted"-Stil ist out per AGENTS.md-Rule)
5. **Tag** v0.9.2 nach Merge zu master

Erwarteter Aufwand: ~1-2 Stunden via Subagent-Driven-Development.

## Risk & Rollback

**Risiken:**
- Visual regression durch Klassen-Verschiebung (Mitigation: alle Variants 1:1 aus aktuellem Code abgeleitet, kein Re-Design)
- Type-Errors bei TabBar Generic-Inference (Mitigation: Tests decken konkrete Use-Cases ab)
- BottomSheet-Tabs könnten Pixel-Verschiebung haben falls border-Verhalten subtil anders (Mitigation: visueller Smoketest im Dev-Server)

**Rollback:** Reine Refactoring-Welle, kein Schema-Change. `git revert <merge-commit>` reicht.

## Out of Scope

- **Welle C** (Form-Components, Modal/Dialog, Toast) — bleibt aufgeschoben, zu wenig Wiederholung im Code
- **Spinner-Component** — nutzen weiterhin Loading-Text statt visueller Spinner (Pattern bleibt konsistent zu jetzt)
- **Keyboard-Roving** in TabBar — nicht jetzt
- **`<Input>` / `<Textarea>` / `<Select>`** — separate Welle, anderer Scope
- **Headless-UI / Radix** — keine externe Dep, wir bleiben bei eigenen 50-Zeilen-Components

## Success Criteria

- 15 Call-Sites umgeschrieben (9 Buttons + 2 TabBars + 4 SearchInputs — siehe Tabellen oben)
- Vitest grün (existing tests bleiben grün — keine neuen Component-Tests, analog zu Welle A)
- `npm run build` & `npm run lint` clean
- Manueller Smoketest: Login, AddSpot, Friends-Tabs, BottomSheet-View-Mode, Admin-Search alle weiterhin funktional und visuell ungestört
- TimelineScrubber-Tabs visuell unverändert (nicht migriert)
- v0.9.2 Tag + CHANGELOG-Bullet
