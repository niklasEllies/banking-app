import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  updateMarkerEmoji,
  updateThemePreference,
  getProfilePreferences,
} from '@/actions/profile'
import * as supabaseServer from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server')
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Update chain: from('profiles').update({...}).eq('id', uid) -> { error }
const mockUpdate = vi.fn()
const mockUpdateEq = vi.fn()

// Select chain: from('profiles').select(...).eq('id', uid).maybeSingle() -> { data, error }
const mockSelect = vi.fn()
const mockSelectEq = vi.fn()
const mockMaybeSingle = vi.fn()

let nextOp: 'update' | 'select' = 'update'

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() =>
    nextOp === 'update'
      ? { update: mockUpdate }
      : { select: mockSelect },
  ),
}

beforeEach(() => {
  vi.clearAllMocks()
  nextOp = 'update'

  mockUpdateEq.mockResolvedValue({ error: null })
  mockUpdate.mockReturnValue({ eq: mockUpdateEq })

  mockMaybeSingle.mockResolvedValue({ data: null, error: null })
  mockSelectEq.mockReturnValue({ maybeSingle: mockMaybeSingle })
  mockSelect.mockReturnValue({ eq: mockSelectEq })

  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

  vi.mocked(supabaseServer.createClient).mockResolvedValue(
    mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServer.createClient>>,
  )
})

describe('updateMarkerEmoji', () => {
  it('rejects unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    expect(await updateMarkerEmoji('🐕')).toEqual({ error: 'Nicht eingeloggt' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('persists emoji', async () => {
    const result = await updateMarkerEmoji('🐕')
    expect(result).toEqual({})
    expect(mockUpdate).toHaveBeenCalledWith({ marker_emoji: '🐕' })
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('coerces empty string to null (default emoji)', async () => {
    await updateMarkerEmoji('')
    expect(mockUpdate).toHaveBeenCalledWith({ marker_emoji: null })
  })

  it('coerces null to null', async () => {
    await updateMarkerEmoji(null)
    expect(mockUpdate).toHaveBeenCalledWith({ marker_emoji: null })
  })

  it('rejects emoji longer than 16 chars', async () => {
    const tooLong = '🧍‍♂️'.repeat(8) // > 16 chars
    const result = await updateMarkerEmoji(tooLong)
    expect(result).toEqual({ error: 'Emoji ungültig' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns error from db', async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: 'db blew up' } })
    const result = await updateMarkerEmoji('🐕')
    expect(result).toEqual({ error: 'db blew up' })
  })
})

describe('updateThemePreference', () => {
  it('rejects invalid theme value', async () => {
    // @ts-expect-error — testing runtime guard
    expect(await updateThemePreference('cyberpunk')).toEqual({ error: 'Theme ungültig' })
  })

  it('rejects unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    expect(await updateThemePreference('dark')).toEqual({ error: 'Nicht eingeloggt' })
  })

  it.each(['light', 'dark', 'system'] as const)('persists %s', async (theme) => {
    const result = await updateThemePreference(theme)
    expect(result).toEqual({})
    expect(mockUpdate).toHaveBeenCalledWith({ theme_preference: theme })
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'user-1')
  })
})

describe('getProfilePreferences', () => {
  beforeEach(() => {
    nextOp = 'select'
  })

  it('returns defaults when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    expect(await getProfilePreferences()).toEqual({ markerEmoji: null, theme: 'system' })
  })

  it('returns defaults when profile row missing', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    expect(await getProfilePreferences()).toEqual({ markerEmoji: null, theme: 'system' })
  })

  it('returns stored values', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { marker_emoji: '🐕', theme_preference: 'dark' },
      error: null,
    })
    expect(await getProfilePreferences()).toEqual({ markerEmoji: '🐕', theme: 'dark' })
  })
})
