import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

/* ── KPI Card ─────────────────────────────────────────── */
export function KPICard({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'brand',
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  color?: 'brand' | 'profit' | 'warning' | 'loss' | 'info';
}) {
  const accentMap = {
    brand: 'from-brand-500/20 to-brand-700/5 border-brand-500/20',
    profit: 'from-profit/20 to-profit/5 border-profit/20',
    warning: 'from-warning/20 to-warning/5 border-warning/20',
    loss: 'from-loss/20 to-loss/5 border-loss/20',
    info: 'from-info/20 to-info/5 border-info/20',
  };

  return (
    <div
      className={`glass-card p-5 animate-fade-in bg-gradient-to-br ${accentMap[color]}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-dim)]">
          {label}
        </span>
        {Icon && (
          <div className="p-2 rounded-lg bg-[var(--color-surface-3)]">
            <Icon size={16} className="text-brand-400" />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      {subtitle && (
        <p className="text-xs text-[var(--color-text-dim)] mt-1">{subtitle}</p>
      )}
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <span
            className={`text-xs font-medium ${
              trend.value >= 0 ? 'text-profit' : 'text-loss'
            }`}
          >
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
          </span>
          <span className="text-xs text-[var(--color-text-dim)]">{trend.label}</span>
        </div>
      )}
    </div>
  );
}

/* ── Chart Card ───────────────────────────────────────── */
export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-card p-5 animate-fade-in ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && (
            <p className="text-xs text-[var(--color-text-dim)] mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ── Section heading ──────────────────────────────────── */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ── Loading skeleton ─────────────────────────────────── */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/* ── Badge ────────────────────────────────────────────── */
export function Badge({
  children,
  variant = 'default',
}: {
  children: ReactNode;
  variant?: 'default' | 'star' | 'puzzle' | 'plowhorse' | 'dog' | 'success' | 'warning' | 'danger';
}) {
  const styles: Record<string, string> = {
    default: 'bg-brand-500/15 text-brand-400',
    star: 'bg-star/15 text-star',
    puzzle: 'bg-puzzle/15 text-puzzle',
    plowhorse: 'bg-plowhorse/15 text-plowhorse',
    dog: 'bg-dog/15 text-dog',
    success: 'bg-profit/15 text-profit',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-loss/15 text-loss',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

/* ── Button ───────────────────────────────────────────── */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
  className = '',
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20',
    secondary: 'bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] border border-[var(--color-border)]',
    ghost: 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]',
    danger: 'bg-loss/10 hover:bg-loss/20 text-loss border border-loss/20',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}
