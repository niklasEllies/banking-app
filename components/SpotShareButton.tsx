'use client'

import { useState } from 'react'

interface SpotShareButtonProps {
  spotId: string
}

export default function SpotShareButton({ spotId }: SpotShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = `${window.location.origin}/?spot=${spotId}`
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ url, title: 'Schau dir dieses Plätzchen an' })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // user cancelled or denied — silent
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Teilen"
      className="min-w-11 min-h-11 flex items-center justify-center text-lg leading-none text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 relative"
    >
      📤
      {copied && (
        <span className="absolute -top-8 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Link kopiert
        </span>
      )}
    </button>
  )
}
