import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral' | 'brand';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  icon,
  dot = false,
  className = '',
  children,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border border-amber-200/60';
      case 'error':
        return 'bg-rose-50 text-rose-700 border border-rose-200/60';
      case 'brand':
        return 'bg-blue-50 text-primary border border-blue-200/60';
      case 'neutral':
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200/70';
    }
  };

  const getDotColor = () => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-500';
      case 'warning':
        return 'bg-amber-500';
      case 'error':
        return 'bg-rose-500';
      case 'brand':
        return 'bg-primary';
      case 'neutral':
      default:
        return 'bg-slate-400';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'md':
        return 'px-2.5 py-0.5 text-xs gap-1.5 rounded-lg';
      case 'sm':
      default:
        return 'px-2 py-0.5 text-[11px] gap-1 rounded-md';
    }
  };

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return <IconComp className="size-3 shrink-0" />;
  };

  return (
    <span
      {...props}
      className={`inline-flex items-center font-medium select-none tabular-nums tracking-tight transition-colors ${getVariantStyles()} ${getSizeStyles()} ${className}`}
    >
      {dot && <span className={`size-1.5 rounded-full shrink-0 ${getDotColor()}`} />}
      {renderIcon()}
      <span>{children}</span>
    </span>
  );
};
