import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  searchUserByUsername,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  countIncomingRequests,
} from '@/actions/friends'
import * as supabaseServer from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server')
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// search chain: from('profiles').select('id, username').eq('username', q).maybeSingle()
const mockSearchSelect = vi.fn()
const mockSearchEq = vi.fn()
const mockSearchMaybeSingle = vi.fn()

// insert (sendFriendRequest): from('friendships').insert({...}) -> resolves
const mockInsert = vi.fn()

// update (acceptFriendRequest): from('friendships').update().eq().eq().eq()
const mockUpdate = vi.fn()
const mockUpdateEq1 = vi.fn()
const mockUpdateEq2 = vi.fn()
const mockUpdateEq3 = vi.fn()

// delete (declineFriendRequest / cancelFriendRequest): from('friendships').delete().eq().eq()
const mockDelete = vi.fn()
const mockDeleteEq1 = vi.fn()
const mockDeleteEq2 = vi.fn()

// removeFriend: from('friendships').delete().or(...)
const mockRemoveDelete = vi.fn()
const mockRemoveOr = vi.fn()

// listFriends / listIncoming / listOutgoing: from('friendships').select(...).eq(...).eq(...).order(...)
const mockListSelect = vi.fn()
const mockListEq1 = vi.fn()
const mockListEq2 = vi.fn()
const mockListOrder = vi.fn()

// countIncomingRequests: from('friendships').select('*', { count, head }).eq().eq()
const mockCountSelect = vi.fn()
const mockCountEq1 = vi.fn()
const mockCountEq2 = vi.fn()

// route different actions to different chains based on the from() argument
let nextFromBehavior: 'profiles' | 'friendships' = 'friendships'
let nextFriendshipsAction:
  | 'insert'
  | 'update'
  | 'delete-eqs'
  | 'delete-or'
  | 'list'
  | 'count' = 'insert'

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn((table: string) => {
    if (table === 'profiles') {
      return { select: mockSearchSelect }
    }
    // friendships
    switch (nextFriendshipsAction) {
      case 'insert':
        return { insert: mockInsert }
      case 'update':
        return { update: mockUpdate }
      case 'delete-eqs':
        return { delete: mockDelete }
      case 'delete-or':
        return { delete: mockRemoveDelete }
      case 'list':
        return { select: mockListSelect }
      case 'count':
        return { select: mockCountSelect }
    }
  }),
}

beforeEach(() => {
  vi.clearAllMocks()
  nextFromBehavior = 'friendships'
  nextFriendshipsAction = 'insert'

  // search default: no match
  mockSearchMaybeSingle.mockResolvedValue({ data: null, error: null })
  mockSearchEq.mockReturnValue({ maybeSingle: mockSearchMaybeSingle })
  mockSearchSelect.mockReturnValue({ eq: mockSearchEq })

  // insert default: success
  mockInsert.mockResolvedValue({ error: null })

  // update chain (3 eq calls)
  mockUpdateEq3.mockResolvedValue({ error: null })
  mockUpdateEq2.mockReturnValue({ eq: mockUpdateEq3 })
  mockUpdateEq1.mockReturnValue({ eq: mockUpdateEq2 })
  mockUpdate.mockReturnValue({ eq: mockUpdateEq1 })

  // delete-eqs chain (2 eq calls)
  mockDeleteEq2.mockResolvedValue({ error: null })
  mockDeleteEq1.mockReturnValue({ eq: mockDeleteEq2 })
  mockDelete.mockReturnValue({ eq: mockDeleteEq1 })

  // delete-or chain (one .or)
  mockRemoveOr.mockResolvedValue({ error: null })
  mockRemoveDelete.mockReturnValue({ or: mockRemoveOr })

  // list chain (select.eq.eq.order)
  mockListOrder.mockResolvedValue({ data: [], error: null })
  mockListEq2.mockReturnValue({ order: mockListOrder, then: undefined })
  mockListEq1.mockReturnValue({ eq: mockListEq2 })
  mockListSelect.mockReturnValue({ eq: mockListEq1 })

  // count chain
  mockCountEq2.mockResolvedValue({ count: 0, error: null })
  mockCountEq1.mockReturnValue({ eq: mockCountEq2 })
  mockCountSelect.mockReturnValue({ eq: mockCountEq1 })

  // default: authenticated as user-1
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

  vi.mocked(supabaseServer.createClient).mockResolvedValue(
    mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServer.createClient>>,
  )
})

