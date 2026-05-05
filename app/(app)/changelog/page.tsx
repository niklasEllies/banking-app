import Link from 'next/link'
import { loadChangelog } from '@/lib/changelog'

export const metadata = {
  title: 'Was ist neu — Plätzchen',
}

export default async function ChangelogPage() {
  const entries = await loadChangelog()

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-md mx-auto px-4 py-8">
        <Link
          href="/"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 mb-6"
        >
          ← Zurück zur Karte
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Was ist neu</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Die größten Änderungen an Plätzchen — Neueste zuerst.
        </p>

        <div className="space-y-6">
          {entries.map((entry) => (
            <article
              key={entry.version}
              className="bg-white dark:bg-[#1e231a] border border-gray-200 dark:border-[#2a2f24] rounded-xl p-4"
            >
              <header className="mb-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  <span className="text-primary mr-2">{entry.version}</span>
                  {entry.title}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{entry.date}</p>
              </header>
              <ul className="space-y-1.5">
                {entry.bullets.map((b, i) => (
                  <li key={i} className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                    {b}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
