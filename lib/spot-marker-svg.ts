import type { SpotType } from '@/lib/spot-types'

/**
 * Tabler-icon path data extracted from @tabler/icons-react/dist/esm/icons/*.mjs.
 * Hardcoded to avoid runtime renderToStaticMarkup overhead for map markers.
 * Keep in sync with the Icon assignments in lib/spot-types.ts.
 *
 * Each path is rendered inside a 24×24 viewBox (Tabler default).
 */
const TYPE_ICON_PATHS: Record<SpotType, readonly string[]> = {
  // IconSofa
  bench: [
    'M4 11a2 2 0 0 1 2 2v1h12v-1a2 2 0 1 1 4 0v5a1 1 0 0 1 -1 1h-18a1 1 0 0 1 -1 -1v-5a2 2 0 0 1 2 -2',
    'M4 11v-3a3 3 0 0 1 3 -3h10a3 3 0 0 1 3 3v3',
    'M12 5v9',
  ],
  // IconMountain
  viewpoint: [
    'M3 20h18l-6.921 -14.612a2.3 2.3 0 0 0 -4.158 0l-6.921 14.612',
    'M7.5 11l2 2.5l2.5 -2.5l2 3l2.5 -2',
  ],
  // IconTent
  shelter: [
    'M11 14l4 6h6l-9 -16l-9 16h6l4 -6',
  ],
  // IconPicnicTable
  picnic: [
    'M16 7l2 9m-10 -9l-2 9m-1 -9h14m2 5h-18',
  ],
  // IconTrees
  meadow: [
    'M16 5l3 3l-2 1l4 4l-3 1l4 4h-9',
    'M15 21l0 -3',
    'M8 13l-2 -2',
    'M8 12l2 -2',
    'M8 21v-13',
    'M5.824 16a3 3 0 0 1 -2.743 -3.69a3 3 0 0 1 .304 -4.833a3 3 0 0 1 4.615 -3.707a3 3 0 0 1 4.614 3.707a3 3 0 0 1 .305 4.833a3 3 0 0 1 -2.919 3.695h-4l-.176 -.005',
  ],
  // IconDroplet
  water: [
    'M7.502 19.423c2.602 2.105 6.395 2.105 8.996 0c2.602 -2.105 3.262 -5.708 1.566 -8.546l-4.89 -7.26c-.42 -.625 -1.287 -.803 -1.936 -.397a1.376 1.376 0 0 0 -.41 .397l-4.893 7.26c-1.695 2.838 -1.035 6.441 1.567 8.546',
  ],
}

const PIN_FILL = '#5e9e3e'
const PIN_STROKE = '#3d6b2c'
const ICON_BG = '#ffffff'
const ICON_STROKE = '#1d2218'

/**
 * Builds a drop-pin SVG with the spot-type icon centered in its head.
 * Returns markup-as-string suitable for Leaflet's L.DivIcon `html` prop.
 *
 * The pin uses a 32×42 viewBox: classic teardrop shape, point-down at (16, 42).
 * The icon paths (24×24 native) are scaled 0.6× and positioned so the icon
 * center lands at (16, 14) — inside the pin's white head circle.
 */
export function buildPinSvg(type: SpotType): string {
  const iconPaths = TYPE_ICON_PATHS[type]
    .map((d) => `<path d="${d}" />`)
    .join('')

  return `<svg viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg" width="36" height="47" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));overflow:visible;">
    <path d="M16 0 C7.2 0 0 7.2 0 16 C0 24 16 42 16 42 C16 42 32 24 32 16 C32 7.2 24.8 0 16 0 Z" fill="${PIN_FILL}" stroke="${PIN_STROKE}" stroke-width="1.5" />
    <circle cx="16" cy="14" r="9.5" fill="${ICON_BG}" />
    <g transform="translate(8.8 6.8) scale(0.6)" fill="none" stroke="${ICON_STROKE}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke">${iconPaths}</g>
  </svg>`
}

/** Marker dimensions for L.DivIcon iconSize / iconAnchor / popupAnchor. */
export const PIN_SIZE: [number, number] = [36, 47]
export const PIN_ANCHOR: [number, number] = [18, 47]
export const PIN_POPUP_ANCHOR: [number, number] = [0, -42]

/**
 * Cluster icon: pin-style head (no drop) with the count number inside.
 * Used when react-leaflet-cluster groups nearby pins together.
 */
export function buildClusterSvg(count: number): string {
  const text = count > 99 ? '99+' : String(count)
  const fontSize = count > 99 ? 11 : count >= 10 ? 13 : 14
  return `<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" width="44" height="44" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));overflow:visible;">
    <circle cx="18" cy="18" r="17" fill="${PIN_FILL}" stroke="${PIN_STROKE}" stroke-width="1.5" />
    <circle cx="18" cy="18" r="13" fill="${ICON_BG}" />
    <text x="18" y="18" text-anchor="middle" dominant-baseline="central" font-family="system-ui, sans-serif" font-weight="700" font-size="${fontSize}" fill="${ICON_STROKE}">${text}</text>
  </svg>`
}
