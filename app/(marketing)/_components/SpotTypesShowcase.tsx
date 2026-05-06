import { SPOT_TYPES } from '@/lib/spot-types'
import { getSpotCounts } from '@/lib/marketing-stats'
import SectionMeta from './SectionMeta'

export default async function SpotTypesShowcase() {
  const counts = await getSpotCounts()

  return (
    <section className="relative px-6 lg:px-12 py-16 lg:py-24">
      <div className="flex flex-col gap-2 mb-10">
        <SectionMeta number="02" label="Sechs Typen" />
        <h2 className="font-bold uppercase text-3xl lg:text-5xl tracking-tight max-w-3xl">
          Was zählt als <span className="font-[var(--font-display)] font-light italic text-[#5e9e3e] normal-case">Plätzchen?</span>
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SPOT_TYPES.map((t) => (
          <div
            key={t.key}
            className="rounded-lg border border-[#5e9e3e]/22 bg-[#5e9e3e]/[0.06] px-3 py-5 text-center flex flex-col items-center"
          >
            <t.Icon size={32} stroke={1.5} className="mb-2 text-[#8aa376]" aria-hidden />
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#c8c8c0]">{t.label}</div>
            <div className="font-mono text-[10px] text-[#5e9e3e] mt-1">{counts[t.key] ?? 0}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
