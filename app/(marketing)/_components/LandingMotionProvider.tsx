'use client'

import { LazyMotion, domAnimation } from 'motion/react'
import type { ReactNode } from 'react'

// Lazy-loads only the DOM-animation feature subset (animate, whileInView,
// useScroll, useTransform). Combined with strict mode + `m.X` shortcuts in
// children, this drops the framer-motion features bundle off the landing
// critical path.
export default function LandingMotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  )
}
