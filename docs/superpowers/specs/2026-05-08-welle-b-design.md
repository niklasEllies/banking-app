# Welle B — UI-Konsolidierung 2: Button, TabBar, SearchInput

*Design-Spec, 8. Mai 2026 — Vorbereitung auf v0.9.2*

## Goal

Drei wiederverwendbare Components extrahieren, die aktuell als Inline-Tailwind-Klassen über ~30 Call-Sites dupliziert sind. Konsequenz: ein konsistentes Look-and-Feel und eine zentrale Stelle für künftige Anpassungen (Dark-Mode-Polish, Focus-Styles, Accessibility-Fixes).

Nachfolger von **Welle A** (v0.9.1: `<PageHeader>`, `<Card>`, `<ListRow>`).

## Architecture

Drei neue Files in `components/ui/`:

- `Button.tsx` — generischer Button mit 4 Variants × 2 Sizes
- `TabBar.tsx` — generischer Tab-Wechsler mit 2 Variants (underline / pill)
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
type TabBarVariant = 'underline' | 'pill'

interface TabItem<T extends string> {
  value: T
  label: string
  count?: number  // optional, rendert " (3)" hinter dem Label
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[]
  active: T
  onChange: (value: T) => void
  variant?: TabBarVariant   // default 'underline'
  ariaLabel: string         // required, z.B. "Freunde-Ansicht"
}
```

### Variant: `underline` (Page-Level)

- Container: `flex border-b border-gray-200 dark:border-[#2a2f24]`, `role="tablist"`, `aria-label`
- Tab: `flex-1 py-2 text-sm font-medium border-b-2 transition-colors -mb-px`
- Active: `text-primary border-primary`
- Inactive: `text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200`

### Variant: `pill` (Embedded)

- Container: `flex gap-1 bg-gray-100 dark:bg-[#2a3124] rounded-full p-1`, `role="tablist"`, `aria-label`
- Tab: `flex-1 py-1.5 text-xs font-medium rounded-full transition-colors`
- Active: `bg-white dark:bg-[#141810] text-primary shadow-sm`
- Inactive: `text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100`

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

### Migration-Targets (3 Call-Sites)

| Datei | Variant |
|-------|---------|
| `components/FriendsClient.tsx` | `underline` (3 Tabs: Freunde / Anfragen / Suchen) |
| `components/BottomSheet.tsx` | `underline` (3 Tabs: Alle / Eigene / Favoriten) |
| `components/timeline/TimelineScrubber.tsx` | `pill` (3 Tabs: Alle / Eigene / Freunde) |

`FriendsClient.tabBtnClass` Helper wird ersatzlos gestrichen.

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

Vitest unit tests pro Component (`components/ui/Button.test.tsx`, `TabBar.test.tsx`, `SearchInput.test.tsx`):

- **Button:** rendert mit Variant-Klassen, Icon vor Label, `disabled` propagiert, `fullWidth` setzt `w-full`, Click-Handler feuert
- **TabBar:** rendert N Tabs, aktiver Tab hat `aria-selected="true"`, onChange feuert mit korrektem Value, beide Variants haben distinkte Container-Klassen, count rendert als Suffix
- **SearchInput:** rendert IconSearch, Clear-Button erscheint nur wenn `onClear && value`, Clear-Click ruft `onClear`, native input-Props (placeholder, value, disabled) propagieren

Integration: nach jeder Migration manuell mit `npm run dev` smoketesten — Login, AddSpot, Friends-Tabs, Timeline-Scrubber-Tabs, Admin-Search.

## Migration Strategy

1. **Components extrahieren** (Component + Test pro Stück, in dieser Reihenfolge: Button → TabBar → SearchInput) — jede Component bekommt Test-Coverage und einen ersten Beispiel-Migrate vor Commit
2. **Per Component → restliche Migration** in einem Commit pro Component-Familie (z.B. `feat(ui): migrate forms to Button`, `feat(ui): migrate tabs to TabBar`, `feat(ui): migrate searches to SearchInput`)
3. **Cleanup-Commit:** `FriendsClient.tabBtnClass` Helper entfernen
4. **CHANGELOG-Eintrag** v0.9.2 mit user-facing-Bullet (z.B. "🎨 Konsistenteres Look-and-Feel bei Buttons, Tabs, Suche")
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

- 15 Call-Sites umgeschrieben (8 Buttons + 3 TabBars + 4 SearchInputs — siehe Tabellen oben)
- Vitest grün
- `npm run build` & `npm run lint` clean
- Manueller Smoketest: Login, AddSpot, Friends-Tabs, BottomSheet-View-Mode, Timeline-Scrubber-Tabs, Admin-Search alle weiterhin funktional und visuell ungestört
- v0.9.2 Tag + CHANGELOG-Bullet
