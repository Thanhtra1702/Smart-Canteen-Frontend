import React from 'react';
import { ArrowRightIcon as ArrowRight } from '@phosphor-icons/react';

export type StatCardTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: StatCardTone;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const toneIconMap: Record<StatCardTone, string> = {
  brand: 'bg-primary-light text-primary border-primary/15',
  success: 'bg-emerald-50 text-[#16A34A] border-emerald-200/70',
  warning: 'bg-amber-50 text-[#D97706] border-amber-200/70',
  danger: 'bg-rose-50 text-[#DC2626] border-rose-200/70',
  neutral: 'bg-slate-100 text-muted border-border',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  icon: Icon,
  tone = 'brand',
  footerLeft,
  footerRight,
  onClick,
  className = '',
}) => {
  const interactive = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`bg-surface rounded-xl border border-border p-5 flex flex-col justify-between shadow-xs transition-all duration-150 ${
        interactive
          ? 'cursor-pointer hover:border-border-strong hover:shadow-1 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30'
          : ''
      } ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted truncate">{label}</span>
          {Icon && (
            <div
              className={`size-8 rounded-lg border flex items-center justify-center shrink-0 ${toneIconMap[tone]}`}
            >
              <Icon className="size-4" />
            </div>
          )}
        </div>
        <div className="text-2xl sm:text-[26px] font-semibold tabular-nums text-foreground mt-2.5 tracking-tight leading-tight">
          {value}
          {unit && <span className="text-xs font-normal text-muted ml-1.5">{unit}</span>}
        </div>
      </div>

      {(footerLeft || footerRight || interactive) && (
        <div className="text-xs text-muted mt-3.5 pt-2.5 border-t border-border/70 flex items-center justify-between gap-2">
          <div className="min-w-0 truncate">{footerLeft}</div>
          <div className="shrink-0 flex items-center gap-1">
            {footerRight}
            {interactive && !footerRight && (
              <ArrowRight className="size-3.5 text-muted group-hover:text-primary transition-colors" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
