import React from 'react';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  render: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  loading?: boolean;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  footer?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  loadingMessage = 'Đang tải dữ liệu...',
  emptyTitle = 'Không có dữ liệu',
  emptyDescription,
  emptyAction,
  onRowClick,
  footer,
  className = '',
}: DataTableProps<T>) {
  const alignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  return (
    <div
      className={`bg-surface rounded-xl border border-border shadow-xs overflow-hidden ${className}`}
    >
      {loading ? (
        <LoadingState message={loadingMessage} />
      ) : data.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background/80 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 whitespace-nowrap ${alignClass(col.align)} ${
                      col.headerClassName || ''
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70 text-xs sm:text-[13px]">
              {data.map((row, idx) => (
                <tr
                  key={rowKey(row, idx)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors hover:bg-background/70 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 align-middle ${alignClass(col.align)} ${
                        col.className || ''
                      }`}
                    >
                      {col.render(row, idx)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footer}
    </div>
  );
}
