'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { IconCheck, IconSearch, IconChevronRight } from '@tabler/icons-react'
import { setAdminRole } from '@/actions/admin'
import EmptyState from '@/components/EmptyState'
import { IconUserOff } from '@tabler/icons-react'
import type { AdminUserRow } from '@/lib/admin-data'

export default function AdminUsers({ users, currentUserId }: { users: AdminUserRow[]; currentUserId: string }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'admin'>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (filter === 'admin' && !u.is_admin) return false
      if (!q) return true
      return (
        (u.username?.toLowerCase().includes(q) ?? false) ||
        (u.email?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [users, query, filter])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Username oder E-Mail suchen…"
            className="w-full rounded-lg border border-gray-200 dark:border-[#2a2f24] bg-white dark:bg-[#1e231a] pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'admin')}
          className="rounded-lg border border-gray-200 dark:border-[#2a2f24] bg-white dark:bg-[#1e231a] px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-primary"
        >
          <option value="all">Alle</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState Icon={IconUserOff} title="Keine User gefunden" body={query ? 'Versuche einen anderen Suchbegriff.' : 'Filter ändern.'} compact />
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => (
            <UserRow key={user.id} user={user} isSelf={user.id === currentUserId} />
          ))}
        </div>
      )}
    </div>
  )
}

function UserRow({ user, isSelf }: { user: AdminUserRow; isSelf: boolean }) {
  const [isAdmin, setIsAdmin] = useState(user.is_admin)
  const [isPending, startTransition] = useTransition()

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next = !isAdmin
    setIsAdmin(next)
    startTransition(async () => {
      const result = await setAdminRole(user.id, next)
      if (result.error) setIsAdmin(!next)
    })
  }

  return (
    <Link
      href={`/admin/users/${user.id}`}
      className="bg-white dark:bg-[#1e231a] rounded-xl p-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-[#262b1f] transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            @{user.username ?? '—'}
          </span>
          {isAdmin && (
            <span className="text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">
              Admin
            </span>
          )}
          {isSelf && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">(du)</span>
          )}
        </div>
        {user.email && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {user.spot_count} Plätzchen · {new Date(user.created_at).toLocaleDateString('de-DE')}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isSelf && (
          <button
            onClick={toggle}
            disabled={isPending}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-60 ${
              isAdmin
                ? 'border-primary text-primary hover:bg-primary-light dark:hover:bg-[#2a3f1e]'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary'
            }`}
          >
            {isAdmin ? <span className="inline-flex items-center gap-1">Admin <IconCheck size={12} aria-hidden /></span> : 'Admin'}
          </button>
        )}
        <IconChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400" aria-hidden />
      </div>
    </Link>
  )
}
