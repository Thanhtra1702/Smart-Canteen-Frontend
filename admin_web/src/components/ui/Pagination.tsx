import React from 'react';
import { CaretLeftIcon as ChevronLeft, CaretRightIcon as ChevronRight } from '@phosphor-icons/react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1 && !totalItems) return null;

  return (
    <div
      className={`px-4 py-3 border-t border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted ${className}`}
    >
      <div className="tabular-nums">
        {totalItems !== undefined ? (
          <span>
            Tổng <strong className="font-semibold text-foreground">{totalItems}</strong> bản ghi
            {pageSize ? ` • Trang ${currentPage}/${Math.max(1, totalPages)}` : ''}
          </span>
        ) : (
          <span>
            Trang <strong className="font-semibold text-foreground">{currentPage}</strong> /{' '}
            {Math.max(1, totalPages)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          icon={ChevronLeft}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Trước
        </Button>
        <span className="px-2.5 py-1 rounded-md bg-secondary/70 text-foreground font-medium tabular-nums">
          {currentPage} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Sau
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};
