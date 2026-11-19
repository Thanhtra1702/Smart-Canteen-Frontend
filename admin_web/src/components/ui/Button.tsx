import React from 'react';
import { SpinnerGapIcon as Loader2 } from '@phosphor-icons/react';

export type ButtonVariant = 'outline' | 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loading?: boolean;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'outline',
  size = 'md',
  isLoading = false,
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  onClick,
  ...props
}) => {
  const isBusy = isLoading || loading;

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active border border-transparent shadow-xs focus-visible:ring-2 focus-visible:ring-primary/30';
      case 'secondary':
        return 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 active:bg-slate-200 border border-transparent focus-visible:ring-2 focus-visible:ring-primary/20';
      case 'ghost':
        return 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200/70 border border-transparent focus-visible:ring-2 focus-visible:ring-primary/20';
      case 'danger':
        return 'bg-rose-50 text-rose-700 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 focus-visible:ring-2 focus-visible:ring-rose-500/20';
      case 'outline':
      default:
        return 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 shadow-xs focus-visible:ring-2 focus-visible:ring-primary/20';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 px-2.5 text-xs gap-1.5 rounded-xl';
      case 'lg':
        return 'h-10.5 px-4 text-sm gap-2 rounded-xl';
      case 'icon':
        return 'size-9 p-0 rounded-xl justify-center';
      case 'md':
      default:
        return 'h-9 px-3.5 text-xs font-medium gap-1.5 rounded-xl';
    }
  };

  const renderIcon = () => {
    if (isBusy) {
      return <Loader2 className="size-3.5 animate-spin shrink-0" />;
    }
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return <IconComp className="size-3.5 shrink-0" />;
  };

  return (
    <button
      {...props}
      disabled={disabled || isBusy}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer select-none outline-hidden disabled:opacity-50 disabled:cursor-not-allowed ${getVariantClasses()} ${getSizeClasses()} ${className}`}
    >
      {renderIcon()}
      {children && <span className="truncate">{children}</span>}
    </button>
  );
};
