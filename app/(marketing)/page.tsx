import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SITE_URL, SITE_NAME } from '@/lib/site'
import TopoBackground from './_components/TopoBackground'
import HeroSection from './_components/HeroSection'
import SpotTypesShowcase from './_components/SpotTypesShowcase'
import LivingNumbersSection from './_components/LivingNumbersSection'
import HowItWorks from './_components/HowItWorks'
import BetaCtaSection from './_components/BetaCtaSection'
import MarketingFooter from './_components/MarketingFooter'
import RevealSection from './_components/RevealSection'

const TITLE = `${SITE_NAME} — Eine Karte für Orte, die nirgendwo stehen`
const DESCRIPTION =
  'Sammle Bänke, Aussichtspunkte, Schutzhütten, Liegewiesen — die Plätze, die Google nicht kennt. Plätzchen ist eine kleine Karte für die nicht-touristischen Orte beim Spazieren und Wandern.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'de_DE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

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
