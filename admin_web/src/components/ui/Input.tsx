import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = '', id, ...props }, ref) => {
    const renderIcon = () => {
      if (!icon) return null;
      if (React.isValidElement(icon)) {
        return (
          <div className="absolute inset-y-0 left-3 my-auto size-4 text-muted flex items-center justify-center pointer-events-none">
            {icon}
          </div>
        );
      }
      const IconComp = icon as React.ComponentType<{ className?: string }>;
      return (
        <div className="absolute inset-y-0 left-3 my-auto size-4 text-muted flex items-center justify-center pointer-events-none">
          <IconComp className="size-4" />
        </div>
      );
    };

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label htmlFor={id} className="w-fit cursor-pointer text-xs font-medium text-foreground-subtle block">
            {label}
          </label>
        )}
        <div className="relative">
          {renderIcon()}
          <input
            {...props}
            id={id}
            ref={ref}
            className={`w-full h-9.5 bg-surface border rounded-lg text-xs sm:text-sm transition-all duration-150 text-foreground placeholder:text-muted/60 outline-hidden ${
              icon ? 'pl-9 pr-3.5' : 'px-3.5'
            } ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
                : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/15 shadow-xs'
            } ${className}`}
          />
        </div>
        {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        {hint && !error && <p className="text-[11px] text-muted mt-1">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
