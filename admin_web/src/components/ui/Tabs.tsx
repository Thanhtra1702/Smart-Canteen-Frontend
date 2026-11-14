import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  className?: string;
}

export function Tabs<T extends string = string>({
  items,
  activeTab,
  onChange,
  className = '',
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-1 bg-secondary/80 p-1 rounded-xl text-xs font-medium border border-border ${className}`}
    >
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={`px-3.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer outline-hidden flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary/30 ${
              isActive
                ? 'bg-surface text-primary font-semibold shadow-1'
                : 'text-muted hover:text-foreground hover:bg-surface/50'
            }`}
          >
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-muted'
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
