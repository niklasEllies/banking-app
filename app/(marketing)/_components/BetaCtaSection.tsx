import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SectionMeta from './SectionMeta'

export default async function BetaCtaSection() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <section className="relative px-6 lg:px-12 py-20 lg:py-28 text-center max-w-3xl mx-auto">
      <div className="mb-8 flex justify-center">
        <SectionMeta number="05" label="Beta" />
      </div>
      <h2 className="font-bold uppercase text-3xl lg:text-5xl tracking-tight">
        Wir sind in der Beta.{' '}
        <span className="font-[var(--font-display)] font-light italic text-[#5e9e3e] normal-case">Du gestaltest mit.</span>
      </h2>
      <p className="text-[#c8c8c0] text-lg mt-4 leading-relaxed">
        Feedback fließt direkt rein. Was hier wackelt, wird nächste Woche stabiler.
      </p>
      <div className="mt-10 flex flex-col items-center gap-3">
        <Link
          href={user ? '/map' : '/signup'}
          className="bg-[#5e9e3e] text-[#14180f] px-7 py-4 rounded-md text-base font-bold uppercase tracking-wider hover:bg-[#6cb046] transition-colors"
        >
          {user ? 'Zur Karte' : 'Beta beitreten'}
        </Link>
        {!user && (
          <Link href="/map" className="text-[#8aa376] text-sm underline-offset-4 hover:underline">
            oder erst die Karte ansehen
          </Link>
        )}
      </div>
    </section>
  )
}
