import type { ReactNode } from 'react'
import type { IconProps } from '@tabler/icons-react'

type IconComponent = React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>

interface EmptyStateProps {
  Icon: IconComponent
  title: string
  body?: ReactNode
  action?: ReactNode
  /** Compact = smaller padding for in-list use; Default = generous, full-section feel. */
  compact?: boolean
}

export default function EmptyState({ Icon, title, body, action, compact = false }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center text-center ${
        compact ? 'py-8 px-4 gap-2' : 'py-12 px-6 gap-3'
      }`}
    >
      <Icon
        size={compact ? 36 : 48}
        stroke={1.4}
        className="text-gray-400 dark:text-gray-500"
        aria-hidden
      />
      <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</p>
      {body && <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">{body}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
