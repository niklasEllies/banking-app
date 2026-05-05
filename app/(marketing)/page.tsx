import { redirect } from 'next/navigation'
import TopoBackground from './_components/TopoBackground'

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
        <section className="min-h-screen flex items-center justify-center">
          <p className="font-mono text-sm text-[#8aa376]">Landing skeleton — sections come in following tasks</p>
        </section>
      </main>
    </>
  )
}
