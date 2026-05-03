'use client'

import { useEffect, useState } from 'react'

const THEME_KEY = 'benchmarks-theme'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      className="text-base leading-none text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      aria-label={dark ? 'Hell-Modus aktivieren' : 'Dunkel-Modus aktivieren'}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
