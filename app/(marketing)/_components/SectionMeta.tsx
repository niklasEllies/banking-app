export default function SectionMeta({ number, label, live = false }: { number?: string; label: string; live?: boolean }) {
  return (
    <div className="font-mono text-[11px] tracking-[0.16em] uppercase text-[#8aa376] flex items-center gap-2">
      <span className="text-[#5e9e3e]">◆</span>
      {live && <><span className="font-bold">LIVE</span><span>·</span></>}
      {number && <><span>{number}</span><span>·</span></>}
      <span>{label}</span>
      {live && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[#5e9e3e] animate-pulse" />}
    </div>
  )
}
