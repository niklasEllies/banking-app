'use client'

import { useState, useTransition } from 'react'
import { setAdminRole } from '@/actions/admin'

export interface AdminUser {
  id: string
  username: string | null
  email: string | null
  is_admin: boolean
  created_at: string
  bench_count: number
}

export default function AdminUsers({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
        {users.length} {users.length === 1 ? 'User' : 'User'}
      </p>
      <div className="space-y-2">
        {users.map((user) => (
          <UserRow key={user.id} user={user} isSelf={user.id === currentUserId} />
        ))}
      </div>
    </div>
  )
}

function UserRow({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const [isAdmin, setIsAdmin] = useState(user.is_admin)
  const [isPending, startTransition] = useTransition()

  const toggle = () => {
    const next = !isAdmin
    setIsAdmin(next)
    startTransition(async () => {
      const result = await setAdminRole(user.id, next)
      if (result.error) setIsAdmin(!next)
    })
  }

  return (
    <div className="bg-white dark:bg-[#1e231a] rounded-xl p-3 flex items-start gap-3">
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
          {user.bench_count} {user.bench_count === 1 ? 'Bank' : 'Bänke'} ·{' '}
          {new Date(user.created_at).toLocaleDateString('de-DE')}
        </p>
      </div>
      {!isSelf && (
        <button
          onClick={toggle}
          disabled={isPending}
          className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
            isAdmin
              ? 'border-primary text-primary hover:bg-primary-light dark:hover:bg-[#2a3f1e]'
              : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary'
          }`}
        >
          {isAdmin ? 'Admin ✓' : 'Admin'}
        </button>
      )}
    </div>
  )
}
