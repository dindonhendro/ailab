import clsx from 'clsx'

import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const paddings = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' }

export function Card({ children, className, padding = 'md', ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-gray-200 shadow-card',
        paddings[padding],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

interface BadgeProps {
  children: React.ReactNode
  variant?: 'normal' | 'high' | 'low' | 'critical' | 'info' | 'draft' | 'submitted'
  className?: string
}

const badgeVariants: Record<string, string> = {
  normal:    'bg-emerald-100 text-emerald-700',
  high:      'bg-amber-100 text-amber-700',
  low:       'bg-blue-100 text-blue-700',
  critical:  'bg-red-100 text-red-700',
  info:      'bg-sky-100 text-sky-700',
  draft:     'bg-gray-100 text-gray-600',
  submitted: 'bg-green-100 text-green-700',
}

export function Badge({ children, variant = 'info', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        badgeVariants[variant] ?? badgeVariants.info,
        className
      )}
    >
      {children}
    </span>
  )
}

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-8 h-8 border-3' }
  return (
    <span
      className={clsx(
        'inline-block rounded-full border-primary-600 border-t-transparent animate-spin',
        s[size],
        className
      )}
    />
  )
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-3 text-gray-300">{icon}</div>}
      <p className="text-sm font-semibold text-gray-600">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>}
    </div>
  )
}
