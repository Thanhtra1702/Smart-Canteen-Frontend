import React from 'react';

export interface FilterBarProps {
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  children,
  right,
  className = '',
}) => {
  return (
    <div
      className={`bg-surface rounded-xl border border-border p-3.5 sm:p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">{children}</div>
      {right && <div className="flex flex-wrap items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
};
