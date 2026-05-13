'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { IconMapPin } from '@tabler/icons-react'
import { signUp } from '@/actions/auth'
import Button from '@/components/ui/Button'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUp, undefined)

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-[#141810] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8 inline-flex items-center gap-2 w-full justify-center"><IconMapPin size={22} aria-hidden /> Plätzchen</h1>
        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm text-gray-800 dark:text-gray-200 font-medium mb-1">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full border border-gray-400 dark:border-gray-600 dark:bg-[#1a1f14] dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm text-gray-800 dark:text-gray-200 font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full border border-gray-400 dark:border-gray-600 dark:bg-[#1a1f14] dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-gray-800 dark:text-gray-200 font-medium mb-1">
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full border border-gray-400 dark:border-gray-600 dark:bg-[#1a1f14] dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {state?.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
          )}
          <Button type="submit" variant="primary" size="sm" fullWidth loading={pending}>
            {pending ? 'Registrieren...' : 'Konto erstellen'}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
          Schon ein Konto?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Einloggen
          </Link>
        </p>
      </div>
    </div>
  )
}
