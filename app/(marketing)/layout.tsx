import type { ReactNode } from 'react'
import LandingMotionProvider from './_components/LandingMotionProvider'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#1d2218] text-[#e6e3d3] overflow-x-hidden">
      <LandingMotionProvider>{children}</LandingMotionProvider>
    </div>
  )
}
