import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signUp, login, logout } from '@/actions/auth'
import * as supabaseServer from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server')
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw { digest: 'NEXT_REDIRECT', url }
  }),
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}))

const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabase as any)
})

describe('signUp', () => {
  it('gibt Fehler zurück wenn Email fehlt', async () => {
    const fd = new FormData()
    fd.set('password', 'pass123')
    fd.set('username', 'user')

    const result = await signUp(undefined, fd)
    expect(result).toEqual({ error: 'Email, Passwort und Username sind erforderlich' })
  })

  it('ruft supabase.auth.signUp mit korrekten Parametern auf', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ error: null })
    const fd = new FormData()
    fd.set('email', 'test@example.com')
    fd.set('password', 'pass123')
    fd.set('username', 'testuser')

    await expect(signUp(undefined, fd)).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'pass123',
      options: { data: { username: 'testuser' } },
    })
  })

  it('gibt Supabase-Fehler zurück', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ error: { message: 'Email already registered' } })
    const fd = new FormData()
    fd.set('email', 'test@example.com')
    fd.set('password', 'pass123')
    fd.set('username', 'testuser')

    const result = await signUp(undefined, fd)
    expect(result).toEqual({ error: 'Email already registered' })
  })
})

describe('login', () => {
  it('gibt Fehler zurück wenn Email fehlt', async () => {
    const fd = new FormData()
    fd.set('password', 'pass123')

    const result = await login(undefined, fd)
    expect(result).toEqual({ error: 'Email und Passwort sind erforderlich' })
  })

  it('ruft signInWithPassword auf und redirectet', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: null })
    const fd = new FormData()
    fd.set('email', 'test@example.com')
    fd.set('password', 'pass123')

    await expect(login(undefined, fd)).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'pass123',
    })
  })

  it('gibt Supabase-Fehler zurück', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid credentials' } })
    const fd = new FormData()
    fd.set('email', 'test@example.com')
    fd.set('password', 'wrongpass')

    const result = await login(undefined, fd)
    expect(result).toEqual({ error: 'Invalid credentials' })
  })
})

describe('logout', () => {
  it('ruft signOut auf und redirectet zu /', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })

    await expect(logout()).rejects.toMatchObject({ digest: 'NEXT_REDIRECT', url: '/' })
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })
})
