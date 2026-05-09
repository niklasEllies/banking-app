'use client'

import type { InputHTMLAttributes } from 'react'
import { IconSearch, IconX } from '@tabler/icons-react'

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** When provided AND value is non-empty, renders a clear (X) button. */
  onClear?: () => void
}

export default function SearchInput({
  onClear,
  value,
  className = '',
  ...rest
}: SearchInputProps) {
  const showClear = onClear !== undefined && typeof value === 'string' && value.length > 0

  return (
    <div className="relative w-full">
      <IconSearch
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        aria-hidden
      />
      <input
        {...rest}
        type="search"
        value={value}
        className={`w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e231a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent [&::-webkit-search-cancel-button]:hidden ${className}`.trim()}
      />
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Suche zurücksetzen"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <IconX size={14} aria-hidden />
        </button>
      )}
    </div>
  )
}
