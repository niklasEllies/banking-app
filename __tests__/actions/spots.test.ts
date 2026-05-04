import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSpot } from '@/actions/spots'
import * as supabaseServer from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server')
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw { digest: 'NEXT_REDIRECT', url }
  }),
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    insert: mockInsert,
  })),
}

beforeEach(() => {
  vi.clearAllMocks()
  // Setup the chain: insert().select().single()
  mockSingle.mockResolvedValue({ data: { id: 'spot-1' }, error: null })
  mockSelect.mockReturnValue({ single: mockSingle })
  mockInsert.mockReturnValue({ select: mockSelect })
  vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabase as any)
})

describe('createSpot', () => {
  it('gibt Fehler zurück wenn nicht eingeloggt', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const fd = new FormData()
    fd.set('lat', '51.5')
    fd.set('lng', '9.9')

    const result = await createSpot(undefined, fd)
    expect(result).toEqual({ error: 'Nicht eingeloggt' })
  })

  it('gibt Fehler zurück wenn Koordinaten fehlen', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const fd = new FormData()

    const result = await createSpot(undefined, fd)
    expect(result).toEqual({ error: 'Koordinaten fehlen' })
  })

  it('gibt Fehler zurück wenn type ungültig ist', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const fd = new FormData()
    fd.set('lat', '51.5074')
    fd.set('lng', '9.9')
    fd.set('type', 'garbage-type')

    const result = await createSpot(undefined, fd)
    expect(result).toEqual({ error: 'Ungültiger Spot-Typ' })
  })

  it('legt Spot mit Default-Type "bench" an und redirectet zu /', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const fd = new FormData()
    fd.set('lat', '51.5074')
    fd.set('lng', '9.9')
    fd.set('name', 'Meine Bank')

    await expect(createSpot(undefined, fd)).rejects.toMatchObject({ digest: expect.stringContaining('NEXT_REDIRECT') })
    expect(mockInsert).toHaveBeenCalledWith({
      lat: 51.5074,
      lng: 9.9,
      name: 'Meine Bank',
      type: 'bench',
      created_by: 'user-1',
    })
  })

  it('akzeptiert non-default type (viewpoint) und gibt ihn an insert weiter', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const fd = new FormData()
    fd.set('lat', '51.5074')
    fd.set('lng', '9.9')
    fd.set('name', 'Aussicht über Tal')
    fd.set('type', 'viewpoint')

    await expect(createSpot(undefined, fd)).rejects.toMatchObject({ digest: expect.stringContaining('NEXT_REDIRECT') })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'viewpoint', name: 'Aussicht über Tal' })
    )
  })

  it('speichert null wenn Name leer und Nominatim fehlschlägt', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false } as any)

    const fd = new FormData()
    fd.set('lat', '51.5074')
    fd.set('lng', '9.9')

    await expect(createSpot(undefined, fd)).rejects.toMatchObject({ digest: expect.stringContaining('NEXT_REDIRECT') })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: null })
    )
  })

  it('queries the spots table', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const fd = new FormData()
    fd.set('lat', '51.5074')
    fd.set('lng', '9.9')
    fd.set('name', 'Test')

    await expect(createSpot(undefined, fd)).rejects.toMatchObject({ digest: expect.stringContaining('NEXT_REDIRECT') })
    expect(mockSupabase.from).toHaveBeenCalledWith('spots')
  })
})
