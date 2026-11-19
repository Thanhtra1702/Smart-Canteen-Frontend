import React from 'react';

export interface LoadingStateProps {
  message?: string;
  variant?: 'spinner' | 'skeleton';
  rows?: number;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Đang tải dữ liệu...',
  variant = 'spinner',
  rows = 4,
  className = '',
}) => {
  if (variant === 'skeleton') {
    return (
      <div className={`space-y-3 p-4 ${className}`} aria-busy="true">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="h-10 rounded-lg bg-secondary/80 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`py-20 px-4 text-center flex flex-col items-center justify-center gap-3 ${className}`}
      aria-busy="true"
    >
      <div className="size-8 border-2 border-border-strong border-t-primary rounded-full animate-spin" />
      {message && <span className="text-xs font-medium text-muted">{message}</span>}
    </div>
  );
};
