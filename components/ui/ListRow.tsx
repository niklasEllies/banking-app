import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { IconChevronRight, type IconProps } from '@tabler/icons-react'

type IconComponent = ComponentType<IconProps>

interface BaseProps {
  Icon?: IconComponent
  label: ReactNode
  /** Right-side slot. Defaults to a chevron. Pass `null` to suppress. */
  rightSlot?: ReactNode
  /** Tone — controls text + border color. */
  tone?: 'neutral' | 'danger'
}

interface AsLinkProps extends BaseProps {
  href: string
  onClick?: never
  type?: never
}

interface AsButtonProps extends BaseProps {
  href?: never
  onClick?: () => void
  type?: 'button' | 'submit'
}

type ListRowProps = AsLinkProps | AsButtonProps

const TONES = {
  neutral: {
    text: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
    border: 'border-gray-200 dark:border-gray-700',
    bg: 'hover:bg-gray-50 dark:hover:bg-[#1e231a]',
    chevron: 'text-gray-300 dark:text-gray-600',
  },
  danger: {
    text: 'text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300',
    border: 'border-red-200 dark:border-red-900/50',
    bg: 'hover:bg-red-50 dark:hover:bg-red-950/30',
    chevron: 'text-red-300 dark:text-red-700',
  },
} as const

export default function ListRow(props: ListRowProps) {
  const { Icon, label, rightSlot, tone = 'neutral' } = props
  const t = TONES[tone]
  const cls = `flex items-center justify-between gap-2 w-full text-sm ${t.text} py-2.5 px-4 rounded-lg border ${t.border} ${t.bg} transition-colors`

  const right = rightSlot === undefined
    ? <IconChevronRight size={16} className={t.chevron} aria-hidden />
    : rightSlot

  const inner = (
    <>
      <span className="flex items-center gap-2">
        {Icon && <Icon size={18} stroke={1.5} aria-hidden />}
        <span>{label}</span>
      </span>
      {right}
    </>
  )

  if ('href' in props && props.href) {
    return <Link href={props.href} className={cls}>{inner}</Link>
  }
  return (
    <button type={props.type ?? 'button'} onClick={props.onClick} className={cls}>
      {inner}
    </button>
  )
}
