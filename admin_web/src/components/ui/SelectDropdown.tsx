import React, { useEffect, useRef, useState } from 'react';
import { CheckIcon as Check, CaretDownIcon as ChevronDown } from '@phosphor-icons/react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
}

/** Custom rounded select dropdown replacing native OS select popups. */
export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Chọn...',
  icon,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  align = 'left',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full h-9 px-3 bg-white border rounded-xl text-xs flex items-center justify-between gap-2 transition-all cursor-pointer outline-hidden ${
          open
            ? 'border-[#0057b8] ring-2 ring-[#0057b8]/15'
            : 'border-slate-200/90 hover:border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className={`truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
            {selected ? selected.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`size-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180 text-[#0057b8]' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-[80] mt-1.5 min-w-full w-full bg-white rounded-xl border border-slate-200/90 shadow-lg p-1.5 space-y-0.5 max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${menuClassName}`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-lg text-left text-xs flex items-start justify-between gap-2 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#EFF6FF] text-[#0057b8] font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate">{opt.label}</div>
                  {opt.description && (
                    <div
                      className={`text-[11px] truncate mt-0.5 ${
                        isSelected ? 'text-[#0057b8]/75' : 'text-slate-400'
                      }`}
                    >
                      {opt.description}
                    </div>
                  )}
                </div>
                {isSelected && <Check className="size-3.5 text-[#0057b8] shrink-0 mt-0.5" />}
              </button>
            );
          })}

          {options.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400 text-center">Không có lựa chọn</div>
          )}
        </div>
      )}
    </div>
  );
};
