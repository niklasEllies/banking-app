import 'server-only'
import fs from 'node:fs/promises'
import path from 'node:path'
import { parseChangelog, type ChangelogEntry } from '@/lib/changelog'

/**
 * Reads CHANGELOG.md from the project root and parses it. Server-only —
 * uses the Node fs API. Pure parsing logic lives in `lib/changelog.ts`.
 */
export async function loadChangelog(): Promise<ChangelogEntry[]> {
  const md = await fs.readFile(path.join(process.cwd(), 'CHANGELOG.md'), 'utf-8')
  return parseChangelog(md)
}
