import Link from 'next/link'
import { IconChevronLeft } from '@tabler/icons-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref: string
  backLabel: string
}

export default function PageHeader({ title, subtitle, backHref, backLabel }: PageHeaderProps) {
  return (
    <>
      <Link
        href={backHref}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center gap-1 mb-6"
      >
        <IconChevronLeft size={16} aria-hidden /> {backLabel}
      </Link>
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h1>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{subtitle}</p>
      )}
    </>
  )
}
