'use client'

export interface TabItem<T extends string> {
  value: T
  label: string
  count?: number
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[]
  active: T
  onChange: (value: T) => void
  ariaLabel: string
}

export default function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
}: TabBarProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex border-b border-gray-200 dark:border-[#2a2f24]"
    >
      {tabs.map((t) => {
        const isActive = active === t.value
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              isActive
                ? 'text-primary border-primary'
                : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
            {typeof t.count === 'number' && ` (${t.count})`}
          </button>
        )
      })}
    </div>
  )
}
