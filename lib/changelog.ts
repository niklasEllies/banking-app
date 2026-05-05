import fs from 'node:fs/promises'
import path from 'node:path'

export interface ChangelogEntry {
  version: string
  title: string
  date: string
  bullets: string[]
}

/**
 * Reads CHANGELOG.md from the project root and parses it into structured
 * entries. Format expected per entry:
 *
 *   ## 0.5.0 — Personal Layer
 *   *5. Mai 2026*
 *
 *   - bullet
 *   - bullet
 */
export async function loadChangelog(): Promise<ChangelogEntry[]> {
  const md = await fs.readFile(path.join(process.cwd(), 'CHANGELOG.md'), 'utf-8')
  return parseChangelog(md)
}

export function parseChangelog(md: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []
  // Split on section headings; first chunk before any '## ' is the file title.
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
      // Italic date line: *DD. Monat YYYY* or *Monat YYYY*
      if (!date && /^\*.+\*$/.test(line)) {
        date = line.slice(1, -1).trim()
        continue
      }
      // Bullet
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
