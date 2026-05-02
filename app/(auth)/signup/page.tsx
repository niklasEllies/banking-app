'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp } from '@/actions/auth'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUp, undefined)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8">🪑 BenchMarks</h1>
        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-green-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-800 disabled:opacity-50"
          >
            {pending ? 'Registrieren...' : 'Konto erstellen'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-4">
          Schon ein Konto?{' '}
          <Link href="/login" className="text-green-700 font-medium hover:underline">
            Einloggen
          </Link>
        </p>
      </div>
    </div>
  )
}
