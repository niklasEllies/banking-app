import Link from 'next/link'

export default function MarketingFooter() {
  return (
    <footer className="relative px-6 lg:px-12 py-10 border-t border-[#e6e3d3]/10 text-sm text-[#8aa376] flex flex-wrap justify-between gap-3">
      <div className="flex flex-col gap-1">
        <div>© {new Date().getFullYear()} Plätzchen · Beta</div>
        <div className="text-[11px] text-[#8aa376]/70">
          Karten-Tiles ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
            OpenStreetMap
          </a>{' '}
          contributors
        </div>
      </div>
      <nav className="flex gap-5">
        <Link href="/changelog" className="hover:text-[#c8c8c0]">Changelog</Link>
        <Link href="/login" className="hover:text-[#c8c8c0]">Login</Link>
      </nav>
    </footer>
  )
}
