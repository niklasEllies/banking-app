'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import {
  IconMapPinPlus, IconUsers, IconHeart, IconLogin,
  IconChevronLeft, IconChevronRight, IconChevronUp,
  IconX, IconTrash, IconMapPin, IconCamera, IconPencil,
} from '@tabler/icons-react'
import type { Spot } from '@/components/SpotMap'
import { deleteSpot } from '@/actions/spots'
import { spotDisplayName, distanceTo, distMeters } from '@/lib/spot-utils'
import { SPOT_TYPE_MAP } from '@/lib/spot-types'
import SpotDetail from '@/components/SpotDetail'
import FavoriteToggle from '@/components/FavoriteToggle'
import SpotActionMenu from '@/components/SpotActionMenu'
import SpotShareButton from '@/components/SpotShareButton'
import EmptyState from '@/components/EmptyState'
import { useSheetSwipe } from '@/components/useSheetSwipe'

type GpsState = 'unknown' | 'available' | 'denied' | 'unavailable'
type ViewMode = 'all' | 'mine' | 'friends' | 'favorites'
const VIEW_MODE_KEY = 'plaetzchen-view-mode'

interface BottomSheetProps {
  spots: Spot[]
  userId: string | null
  onExpandedChange: (expanded: boolean) => void
  selectedSpotId: string | null
  onSpotSelect: (spotId: string) => void
  onSpotDeselect: () => void
  onFlyToSpot: (spot: Spot) => void
  userPosition: { lat: number; lng: number } | null
  gpsState?: GpsState
  favoriteIds?: Set<string>
  onFavoriteChange?: (spotId: string, isFav: boolean) => void
  friendIds?: Set<string>
}

