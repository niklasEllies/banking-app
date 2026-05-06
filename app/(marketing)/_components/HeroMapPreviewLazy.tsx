'use client'

import { useEffect, useRef, useState, type ComponentProps } from 'react'
import dynamic from 'next/dynamic'
import type HeroMapPreview from './HeroMapPreview'

const HeroMapPreviewClient = dynamic(() => import('./HeroMapPreview'), {
  ssr: false,
  loading: () => null,
})

type Props = ComponentProps<typeof HeroMapPreview>

/**
 * Wraps HeroMapPreview behind an IntersectionObserver so leaflet's ~150 KB
 * bundle only loads when the map is about to enter the viewport.
 *
 * On desktop the map is already above the fold (right column), so the
 * threshold uses a generous rootMargin to start loading shortly after the
 * page mounts. On mobile (stacked layout) the map enters the viewport much
 * later — the observer kicks in only when the user scrolls.
 *
 * The skeleton placeholder fills the same space (matches HeroSection's
 * `min-h-[360px] lg:min-h-0` wrapper), so no CLS.
 */
export default function HeroMapPreviewLazy(props: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (shouldLoad) return
    const node = ref.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true)
      return
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            obs.disconnect()
            break
          }
        }
      },
      { rootMargin: '300px' },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [shouldLoad])

  return (
    <div
      ref={ref}
      className="relative w-full h-full min-h-[360px] rounded-xl overflow-hidden bg-[#2a2f1f]"
      role="img"
      aria-label={`Karte mit ${props.spots.length} Beispiel-Plätzchen`}
    >
      {shouldLoad && <HeroMapPreviewClient {...props} />}
    </div>
  )
}
