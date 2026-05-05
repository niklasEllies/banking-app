import { getLivingNumbers, getRecentActivity } from '@/lib/marketing-stats'
import LivingNumbersClient from './LivingNumbersClient'
import ActivityTicker from './ActivityTicker'
import SectionMeta from './SectionMeta'

export default async function LivingNumbersSection() {
  const [numbers, activity] = await Promise.all([
    getLivingNumbers(),
    getRecentActivity(3),
  ])

  return (
    <section className="relative px-6 lg:px-12 py-16 lg:py-24">
      <div className="mb-8">
        <SectionMeta number="03" label="Aktuell" live />
      </div>
      <LivingNumbersClient initial={numbers} />
      <ActivityTicker initialEvents={activity} />
    </section>
  )
}
