import type { ReactNode } from 'react'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#1d2218] text-[#e6e3d3] overflow-x-hidden">
      {children}
    </div>
  )
}
