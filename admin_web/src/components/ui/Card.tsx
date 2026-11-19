import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  isFlushList?: boolean;
  flush?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  icon,
  isFlushList = false,
  flush = false,
  className = '',
  children,
  ...props
}) => {
  const isFlush = isFlushList || flush;

  return (
    <section
      {...props}
      className={`flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-2xs transition-shadow duration-150 ${
        isFlush ? 'p-0 overflow-hidden' : 'p-5 sm:p-6'
      } ${className}`}
    >
      {(title || action) && (
        <header
          className={`flex items-start justify-between gap-3 ${
            isFlush ? 'p-5 sm:p-6 border-b border-border/70' : 'mb-4'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && <div className="shrink-0 text-muted">{icon}</div>}
            <div className="min-w-0">
              {title && (
                <h2 className="text-sm sm:text-base font-semibold text-foreground tracking-tight truncate">
                  {title}
                </h2>
              )}
              {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
};
