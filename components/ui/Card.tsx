import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  /** Padding preset. Default 'md' (p-3). */
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const PADDING = {
  none: '',
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
}

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div className={`bg-white dark:bg-[#1e231a] rounded-xl ${PADDING[padding]} ${className}`}>
      {children}
    </div>
  )
}
