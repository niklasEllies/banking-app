import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getHeroSampleSpots } from '@/lib/marketing-stats'
import HeroMapPreview from './HeroMapPreview'
import SectionMeta from './SectionMeta'

export default async function HeroSection() {
  const supabase = await createClient()
  const [{ data: { user } }, spots] = await Promise.all([
    supabase.auth.getUser(),
    getHeroSampleSpots(6),
  ])

  return (
    <section className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 px-6 lg:px-12 py-16 lg:py-20">
      <div className="flex flex-col justify-between gap-12">
        <SectionMeta label="50.94° N · BETA · FRÜHJAHR 26" />
        <div className="flex flex-col gap-6">
          <h1 className="font-bold uppercase text-[56px] lg:text-[88px] leading-[0.95] tracking-tight">
            PLÄTZ
            <span className="font-[var(--font-display)] font-light italic text-[#5e9e3e] normal-case tracking-normal">chen</span>
          </h1>
          <p className="text-lg lg:text-xl text-[#c8c8c0] leading-snug max-w-md">
            Eine Karte für Orte, die nirgendwo stehen.
          </p>
          <p className="text-sm text-[#a8a89a] max-w-md">
            Bänke, Aussichten, Schutzhütten, Liegewiesen — die Plätze, die Google nicht kennt.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/map"
              className="bg-[#5e9e3e] text-[#14180f] px-5 py-3 rounded-md text-sm font-bold uppercase tracking-wider hover:bg-[#6cb046] transition-colors"
            >
              {user ? 'Zur Karte' : 'Karte ansehen'}
            </Link>
            {!user && (
              <Link
                href="/signup"
                className="border border-[#e6e3d3]/40 text-[#e6e3d3] px-5 py-3 rounded-md text-sm font-medium uppercase tracking-wider hover:bg-[#e6e3d3]/10 transition-colors"
              >
                Beta beitreten
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="relative min-h-[360px] lg:min-h-0">
        <HeroMapPreview spots={spots} />
      </div>
    </section>
  )
}
