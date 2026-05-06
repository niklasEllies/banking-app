export default function LandingLoading() {
  return (
    <div className="relative min-h-screen bg-[#1d2218] text-[#e6e3d3] overflow-x-hidden">
      <main className="relative px-6 lg:px-12 py-16 lg:py-20">
        <section className="min-h-screen grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="flex flex-col justify-between gap-12">
            <div className="font-mono text-[11px] tracking-[0.16em] uppercase text-[#8aa376]">
              <span className="text-[#5e9e3e]">◆</span> 50.94° N · BETA · FRÜHJAHR 26
            </div>
            <div className="flex flex-col gap-6">
              <div className="h-[64px] lg:h-[88px] w-3/4 bg-[#2a3124] rounded animate-pulse" />
              <div className="h-6 w-2/3 bg-[#2a3124]/70 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-[#2a3124]/50 rounded animate-pulse" />
              <div className="flex gap-3 pt-2">
                <div className="h-11 w-32 bg-[#2a3124] rounded-md animate-pulse" />
                <div className="h-11 w-32 bg-[#2a3124]/60 rounded-md animate-pulse" />
              </div>
            </div>
          </div>
          <div className="relative min-h-[360px] lg:min-h-0 rounded-xl bg-[#2a2f1f] animate-pulse" />
        </section>
      </main>
    </div>
  )
}
