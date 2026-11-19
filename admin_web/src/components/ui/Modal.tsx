import React, { useEffect } from 'react';
import { XIcon as X } from '@phosphor-icons/react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  size?: ModalSize;
  footer?: React.ReactNode;
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'lg',
  footer,
  children,
  closeOnBackdrop = true,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      onClick={() => closeOnBackdrop && onClose()}
    >
      <div
        className={`bg-surface rounded-xl border border-border shadow-modal w-full ${sizeClasses[size]} overflow-hidden flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 bg-surface shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="size-9 rounded-lg bg-primary-light text-primary border border-primary/15 flex items-center justify-center shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 className="text-sm sm:text-base font-semibold text-foreground leading-tight truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-muted mt-0.5 truncate">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hộp thoại"
              className="p-1.5 text-muted hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-5">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-border bg-background/60 flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
