import React from 'react';
import { TrayIcon as Inbox } from '@phosphor-icons/react';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`py-14 px-6 text-center flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div className="size-12 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted">
        <Icon className="size-5" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
};
