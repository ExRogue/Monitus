import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        {
          'bg-[var(--navy-lighter)] text-[var(--text-secondary)] border border-[var(--border)]': variant === 'default',
          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': variant === 'success',
          'bg-amber-500/10 text-amber-400 border border-amber-500/20': variant === 'warning',
          'bg-red-500/10 text-red-400 border border-red-500/20': variant === 'error',
          'bg-[#4A9E96]/10 text-[#7DC4BD] border border-[#4A9E96]/20': variant === 'purple',
        },
        {
          'text-[11px] px-2 py-0.5': size === 'sm',
          'text-xs px-2.5 py-1': size === 'md',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
