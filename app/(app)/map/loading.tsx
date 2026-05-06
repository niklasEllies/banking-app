export default function MapLoading() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#2a2f1f]">
      {/* Header skeleton (matches MapHeader position/shape) */}
      <div className="absolute top-3 left-3 right-3 z-1000 h-12 bg-white/95 dark:bg-[#141810]/95 backdrop-blur-sm rounded-2xl shadow-md flex items-center justify-between px-4">
        <div className="h-4 w-24 bg-gray-200 dark:bg-[#2a3124] rounded animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 bg-gray-200 dark:bg-[#2a3124] rounded animate-pulse" />
          <div className="h-4 w-12 bg-gray-200 dark:bg-[#2a3124] rounded animate-pulse" />
        </div>
      </div>

      {/* Center loading-shimmer over the map area */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-sm font-mono text-[#8aa376] tracking-wider uppercase animate-pulse">
          Karte wird geladen…
        </div>
      </div>

      {/* Bottom-sheet collapsed-pill placeholder */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-1000 h-9 w-32 bg-white dark:bg-[#1e231a] rounded-full shadow-md border border-gray-200 dark:border-[#2a2f24] animate-pulse" />
    </div>
  )
}
