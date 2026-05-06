'use client'

import { useEffect, useState, useTransition } from 'react'
import { IconSun, IconMoon, IconSunMoon, type IconProps } from '@tabler/icons-react'
import { updateThemePreference, type ThemePreference } from '@/actions/profile'

const LS_KEY = 'plaetzchen-theme'
const OLD_LS_KEY = 'benchmarks-theme'

type IconComponent = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>

const THEMES: { value: ThemePreference; Icon: IconComponent; label: string }[] = [
  { value: 'system', Icon: IconSunMoon, label: 'System' },
  { value: 'light',  Icon: IconSun,     label: 'Hell' },
  { value: 'dark',   Icon: IconMoon,    label: 'Dunkel' },
]

function isValid(v: string | null): v is ThemePreference {
  return v === 'light' || v === 'dark' || v === 'system'
}

function resolveDark(theme: ThemePreference): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(theme: ThemePreference) {
  document.documentElement.classList.toggle('dark', resolveDark(theme))
}

export default function ThemeToggle({ userTheme }: { userTheme?: ThemePreference | null }) {
  const [theme, setTheme] = useState<ThemePreference>('system')
  const [, startTransition] = useTransition()
  const isAuthed = userTheme !== undefined && userTheme !== null

  useEffect(() => {
    // Migrate old localStorage key (Phase ≤8.0 used 'benchmarks-theme' with only 'dark'/'light')
    const oldVal = localStorage.getItem(OLD_LS_KEY)
    if (oldVal && !localStorage.getItem(LS_KEY)) {
      localStorage.setItem(LS_KEY, isValid(oldVal) ? oldVal : 'system')
      localStorage.removeItem(OLD_LS_KEY)
    }

    // Resolution order on mount: DB > localStorage > 'system'
    const lsRaw = localStorage.getItem(LS_KEY)
    const lsValue = isValid(lsRaw) ? lsRaw : null
    let initial: ThemePreference
    if (userTheme && userTheme !== lsValue) {
      // DB wins on fresh-device first-load — sync down to localStorage
      initial = userTheme
      localStorage.setItem(LS_KEY, userTheme)
    } else if (lsValue) {
      initial = lsValue
    } else {
      initial = userTheme ?? 'system'
    }
    setTheme(initial)
    applyTheme(initial)
  }, [userTheme])

  // When in 'system' mode, listen for OS theme changes and re-apply
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const cycle = () => {
    const idx = THEMES.findIndex((t) => t.value === theme)
    const next = THEMES[(idx + 1) % THEMES.length].value
    setTheme(next)
    localStorage.setItem(LS_KEY, next)
    applyTheme(next)
    if (isAuthed) {
      startTransition(async () => {
        await updateThemePreference(next)
      })
    }
  }

  const current = THEMES.find((t) => t.value === theme) ?? THEMES[0]

  const CurrentIcon = current.Icon

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
      aria-label={`Theme: ${current.label}. Klicken zum Wechseln zwischen System, Hell und Dunkel.`}
      title={`Theme: ${current.label}`}
    >
      <CurrentIcon size={18} stroke={1.6} aria-hidden />
    </button>
  )
}
