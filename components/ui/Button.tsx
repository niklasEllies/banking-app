import type { ButtonHTMLAttributes, ComponentType } from 'react'
import type { IconProps } from '@tabler/icons-react'

export type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger'
export type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  Icon?: ComponentType<IconProps>
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  ghost: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
  outline:
    'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1e231a]',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

// Both sizes use text-sm — the difference is only vertical padding (md = slightly larger tap-target).
const SIZES: Record<ButtonSize, string> = {
  sm: 'py-2 text-sm',
  md: 'py-2.5 text-sm',
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#141810]'

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  Icon,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  // ghost = pure text-link look, no padding-x or background box
  const padX = variant === 'ghost' ? '' : 'px-4'
  const width = fullWidth ? 'w-full' : ''
  const cls = [BASE, VARIANTS[variant], SIZES[size], padX, width, className]
    .filter(Boolean)
    .join(' ')

  return (
    <button {...rest} disabled={disabled || loading} className={cls}>
      {Icon && <Icon size={16} stroke={2} aria-hidden />}
      {children}
    </button>
  )
}