export default function BottomSheet({
  spots: initialSpots,
  userId,
  onExpandedChange,
  selectedSpotId,
  onSpotSelect,
  onSpotDeselect,
  onFlyToSpot,
  userPosition,
  gpsState = 'unknown',
  favoriteIds = new Set<string>(),
  onFavoriteChange = () => {},
  friendIds = new Set<string>(),
}: BottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [spots, setSpots] = useState(initialSpots)
  const [isPending, startTransition] = useTransition()
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const count = spots.length

  const selectedSpot = spots.find((s) => s.id === selectedSpotId) ?? null

  useEffect(() => {
    if (selectedSpotId) {
      setIsExpanded(true)
      onExpandedChange(true)
    }
  }, [selectedSpotId, onExpandedChange])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(VIEW_MODE_KEY)
    if (stored === 'all' || stored === 'mine' || stored === 'friends' || stored === 'favorites') {
      setViewMode(stored)
    }
  }, [])

  const handleViewModeChange = (m: ViewMode) => {
    setViewMode(m)
    if (typeof window !== 'undefined') localStorage.setItem(VIEW_MODE_KEY, m)
  }

  const filtered = spots.filter((s) => {
    if (viewMode === 'all') return true
    if (viewMode === 'mine') return s.created_by === userId
    if (viewMode === 'friends') return s.created_by !== null && friendIds.has(s.created_by)
    return favoriteIds.has(s.id)
  })

  const sorted =
    userPosition && gpsState === 'available'
      ? [...filtered].sort(
          (a, b) =>
            distMeters(userPosition, { lat: a.lat, lng: a.lng }) -
            distMeters(userPosition, { lat: b.lat, lng: b.lng }),
        )
      : [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at))

  const expand = () => { setIsExpanded(true); onExpandedChange(true) }
  const collapse = () => {
    setIsExpanded(false)
    onExpandedChange(false)
    onSpotDeselect()
  }

  const { dragY, handleProps, contentProps } = useSheetSwipe({
    onDismiss: collapse,
    enabled: isExpanded,
  })

  const handleDelete = (id: string) => {
    setSpots((prev) => prev.filter((s) => s.id !== id))
    startTransition(async () => {
      const result = await deleteSpot(id)
      if (result.error) setSpots(initialSpots)
    })
  }

  if (!isExpanded) {
    return (
      <button
        onClick={expand}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-1000 bg-white dark:bg-[#1e231a] rounded-full px-4 py-2 shadow-md text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#2a2f24] hover:bg-gray-50 dark:hover:bg-[#262b1f] hover:border-gray-300 dark:hover:border-[#3a4030] transition-colors"
      >
        {count} Plätzchen <IconChevronUp size={14} aria-hidden />
      </button>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={selectedSpotId ? 'Plätzchen-Details' : 'Plätzchen-Liste'}
      className="absolute bottom-0 left-0 right-0 z-1000 bg-white dark:bg-[#1e231a] rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] overflow-hidden"
      style={{
        height: '55vh',
        transform: `translateY(${dragY}px)`,
        transition: dragY === 0 ? 'transform 0.25s ease' : 'none',
      }}
    >
      {/* Header (drag handle area — always swipes) */}
      <div
        className="flex items-center justify-between px-5 pt-3 pb-2 cursor-grab select-none"
        {...handleProps}
      >
        <div className="absolute left-1/2 -translate-x-1/2 top-3 w-10 h-1 bg-gray-400 dark:bg-gray-500 rounded-full" />
        {selectedSpotId ? (
          <button onClick={onSpotDeselect} className="text-sm text-primary mt-2 hover:text-primary-dark hover:underline transition-colors">
            <IconChevronLeft size={16} aria-hidden /> Alle Plätzchen
          </button>
        ) : (
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-2">
            {sorted.length} Plätzchen
          </p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {selectedSpot && <SpotShareButton spotId={selectedSpot.id} />}
          {userId && selectedSpot && (
            <FavoriteToggle
              spotId={selectedSpot.id}
              isFavorite={favoriteIds.has(selectedSpot.id)}
              onChange={onFavoriteChange}
            />
          )}
          {selectedSpot && userId === selectedSpot.created_by && (
            <SpotActionMenu
              items={[
                { Icon: IconCamera, label: 'Foto bearbeiten', href: `/spots/${selectedSpot.id}/edit-photo` },
                { Icon: IconPencil, label: 'Spot bearbeiten', href: `/spots/${selectedSpot.id}/edit` },
              ]}
            />
          )}
          <button
            onClick={collapse}
            className="min-w-11 min-h-11 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
            aria-label="Schließen"
          >
            <IconX size={18} aria-hidden />
          </button>
        </div>
      </div>

      {/* Tab bar (list view only) */}
      {!selectedSpotId && (
        <div className="flex border-b border-gray-100 dark:border-[#2a2f24]">
          {(['all', 'mine', 'friends', 'favorites'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleViewModeChange(m)}
              role="tab"
              aria-selected={viewMode === m}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                viewMode === m
                  ? 'text-primary border-primary'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {m === 'all' ? 'Alle' : m === 'mine' ? 'Eigene' : m === 'friends' ? 'Freunde' : 'Favoriten'}
            </button>
          ))}
        </div>
      )}

      {/* Content (scroll-aware: only swipes when scrolled to top) */}
      <div
        className="overflow-y-auto pb-8"
        style={{ height: !selectedSpotId ? 'calc(55vh - 56px - 36px)' : 'calc(55vh - 56px)' }}
        {...contentProps}
      >
        {selectedSpot ? (
          <SpotDetail spot={selectedSpot} userId={userId} />
        ) : (viewMode === 'mine' || viewMode === 'friends' || viewMode === 'favorites') && !userId ? (
          <EmptyState
            Icon={IconLogin}
            title="Login erforderlich"
            body={`Logge dich ein, um ${viewMode === 'mine' ? 'deine eigenen Plätzchen' : viewMode === 'friends' ? 'Plätzchen von Freunden' : 'deine Favoriten'} zu sehen.`}
            action={
              <Link href="/login" className="inline-flex items-center gap-1 text-primary font-medium hover:underline">
                Login <IconChevronRight size={14} aria-hidden />
              </Link>
            }
          />
        ) : sorted.length === 0 ? (
          viewMode === 'mine' ? (
            <EmptyState
              Icon={IconMapPinPlus}
              title="Noch keine eigenen Plätzchen"
              body={<>Tippe auf <strong className="text-primary">+</strong> unten rechts, um dein erstes einzutragen.</>}
            />
          ) : viewMode === 'friends' ? (
            <EmptyState
              Icon={IconUsers}
              title="Keine Plätzchen von Freunden"
              body={
                <>
                  Sobald deine Freunde Spots eintragen, erscheinen sie hier.{' '}
                  <Link href="/friends" className="inline-flex items-center gap-1 text-primary font-medium hover:underline">
                    Freunde verwalten <IconChevronRight size={14} aria-hidden />
                  </Link>
                </>
              }
            />
          ) : viewMode === 'favorites' ? (
            <EmptyState
              Icon={IconHeart}
              title="Noch keine Favoriten"
              body="Tippe in der Detail-Ansicht auf das Herz, um einen Spot hier zu speichern."
            />
          ) : (
            <EmptyState
              Icon={IconMapPinPlus}
              title="Noch keine Plätzchen hier"
              body={
                userId ? (
                  <>Tippe auf <strong className="text-primary">+</strong> unten rechts, um dein erstes einzutragen.</>
                ) : (
                  <>
                    <Link href="/signup" className="text-primary font-medium hover:underline">
                      Trag dich in die Beta ein
                    </Link>
                    {' '}und werde der erste, der hier ein Plätzchen einträgt.
                  </>
                )
              }
            />
          )
        ) : (
          <>
            {gpsState !== 'available' && gpsState !== 'unknown' && (
              <div className="px-5 py-2 text-xs italic text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#2a2f24] flex items-center gap-1">
                <IconMapPin size={12} aria-hidden /> Standort aus — Distanzen werden nicht angezeigt
              </div>
            )}
            <ul>
              {sorted.map((spot) => {
                const SpotIcon = SPOT_TYPE_MAP[spot.type].Icon
                return (
                <li
                  key={spot.id}
                  className="flex items-center gap-3 px-5 py-3 border-t border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1f14] active:bg-gray-100 dark:active:bg-[#161a10]"
                  onClick={() => {
                    onFlyToSpot(spot)
                    onSpotSelect(spot.id)
                  }}
                >
                  <span className="shrink-0 text-gray-500 dark:text-gray-400">
                    <SpotIcon size={20} aria-hidden />
                  </span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate flex-1">
                    {spotDisplayName(spot.name, spot.created_at, spot.type)}
                  </span>
                  {userPosition && gpsState === 'available' && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mr-1">
                      {distanceTo(userPosition, { lat: spot.lat, lng: spot.lng })}
                    </span>
                  )}
                  {userId && spot.created_by === userId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(spot.id) }}
                      disabled={isPending}
                      className="shrink-0 min-w-11 min-h-11 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                      aria-label="Plätzchen löschen"
                    >
                      <IconTrash size={16} aria-hidden />
                    </button>
                  )}
                </li>
              )})}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
