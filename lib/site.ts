/**
 * Canonical site URL. Reads from NEXT_PUBLIC_SITE_URL (set in Vercel project
 * settings to e.g. https://plaetzchen.app), falls back to the Vercel-injected
 * deploy URL for previews, then localhost for dev.
 */
export const SITE_URL: string = (() => {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }
  return 'http://localhost:3000'
})()

export const SITE_NAME = 'Plätzchen'
export const SITE_DESCRIPTION =
  'Eine Karte für Orte, die nirgendwo stehen. Sammle Bänke, Aussichten, Schutzhütten und Liegewiesen — die Plätze, die Google nicht kennt.'
