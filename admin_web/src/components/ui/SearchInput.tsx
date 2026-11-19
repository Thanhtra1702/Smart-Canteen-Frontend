import React from 'react';
import { MagnifyingGlassIcon as Search, XIcon as X } from '@phosphor-icons/react';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  containerClassName?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Tìm kiếm...',
  containerClassName = '',
  className = '',
  ...props
}) => {
  return (
    <div className={`relative w-full ${containerClassName}`}>
      <Search className="size-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        {...props}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-9 pl-9 pr-8 bg-surface border border-border rounded-lg text-xs sm:text-sm text-foreground placeholder:text-muted-light focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/15 shadow-xs transition-all ${className}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          aria-label="Xóa từ khóa tìm kiếm"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted hover:text-foreground rounded transition-colors cursor-pointer"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
};
