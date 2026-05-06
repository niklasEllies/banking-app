import { SPOT_TYPES } from '@/lib/spot-types'
import { SPOT_VISIBILITIES } from '@/lib/spot-visibility'
import type { AdminStats } from '@/lib/admin-data'
import { IconWorld, IconUsers as IconFriendsVis, IconLock } from '@tabler/icons-react'

const VIS_ICONS = {
  public: IconWorld,
  friends: IconFriendsVis,
  private: IconLock,
} as const

export default function AdminStatsCard({ stats }: { stats: AdminStats }) {
  const maxType = Math.max(...Object.values(stats.byType), 1)

  return (
    <div className="bg-white dark:bg-[#1e231a] rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="User" value={stats.totalUsers} delta={stats.usersThisWeek} />
        <Stat label="Plätzchen" value={stats.totalSpots} delta={stats.spotsThisWeek} />
        <Stat label="Tipps" value={stats.totalDescriptions} />
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
          Sichtbarkeit
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SPOT_VISIBILITIES.map((v) => {
            const VisIcon = VIS_ICONS[v.key]
            return (
              <div
                key={v.key}
                className="bg-gray-50 dark:bg-[#141810] rounded-lg px-2 py-2 flex items-center gap-2"
              >
                <VisIcon size={16} stroke={1.5} className="shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />
                <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate">{v.label}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                  {stats.byVisibility[v.key]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
          Verteilung nach Typ
        </p>
        <div className="space-y-1.5">
          {SPOT_TYPES.map((t) => {
            const count = stats.byType[t.key]
            const pct = (count / maxType) * 100
            const TypeIcon = t.Icon
            return (
              <div key={t.key} className="flex items-center gap-2">
                <TypeIcon size={14} stroke={1.5} className="shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />
                <span className="text-xs text-gray-600 dark:text-gray-300 w-24 shrink-0 truncate">{t.label}</span>
                <div className="relative flex-1 h-2 bg-gray-100 dark:bg-[#141810] rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-8 text-right tabular-nums">
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, delta }: { label: string; value: number; delta?: number }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      {typeof delta === 'number' && (
        <p className="text-[10px] text-primary mt-0.5 tabular-nums">+{delta} diese Woche</p>
      )}
    </div>
  )
}