describe('searchUserByUsername', () => {
  it('returns null when query is empty / whitespace-only', async () => {
    expect(await searchUserByUsername('')).toBeNull()
    expect(await searchUserByUsername('   ')).toBeNull()
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('returns null when no match', async () => {
    mockSearchMaybeSingle.mockResolvedValue({ data: null, error: null })
    const result = await searchUserByUsername('ghost')
    expect(result).toBeNull()
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    expect(mockSearchEq).toHaveBeenCalledWith('username', 'ghost')
  })

  it('returns the user (id + username) on exact match', async () => {
    mockSearchMaybeSingle.mockResolvedValue({
      data: { id: 'other-id', username: 'niklas' },
      error: null,
    })
    const result = await searchUserByUsername('niklas')
    expect(result).toEqual({ id: 'other-id', username: 'niklas' })
  })

  it('refuses to return self even if username matches', async () => {
    mockSearchMaybeSingle.mockResolvedValue({
      data: { id: 'user-1', username: 'me' },
      error: null,
    })
    const result = await searchUserByUsername('me')
    expect(result).toBeNull()
  })

  it('returns null when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await searchUserByUsername('niklas')
    expect(result).toBeNull()
  })
})

describe('sendFriendRequest', () => {
  it('rejects unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await sendFriendRequest('other-id')
    expect(result).toEqual({ error: 'Nicht eingeloggt' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects self-request', async () => {
    const result = await sendFriendRequest('user-1')
    expect(result).toEqual({
      error: 'Du kannst dir nicht selbst eine Anfrage senden',
    })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('inserts pending row and returns {} on success', async () => {
    nextFriendshipsAction = 'insert'
    const result = await sendFriendRequest('other-id')
    expect(result).toEqual({})
    expect(mockSupabase.from).toHaveBeenCalledWith('friendships')
    expect(mockInsert).toHaveBeenCalledWith({
      requester_id: 'user-1',
      addressee_id: 'other-id',
      status: 'pending',
    })
  })

  it('returns friendly error on UNIQUE conflict (23505)', async () => {
    nextFriendshipsAction = 'insert'
    mockInsert.mockResolvedValue({
      error: { code: '23505', message: 'duplicate key' },
    })
    const result = await sendFriendRequest('other-id')
    expect(result).toEqual({ error: 'Anfrage existiert bereits' })
  })

  it('passes through other supabase errors', async () => {
    nextFriendshipsAction = 'insert'
    mockInsert.mockResolvedValue({ error: { code: 'XX000', message: 'db kaputt' } })
    const result = await sendFriendRequest('other-id')
    expect(result).toEqual({ error: 'db kaputt' })
  })
})

describe('acceptFriendRequest', () => {
  it('rejects unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await acceptFriendRequest('requester-id')
    expect(result).toEqual({ error: 'Nicht eingeloggt' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('UPDATE sets status=accepted filtered by requester_id+addressee_id+status=pending', async () => {
    nextFriendshipsAction = 'update'
    const result = await acceptFriendRequest('requester-id')
    expect(result).toEqual({})
    expect(mockSupabase.from).toHaveBeenCalledWith('friendships')
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'accepted' })
    expect(mockUpdateEq1).toHaveBeenCalledWith('requester_id', 'requester-id')
    expect(mockUpdateEq2).toHaveBeenCalledWith('addressee_id', 'user-1')
    expect(mockUpdateEq3).toHaveBeenCalledWith('status', 'pending')
  })
})

describe('declineFriendRequest', () => {
  it('rejects unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await declineFriendRequest('requester-id')
    expect(result).toEqual({ error: 'Nicht eingeloggt' })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('DELETE filtered by (requester_id=arg, addressee_id=self)', async () => {
    nextFriendshipsAction = 'delete-eqs'
    const result = await declineFriendRequest('requester-id')
    expect(result).toEqual({})
    expect(mockSupabase.from).toHaveBeenCalledWith('friendships')
    expect(mockDeleteEq1).toHaveBeenCalledWith('requester_id', 'requester-id')
    expect(mockDeleteEq2).toHaveBeenCalledWith('addressee_id', 'user-1')
  })
})

describe('cancelFriendRequest', () => {
  it('rejects unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await cancelFriendRequest('addressee-id')
    expect(result).toEqual({ error: 'Nicht eingeloggt' })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('DELETE filtered by (requester_id=self, addressee_id=arg)', async () => {
    nextFriendshipsAction = 'delete-eqs'
    const result = await cancelFriendRequest('addressee-id')
    expect(result).toEqual({})
    expect(mockDeleteEq1).toHaveBeenCalledWith('requester_id', 'user-1')
    expect(mockDeleteEq2).toHaveBeenCalledWith('addressee_id', 'addressee-id')
  })
})

describe('removeFriend', () => {
  it('rejects unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await removeFriend('other-id')
    expect(result).toEqual({ error: 'Nicht eingeloggt' })
    expect(mockRemoveDelete).not.toHaveBeenCalled()
  })

  it('DELETE with OR-filter for both directions', async () => {
    nextFriendshipsAction = 'delete-or'
    const result = await removeFriend('other-id')
    expect(result).toEqual({})
    expect(mockSupabase.from).toHaveBeenCalledWith('friendships')
    expect(mockRemoveDelete).toHaveBeenCalled()
    expect(mockRemoveOr).toHaveBeenCalledTimes(1)
    const orArg = mockRemoveOr.mock.calls[0][0] as string
    expect(orArg).toContain('requester_id.eq.user-1')
    expect(orArg).toContain('addressee_id.eq.other-id')
    expect(orArg).toContain('requester_id.eq.other-id')
    expect(orArg).toContain('addressee_id.eq.user-1')
  })
})

describe('listFriends', () => {
  it('returns [] when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await listFriends()
    expect(result).toEqual([])
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })
})

describe('listIncomingRequests', () => {
  it('returns [] when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await listIncomingRequests()
    expect(result).toEqual([])
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })
})

describe('listOutgoingRequests', () => {
  it('returns [] when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await listOutgoingRequests()
    expect(result).toEqual([])
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })
})

describe('countIncomingRequests', () => {
  it('returns 0 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await countIncomingRequests()
    expect(result).toBe(0)
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('returns the count when authenticated', async () => {
    nextFriendshipsAction = 'count'
    mockCountEq2.mockResolvedValue({ count: 3, error: null })
    const result = await countIncomingRequests()
    expect(result).toBe(3)
    expect(mockSupabase.from).toHaveBeenCalledWith('friendships')
    expect(mockCountEq1).toHaveBeenCalledWith('addressee_id', 'user-1')
    expect(mockCountEq2).toHaveBeenCalledWith('status', 'pending')
  })
})
