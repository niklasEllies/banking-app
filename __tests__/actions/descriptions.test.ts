import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listDescriptions, upsertDescription, deleteDescription } from '@/actions/descriptions'
import * as supabaseServer from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server')
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const mockUpsert = vi.fn()
const mockDelete = vi.fn()
const mockSelect = vi.fn()
const mockEqList = vi.fn()
const mockOrder = vi.fn()
const mockDeleteEqSpot = vi.fn()
const mockDeleteEqUser = vi.fn()

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

  // listDescriptions chain: from().select(...).eq(...).order(...)
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockEqList.mockReturnValue({ order: mockOrder })
  mockSelect.mockReturnValue({ eq: mockEqList })

  // upsert default: success
  mockUpsert.mockResolvedValue({ error: null })

  // delete chain: from().delete().eq(spot_id).eq(user_id) -> resolves
  mockDeleteEqUser.mockResolvedValue({ error: null })
  mockDeleteEqSpot.mockReturnValue({ eq: mockDeleteEqUser })
  mockDelete.mockReturnValue({ eq: mockDeleteEqSpot })

  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServer.createClient>>)
})

describe('listDescriptions', () => {
  it('returns empty array when no descriptions', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    const result = await listDescriptions('spot-1')
    expect(result).toEqual([])
  })

  it('joins username from profiles into top-level field', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'd1',
          user_id: 'u1',
          text: 'hi',
          created_at: '2026-05-04T00:00:00Z',
          updated_at: '2026-05-04T00:00:00Z',
          profiles: { username: 'niklas' },
        },
      ],
      error: null,
    })
    const result = await listDescriptions('spot-1')
    expect(result).toHaveLength(1)
    expect(result[0].username).toBe('niklas')
    expect(result[0].id).toBe('d1')
    expect(result[0].text).toBe('hi')
    // ensure nested profiles object did not leak through
    expect((result[0] as unknown as { profiles?: unknown }).profiles).toBeUndefined()
  })
})

describe('upsertDescription', () => {
  it('rejects empty / whitespace-only text', async () => {
    const result = await upsertDescription('spot-1', '   ')
    expect(result.error).toBeTruthy()
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('rejects text > 280 chars', async () => {
    const result = await upsertDescription('spot-1', 'a'.repeat(281))
    expect(result.error).toBeTruthy()
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated users with "Nicht eingeloggt"', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await upsertDescription('spot-1', 'valid text')
    expect(result).toEqual({ error: 'Nicht eingeloggt' })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('happy path: trims whitespace and upserts with onConflict spot_id,user_id', async () => {
    const result = await upsertDescription('spot-1', '  Schöner Tipp  ')
    expect(result).toEqual({})
    expect(mockSupabase.from).toHaveBeenCalledWith('spot_descriptions')
    expect(mockUpsert).toHaveBeenCalledWith(
      { spot_id: 'spot-1', user_id: 'user-1', text: 'Schöner Tipp' },
      { onConflict: 'spot_id,user_id' }
    )
  })
})

describe('deleteDescription', () => {
  it('rejects unauthenticated users with "Nicht eingeloggt"', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await deleteDescription('spot-1')
    expect(result).toEqual({ error: 'Nicht eingeloggt' })
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
