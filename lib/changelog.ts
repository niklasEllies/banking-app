export interface ChangelogEntry {
  version: string
  title: string
  date: string
  bullets: string[]
}

/**
 * Parses CHANGELOG.md content into structured entries. Format expected:
 *
 *   ## 0.5.0 — Personal Layer
 *   *5. Mai 2026*
 *
 *   - bullet
 *   - bullet
 *
 * Pure function — safe to import in client components.
 */
export function parseChangelog(md: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []
  const sections = md.split(/^## /m).slice(1)

  for (const section of sections) {
    const lines = section.split('\n')
    const headingLine = lines[0].trim()
    const versionMatch = headingLine.match(/^([0-9]+\.[0-9]+\.[0-9]+)\s*[—\-–]\s*(.+)$/)
    if (!versionMatch) continue
    const [, version, title] = versionMatch

    let date = ''
    const bullets: string[] = []
    for (const raw of lines.slice(1)) {
      const line = raw.trimEnd()
      if (!line) continue
      if (!date && /^\*.+\*$/.test(line)) {
        date = line.slice(1, -1).trim()
        continue
      }
      const bulletMatch = line.match(/^-\s+(.+)$/)
      if (bulletMatch) bullets.push(bulletMatch[1])
    }

    entries.push({ version, title, date, bullets })
  }

  return entries
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return 0
}
