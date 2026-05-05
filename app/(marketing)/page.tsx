import { redirect } from 'next/navigation'
import TopoBackground from './_components/TopoBackground'
import HeroSection from './_components/HeroSection'

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ spot?: string }>
}) {
  const { spot } = await searchParams

  // Phase 7 deep-link compatibility: ?spot=<id> on / belongs to /map
  if (spot) redirect(`/map?spot=${encodeURIComponent(spot)}`)

  return (
    <>
      <TopoBackground />
      <main className="relative">
        <HeroSection />
      </main>
    </>
  )
}
