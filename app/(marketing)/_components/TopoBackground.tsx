'use client'

import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'

export default function TopoBackground() {
  const { scrollYProgress } = useScroll()
  const reduce = useReducedMotion()
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40])

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 opacity-90"
      style={{ y }}
    >
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="none" stroke="#48583a" strokeWidth="0.7">
          <path d="M-50 200 Q 400 80 800 220 T 1650 180" />
          <path d="M-50 320 Q 400 200 800 340 T 1650 300" />
          <path d="M-50 440 Q 400 320 800 460 T 1650 420" />
          <path d="M-50 560 Q 400 440 800 580 T 1650 540" />
          <path d="M-50 680 Q 400 560 800 700 T 1650 660" />
          <path d="M-50 800 Q 400 680 800 820 T 1650 780" />
          <path d="M-50 920 Q 400 800 800 940 T 1650 900" />
        </g>
      </svg>
    </motion.div>
  )
}
