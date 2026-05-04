import { describe, it, expect, vi, beforeEach } from 'vitest'
import { upsertStats } from '@/actions/stats'
import * as supabaseServer from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server')
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))

const mockUpsert = vi.fn()

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn((table: string) => {
    if (table === 'spot_stats_votes') {
      return { upsert: mockUpsert }
    }
    return {}
  }),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabase as any)
})

describe('upsertStats', () => {
  it('gibt Fehler zurück wenn nicht eingeloggt', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await upsertStats('spot-1', { comfort: 4 })
    expect(result).toEqual({ error: 'Nicht eingeloggt' })
  })

  it('ruft upsert mit korrekten Daten auf', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUpsert.mockResolvedValue({ error: null })

    const result = await upsertStats('spot-1', { comfort: 4, rarity: 3 })
    expect(result).toEqual({})
    expect(mockUpsert).toHaveBeenCalledWith(
      { spot_id: 'spot-1', user_id: 'user-1', comfort: 4, rarity: 3 },
      { onConflict: 'spot_id,user_id' }
    )
  })

  it('gibt DB-Fehler zurück', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUpsert.mockResolvedValue({ error: { message: 'DB error' } })

    const result = await upsertStats('spot-1', { comfort: 4 })
    expect(result).toEqual({ error: 'DB error' })
  })
})
