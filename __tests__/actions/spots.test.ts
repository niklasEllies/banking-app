import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSpot, updateSpot } from '@/actions/spots'
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

describe('updateSpot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gibt Fehler zurück wenn nicht eingeloggt', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await updateSpot('spot-1', { name: 'X', type: 'bench' })
    expect(result).toEqual({ error: 'Nicht eingeloggt' })
  })

  it('gibt Fehler zurück bei ungültigem Type', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const result = await updateSpot('spot-1', { name: 'X', type: 'garbage' as never })
    expect(result).toEqual({ error: 'Ungültiger Spot-Typ' })
  })

  it('gibt Fehler zurück wenn nicht Owner', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { created_by: 'user-2' }, error: null })
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelectCheck = vi.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ select: mockSelectCheck } as never)

    const result = await updateSpot('spot-1', { name: 'X', type: 'bench' })
    expect(result).toEqual({ error: 'Keine Berechtigung' })
  })

  it('gibt Fehler zurück wenn Spot nicht gefunden', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelectCheck = vi.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ select: mockSelectCheck } as never)

    const result = await updateSpot('spot-1', { name: 'X', type: 'bench' })
    expect(result).toEqual({ error: 'Spot nicht gefunden' })
  })

  it('updated Spot wenn Owner — name wird getrimmt, type übergeben', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { created_by: 'user-1' }, error: null })
    const mockEqSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelectCheck = vi.fn().mockReturnValue({ eq: mockEqSelect })

    const mockEqUpdate = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) return { select: mockSelectCheck } as never
      return { update: mockUpdate } as never
    })

    const result = await updateSpot('spot-1', { name: '  Neuer Name  ', type: 'viewpoint' })
    expect(result).toEqual({})
    expect(mockUpdate).toHaveBeenCalledWith({ name: 'Neuer Name', type: 'viewpoint' })
    expect(mockEqUpdate).toHaveBeenCalledWith('id', 'spot-1')
  })

  it('speichert null bei leerem Namen', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { created_by: 'user-1' }, error: null })
    const mockEqSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelectCheck = vi.fn().mockReturnValue({ eq: mockEqSelect })

    const mockEqUpdate = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) return { select: mockSelectCheck } as never
      return { update: mockUpdate } as never
    })

    const result = await updateSpot('spot-1', { name: '   ', type: 'bench' })
    expect(result).toEqual({})
    expect(mockUpdate).toHaveBeenCalledWith({ name: null, type: 'bench' })
  })
})
