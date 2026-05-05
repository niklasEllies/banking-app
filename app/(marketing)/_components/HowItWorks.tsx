import SectionMeta from './SectionMeta'

const STEPS = [
  { num: '01', title: 'Pin setzen', body: 'Ort gefunden? GPS macht den Rest.' },
  { num: '02', title: 'Bewerten', body: 'Komfort, Aussicht, Schatten zur Tageszeit, Foto dazu.' },
  { num: '03', title: 'Teilen', body: 'Öffentlich, nur Freunde, oder privat. Du entscheidest.' },
] as const

export default function HowItWorks() {
  return (
    <section className="relative px-6 lg:px-12 py-16 lg:py-24">
      <div className="flex flex-col gap-2 mb-10">
        <SectionMeta number="04" label="So geht's" />
        <h2 className="font-bold uppercase text-3xl lg:text-5xl tracking-tight max-w-3xl">
          Eintragen, bewerten,{' '}
          <span className="font-[var(--font-display)] font-light italic text-[#5e9e3e] normal-case">teilen.</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {STEPS.map((s) => (
          <div key={s.num} className="flex flex-col gap-3">
            <div className="font-mono text-2xl text-[#5e9e3e] tabular-nums">{s.num}</div>
            <div className="font-bold text-xl uppercase tracking-tight text-white">{s.title}</div>
            <div className="text-[#c8c8c0] leading-relaxed">{s.body}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
