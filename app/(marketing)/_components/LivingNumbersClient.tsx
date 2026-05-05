'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import type { LivingNumbers } from '@/lib/marketing-stats'

export default function LivingNumbersClient({ initial }: { initial: LivingNumbers }) {
  const [numbers, setNumbers] = useState(initial)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`living-numbers-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spots' }, (payload) => {
        if ((payload.new as { visibility?: string }).visibility !== 'public') return
        setNumbers((n) => ({ ...n, total: n.total + 1, thisWeek: n.thisWeek + 1 }))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        setNumbers((n) => ({ ...n, betaUsers: n.betaUsers + 1 }))
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  return (
    <div ref={ref} className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-10 items-end">
      <Stat value={numbers.total} label="Plätzchen entdeckt" size="big" inView={inView} />
      <Stat value={numbers.thisWeek} label="diese Woche" size="mid" prefix="+" inView={inView} />
      <Stat value={numbers.betaUsers} label="Beta-Tester" size="small" inView={inView} />
    </div>
  )
}

function Stat({ value, label, size, prefix = '', inView }: { value: number; label: string; size: 'big' | 'mid' | 'small'; prefix?: string; inView: boolean }) {
  const cls = size === 'big' ? 'text-7xl lg:text-[84px]' : size === 'mid' ? 'text-5xl lg:text-6xl' : 'text-4xl lg:text-5xl'
  return (
    <div>
      <motion.div
        className={`${cls} font-bold leading-none tracking-tight text-white tabular-nums`}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4 }}
      >
        {prefix}<TickUp value={value} active={inView} />
      </motion.div>
      <div className="font-mono text-[11px] uppercase tracking-wider text-[#8aa376] mt-2">{label}</div>
    </div>
  )
}

function TickUp({ value, active }: { value: number; active: boolean }) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!active) return
    if (reduce) {
      setDisplay(value)
      return
    }
    const start = performance.now()
    const duration = 1200
    let raf = 0
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, active, reduce])
  return <>{display.toLocaleString('de-DE')}</>
}
