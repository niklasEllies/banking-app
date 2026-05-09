'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { IconUsersGroup, IconInbox, IconSearch, IconChevronRight } from '@tabler/icons-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import TabBar from '@/components/ui/TabBar'
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
  const [searchResults, setSearchResults] = useState<FriendUser[]>([])
  const [searchHasQueried, setSearchHasQueried] = useState(false)
  const [sentToIds, setSentToIds] = useState<Set<string>>(() => new Set())

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
      setSentToIds((prev) => new Set(prev).add(id))
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
      setSearchResults([])
      setSearchInput('')
      setSearchHasQueried(false)
      router.refresh()
    })
  }

  // Debounced live search: triggers 300ms after the user stops typing
  useEffect(() => {
    const trimmed = searchInput.trim()
    if (!trimmed) {
      setSearchResults([])
      setSearchHasQueried(false)
      return
    }
    const t = setTimeout(() => {
      startSearchTransition(async () => {
        const results = await searchUserByUsername(trimmed)
        setSearchResults(results)
        setSearchHasQueried(true)
      })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-md mx-auto px-4 py-8">
        <PageHeader
          title="Freunde"
          subtitle="Verwalte deine Freunde und Anfragen."
          backHref="/profil"
          backLabel="Zurück zum Profil"
        />

        <div className="mb-4">
          <TabBar<TabKey>
            tabs={[
              { value: 'friends', label: 'Freunde', count: friends.length },
              { value: 'requests', label: 'Anfragen', count: requestsCount },
              { value: 'search', label: 'Suchen' },
            ]}
            active={tab}
            onChange={setTab}
            ariaLabel="Freunde-Ansicht"
          />
        </div>

        {tab === 'friends' && (
          <div className="space-y-2">
            {friends.length === 0 ? (
              <EmptyState
                Icon={IconUsersGroup}
                title="Noch keine Freunde"
                body="Such jemanden per Username im Tab Suchen — wenn er die Anfrage annimmt, erscheinen die Plätzchen, die er mit Freunden geteilt hat, hier."
                action={
                  <button
                    type="button"
                    onClick={() => setTab('search')}
                    className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
                  >
                    Jemanden suchen <IconChevronRight size={14} aria-hidden />
                  </button>
                }
              />
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
                    className="shrink-0 text-sm font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-60"
                  >
                    Entfernen
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'requests' && (
          incoming.length === 0 && outgoing.length === 0 ? (
            <EmptyState
              Icon={IconInbox}
              title="Keine offenen Anfragen"
              body="Eingehende und ausgehende Freundschaftsanfragen erscheinen hier."
              action={
                <button
                  type="button"
                  onClick={() => setTab('search')}
                  className="text-primary font-medium hover:underline"
                >
                  Freund suchen <IconChevronRight size={14} aria-hidden />
                </button>
              }
            />
          ) : (
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
                          className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
                        >
                          Annehmen
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecline(r.id)}
                          disabled={isPending}
                          className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-60"
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(r.id)}
                        disabled={isPending}
                        className="shrink-0"
                      >
                        Anfrage zurückziehen
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
          )
        )}

        {tab === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Username suchen… (mind. 1 Zeichen)"
                aria-label="Username suchen"
                className="w-full rounded-lg border border-gray-200 dark:border-[#2a2f24] bg-white dark:bg-[#1e231a] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-primary"
              />
              {searchPending && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">…</span>
              )}
            </div>

            {!searchInput.trim() && (
              <EmptyState
                Icon={IconSearch}
                title="Such jemanden per Username"
                body="Mindestens 1 Zeichen — Groß-/Kleinschreibung egal, Teil-Treffer zählen."
                compact
              />
            )}

            {searchInput.trim() && searchHasQueried && searchResults.length === 0 && !searchPending && (
              <p className="italic text-sm text-gray-500 dark:text-gray-400">
                Keinen User mit diesem Namen gefunden.
              </p>
            )}

            {searchResults.length > 0 && (
              <ul className="space-y-2">
                {searchResults.map((u) => {
                  const isFriend = friends.find((f) => f.id === u.id)
                  const isOutgoing = outgoing.find((r) => r.id === u.id) || sentToIds.has(u.id)
                  const isIncoming = incoming.find((r) => r.id === u.id)
                  return (
                    <li
                      key={u.id}
                      className="bg-white dark:bg-[#1e231a] rounded-xl p-3 flex items-center justify-between gap-3"
                    >
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                        @{u.username ?? '—'}
                      </span>
                      {isFriend ? (
                        <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
                          Bereits Freunde
                        </span>
                      ) : isOutgoing ? (
                        <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
                          Anfrage läuft
                        </span>
                      ) : isIncoming ? (
                        <button
                          type="button"
                          onClick={() => handleAcceptFromSearch(u.id)}
                          disabled={isPending}
                          className="shrink-0 text-sm font-medium text-primary hover:underline disabled:opacity-60"
                        >
                          Anfrage annehmen
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSend(u.id)}
                          disabled={isPending}
                          className="shrink-0 text-sm font-medium text-primary hover:underline disabled:opacity-60"
                        >
                          Anfrage senden
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
