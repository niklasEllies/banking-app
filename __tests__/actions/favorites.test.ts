import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listFavoriteSpotIds, addFavorite, removeFavorite } from '@/actions/favorites'
import * as supabaseServer from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server')
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const mockSelect = vi.fn()
const mockSelectEq = vi.fn()
const mockUpsert = vi.fn()
const mockDelete = vi.fn()
const mockDeleteEqUser = vi.fn()
const mockDeleteEqSpot = vi.fn()

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: mockSelect,
    upsert: mockUpsert,
    delete: mockDelete,
  })),
}

beforeEach(() => {
  vi.clearAllMocks()

  // listFavoriteSpotIds chain: from('favorites').select('spot_id').eq('user_id', user.id)
  mockSelectEq.mockResolvedValue({ data: [], error: null })
  mockSelect.mockReturnValue({ eq: mockSelectEq })

  // upsert default: success
  mockUpsert.mockResolvedValue({ error: null })

  // delete chain: from('favorites').delete().eq('user_id', uid).eq('spot_id', sid) -> resolves
  mockDeleteEqSpot.mockResolvedValue({ error: null })
  mockDeleteEqUser.mockReturnValue({ eq: mockDeleteEqSpot })
  mockDelete.mockReturnValue({ eq: mockDeleteEqUser })

  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  vi.mocked(supabaseServer.createClient).mockResolvedValue(
    mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServer.createClient>>,
  )
})

describe('listFavoriteSpotIds', () => {
  it('returns [] when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await listFavoriteSpotIds()
    expect(result).toEqual([])
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('returns the array of spot_ids for the authenticated user', async () => {
    mockSelectEq.mockResolvedValue({
      data: [{ spot_id: 'spot-a' }, { spot_id: 'spot-b' }],
      error: null,
    })
    const result = await listFavoriteSpotIds()
    expect(result).toEqual(['spot-a', 'spot-b'])
    expect(mockSupabase.from).toHaveBeenCalledWith('favorites')
    expect(mockSelect).toHaveBeenCalledWith('spot_id')
    expect(mockSelectEq).toHaveBeenCalledWith('user_id', 'user-1')
  })
})

describe('addFavorite', () => {
  it('rejects unauthenticated users with "Nicht eingeloggt"', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await addFavorite('spot-1')
    expect(result).toEqual({ error: 'Nicht eingeloggt' })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('upserts with onConflict user_id,spot_id and returns {} on success', async () => {
    const result = await addFavorite('spot-1')
    expect(result).toEqual({})
    expect(mockSupabase.from).toHaveBeenCalledWith('favorites')
    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: 'user-1', spot_id: 'spot-1' },
      { onConflict: 'user_id,spot_id' },
    )
  })

  it('returns { error } when supabase upsert returns an error', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'db kaputt' } })
    const result = await addFavorite('spot-1')
    expect(result).toEqual({ error: 'db kaputt' })
  })
})

describe('removeFavorite', () => {
  it('rejects unauthenticated users with "Nicht eingeloggt"', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await removeFavorite('spot-1')
    expect(result).toEqual({ error: 'Nicht eingeloggt' })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('deletes by (user_id, spot_id) and returns {} on success', async () => {
    const result = await removeFavorite('spot-1')
    expect(result).toEqual({})
    expect(mockSupabase.from).toHaveBeenCalledWith('favorites')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockDeleteEqUser).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mockDeleteEqSpot).toHaveBeenCalledWith('spot_id', 'spot-1')
  })
})
