import { describe, it, expect } from 'vitest'
import { parseChangelog, compareVersions } from '@/lib/changelog'

describe('parseChangelog', () => {
  it('parses a single entry with version, title, date, bullets', () => {
    const md = `# Changelog

## 0.5.0 — Personal Layer
*5. Mai 2026*

- ❤️ Foo
- 📑 Bar
`
    const entries = parseChangelog(md)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toEqual({
      version: '0.5.0',
      title: 'Personal Layer',
      date: '5. Mai 2026',
      bullets: ['❤️ Foo', '📑 Bar'],
    })
  })

  it('parses multiple entries in order they appear', () => {
    const md = `# Changelog

## 0.2.0 — Second
*Mai 2026*

- B

## 0.1.0 — First
*April 2026*

- A
`
    const entries = parseChangelog(md)
    expect(entries.map((e) => e.version)).toEqual(['0.2.0', '0.1.0'])
  })

  it('skips sections that do not start with a SemVer heading', () => {
    const md = `# Changelog

## Notes
*nothing*

- ignored

## 0.1.0 — Real
*April 2026*

- kept
`
    const entries = parseChangelog(md)
    expect(entries.map((e) => e.version)).toEqual(['0.1.0'])
  })

  it('handles em-dash and en-dash in heading separator', () => {
    expect(parseChangelog('## 0.1.0 — A\n*x*\n')[0].title).toBe('A')
    expect(parseChangelog('## 0.1.0 – B\n*x*\n')[0].title).toBe('B')
    expect(parseChangelog('## 0.1.0 - C\n*x*\n')[0].title).toBe('C')
  })
})

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('0.5.0', '0.5.0')).toBe(0)
  })

  it('returns positive when first is newer', () => {
    expect(compareVersions('0.5.0', '0.4.0')).toBeGreaterThan(0)
    expect(compareVersions('0.3.1', '0.3.0')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0', '0.9.9')).toBeGreaterThan(0)
  })

  it('returns negative when first is older', () => {
    expect(compareVersions('0.4.0', '0.5.0')).toBeLessThan(0)
    expect(compareVersions('0.3.0', '0.3.1')).toBeLessThan(0)
  })
})
