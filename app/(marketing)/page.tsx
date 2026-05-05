import { redirect } from 'next/navigation'
import TopoBackground from './_components/TopoBackground'
import HeroSection from './_components/HeroSection'
import SpotTypesShowcase from './_components/SpotTypesShowcase'
import LivingNumbersSection from './_components/LivingNumbersSection'
import HowItWorks from './_components/HowItWorks'
import BetaCtaSection from './_components/BetaCtaSection'
import MarketingFooter from './_components/MarketingFooter'
import RevealSection from './_components/RevealSection'

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
        <RevealSection><SpotTypesShowcase /></RevealSection>
        <RevealSection><LivingNumbersSection /></RevealSection>
        <RevealSection><HowItWorks /></RevealSection>
        <RevealSection><BetaCtaSection /></RevealSection>
      </main>
      <MarketingFooter />
    </>
  )
}
