'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  searchUserByUsername,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  type FriendUser,
  type FriendRequest,
} from '@/actions/friends'

type TabKey = 'friends' | 'requests' | 'search'
type SearchState = FriendUser | null | 'not-found' | 'pending'

interface FriendsClientProps {
  friends: FriendUser[]
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
}

export default function FriendsClient({ friends, incoming, outgoing }: FriendsClientProps) {
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>(incoming.length > 0 ? 'requests' : 'friends')
  const [isPending, startTransition] = useTransition()
  const [searchPending, startSearchTransition] = useTransition()

  const [searchInput, setSearchInput] = useState('')
  const [searchResult, setSearchResult] = useState<SearchState>(null)
  const [sentConfirmation, setSentConfirmation] = useState(false)

  const requestsCount = incoming.length + outgoing.length

  const handleRemove = (id: string, username: string | null) => {
    const ok = window.confirm(
      `Freundschaft mit @${username ?? 'diesem User'} wirklich beenden?`,
    )
    if (!ok) return
    startTransition(async () => {
      const result = await removeFriend(id)
      if (result.error) {
        window.alert(result.error)
        return
      }
      router.refresh()
    })
  }

  const handleAccept = (id: string) => {
    startTransition(async () => {
      const result = await acceptFriendRequest(id)
      if (result.error) {
        window.alert(result.error)
        return
      }
      router.refresh()
    })
  }

  const handleDecline = (id: string) => {
    startTransition(async () => {
      const result = await declineFriendRequest(id)
      if (result.error) {
        window.alert(result.error)
        return
      }
      router.refresh()
    })
  }

  const handleCancel = (id: string) => {
    startTransition(async () => {
      const result = await cancelFriendRequest(id)
      if (result.error) {
        window.alert(result.error)
        return
      }
      router.refresh()
    })
  }

  const handleSend = (id: string) => {
    startTransition(async () => {
      const result = await sendFriendRequest(id)
      if (result.error) {
        window.alert(result.error)
        return
      }
      setSearchResult(null)
      setSearchInput('')
      setSentConfirmation(true)
      router.refresh()
    })
  }

  const handleAcceptFromSearch = (id: string) => {
    startTransition(async () => {
      const result = await acceptFriendRequest(id)
      if (result.error) {
        window.alert(result.error)
        return
      }
      setSearchResult(null)
      setSearchInput('')
      router.refresh()
    })
  }

  const doSearch = () => {
    const trimmed = searchInput.trim()
    if (!trimmed) return
    setSentConfirmation(false)
    startSearchTransition(async () => {
      const result = await searchUserByUsername(trimmed)
      setSearchResult(result ?? 'not-found')
    })
  }

  const tabBtnClass = (active: boolean) =>
    `flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'text-primary border-primary'
        : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'
    }`

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-md mx-auto px-4 py-8">
        <Link
          href="/profil"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 mb-6"
        >
          ← Zurück zum Profil
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Freunde</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Verwalte deine Freunde und Anfragen.
        </p>

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 dark:border-[#2a2f24] mb-4">
          <button
            type="button"
            onClick={() => setTab('friends')}
            role="tab"
            aria-selected={tab === 'friends'}
            className={tabBtnClass(tab === 'friends')}
          >
            Freunde ({friends.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('requests')}
            role="tab"
            aria-selected={tab === 'requests'}
            className={tabBtnClass(tab === 'requests')}
          >
            Anfragen ({requestsCount})
          </button>
          <button
            type="button"
            onClick={() => setTab('search')}
            role="tab"
            aria-selected={tab === 'search'}
            className={tabBtnClass(tab === 'search')}
          >
            Suchen
          </button>
        </div>

        {tab === 'friends' && (
          <div className="space-y-2">
            {friends.length === 0 ? (
              <p className="italic text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
                Du hast noch keine Freunde — suche jemanden im Tab &lsquo;Suchen&rsquo;.
              </p>
            ) : (
              friends.map((f) => (
                <div
                  key={f.id}
                  className="bg-white dark:bg-[#1e231a] rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                    @{f.username ?? '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(f.id, f.username)}
                    disabled={isPending}
                    className="shrink-0 text-sm font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                  >
                    Entfernen
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'requests' && (
          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                Eingehend
              </h2>
              {incoming.length === 0 ? (
                <p className="italic text-sm text-gray-500 dark:text-gray-400">
                  Keine eingehenden Anfragen.
                </p>
              ) : (
                <div className="space-y-2">
                  {incoming.map((r) => (
                    <div
                      key={r.id}
                      className="bg-white dark:bg-[#1e231a] rounded-xl p-3 flex items-center justify-between gap-3"
                    >
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                        @{r.username ?? '—'}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAccept(r.id)}
                          disabled={isPending}
                          className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                        >
                          Annehmen
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecline(r.id)}
                          disabled={isPending}
                          className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
                        >
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                Ausgehend
              </h2>
              {outgoing.length === 0 ? (
                <p className="italic text-sm text-gray-500 dark:text-gray-400">
                  Keine ausgehenden Anfragen.
                </p>
              ) : (
                <div className="space-y-2">
                  {outgoing.map((r) => (
                    <div
                      key={r.id}
                      className="bg-white dark:bg-[#1e231a] rounded-xl p-3 flex items-center justify-between gap-3"
                    >
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                        @{r.username ?? '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCancel(r.id)}
                        disabled={isPending}
                        className="shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
                      >
                        Anfrage zurückziehen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'search' && (
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                doSearch()
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value)
                  setSentConfirmation(false)
                }}
                placeholder="Username eingeben…"
                className="flex-1 rounded-lg border border-gray-200 dark:border-[#2a2f24] bg-white dark:bg-[#1e231a] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={searchPending || !searchInput.trim()}
                className="shrink-0 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                Suchen
              </button>
            </form>

            {sentConfirmation && (
              <p className="text-sm text-primary font-medium">Anfrage gesendet ✓</p>
            )}

            {searchResult === 'not-found' && (
              <p className="italic text-sm text-gray-500 dark:text-gray-400">
                Keinen User mit diesem Namen gefunden.
              </p>
            )}

            {searchResult && typeof searchResult === 'object' && (
              <div className="bg-white dark:bg-[#1e231a] rounded-xl p-3 flex items-center justify-between gap-3">
                <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                  @{searchResult.username ?? '—'}
                </span>
                {(() => {
                  const id = searchResult.id
                  if (friends.find((f) => f.id === id)) {
                    return (
                      <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
                        Bereits Freunde
                      </span>
                    )
                  }
                  if (outgoing.find((r) => r.id === id)) {
                    return (
                      <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
                        Anfrage läuft
                      </span>
                    )
                  }
                  if (incoming.find((r) => r.id === id)) {
                    return (
                      <button
                        type="button"
                        onClick={() => handleAcceptFromSearch(id)}
                        disabled={isPending}
                        className="shrink-0 text-sm font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        Anfrage annehmen
                      </button>
                    )
                  }
                  return (
                    <button
                      type="button"
                      onClick={() => handleSend(id)}
                      disabled={isPending}
                      className="shrink-0 text-sm font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      Anfrage senden
                    </button>
                  )
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
