import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBench } from '@/actions/benches'
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
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({ insert: mockInsert })),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabase as any)
})

describe('createBench', () => {
  it('gibt Fehler zurück wenn nicht eingeloggt', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const fd = new FormData()
    fd.set('lat', '51.5')
    fd.set('lng', '9.9')

    const result = await createBench(undefined, fd)
    expect(result).toEqual({ error: 'Nicht eingeloggt' })
  })

  it('gibt Fehler zurück wenn Koordinaten fehlen', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const fd = new FormData()

    const result = await createBench(undefined, fd)
    expect(result).toEqual({ error: 'Koordinaten fehlen' })
  })

  it('legt Bank in Supabase an und redirectet zu /', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsert.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set('lat', '51.5074')
    fd.set('lng', '9.9')
    fd.set('name', 'Meine Bank')

    await expect(createBench(undefined, fd)).rejects.toMatchObject({ digest: expect.stringContaining('NEXT_REDIRECT') })
    expect(mockInsert).toHaveBeenCalledWith({
      lat: 51.5074,
      lng: 9.9,
      name: 'Meine Bank',
      created_by: 'user-1',
    })
  })

  it('speichert null wenn Name leer und Nominatim fehlschlägt', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsert.mockResolvedValue({ error: null })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false } as any)

    const fd = new FormData()
    fd.set('lat', '51.5074')
    fd.set('lng', '9.9')

    await expect(createBench(undefined, fd)).rejects.toMatchObject({ digest: expect.stringContaining('NEXT_REDIRECT') })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: null })
    )
  })
})
