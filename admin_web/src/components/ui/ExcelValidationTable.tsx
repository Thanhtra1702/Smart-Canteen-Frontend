import React, { useState, useMemo } from 'react';
import {
  WarningCircleIcon as AlertCircle,
  PlusCircleIcon as PlusCircle,
  ArrowsClockwiseIcon as RefreshCw,
  CaretDownIcon as ChevronDown,
  CaretRightIcon as ChevronRight,
  StackIcon as Layers,
  DownloadSimpleIcon as Download,
} from '@phosphor-icons/react';
import { Button } from './Button';

export interface ExcelValidationTableProps {
  type: 'menu' | 'inventory';
  previewData: {
    totalRows: number;
    validCount: number;
    errorCount: number;
    totalBomDishes?: number;
    totalBomIngredients?: number;
    validRows?: any[];
    errors?: any[];
  } | null;
  allowPartialImport?: boolean;
  onTogglePartialImport?: (val: boolean) => void;
  onExportErrors?: () => void;
}

export const ExcelValidationTable: React.FC<ExcelValidationTableProps> = ({
  type,
  previewData,
  allowPartialImport = true,
  onTogglePartialImport,
  onExportErrors,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'INSERT' | 'UPDATE' | 'INVALID'>('ALL');
  const [expandedRowIds, setExpandedRowIds] = useState<Set<number>>(new Set());

  const validRows = useMemo(() => previewData?.validRows || [], [previewData?.validRows]);
  const errors = useMemo(() => previewData?.errors || [], [previewData?.errors]);

  const stats = useMemo(() => {
    let inserts = 0;
    let updates = 0;
    validRows.forEach((r) => {
      if (r.status === 'INSERT') inserts++;
      else if (r.status === 'UPDATE') updates++;
    });
    return {
      total: validRows.length + errors.length,
      valid: validRows.length,
      inserts,
      updates,
      invalids: errors.length,
    };
  }, [validRows, errors]);

  const toggleExpand = (rowNum: number) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowNum)) next.delete(rowNum);
      else next.add(rowNum);
      return next;
    });
  };

  const filteredValidRows = useMemo(() => {
    if (filterStatus === 'INVALID') return [];
    if (filterStatus === 'INSERT') return validRows.filter((r) => r.status === 'INSERT');
    if (filterStatus === 'UPDATE') return validRows.filter((r) => r.status === 'UPDATE');
    return validRows;
  }, [validRows, filterStatus]);

  const showErrors = filterStatus === 'ALL' || filterStatus === 'INVALID';

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden space-y-0">
      {/* Top Filter & Toolbar */}
      <div className="p-4 border-b border-border bg-surface-subtle flex flex-wrap items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
              filterStatus === 'ALL'
                ? 'bg-primary text-white font-semibold shadow-xs'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            Tất cả ({stats.total})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('INSERT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1.5 ${
              filterStatus === 'INSERT'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'bg-surface text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <PlusCircle className="size-3.5" />
            Tạo mới ({stats.inserts})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('UPDATE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1.5 ${
              filterStatus === 'UPDATE'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-surface text-blue-700 hover:bg-blue-50 border border-blue-200'
            }`}
          >
            <RefreshCw className="size-3.5" />
            Cập nhật ({stats.updates})
          </button>

          {stats.invalids > 0 && (
            <button
              type="button"
              onClick={() => setFilterStatus('INVALID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1.5 ${
                filterStatus === 'INVALID'
                  ? 'bg-rose-600 text-white font-semibold shadow-xs'
                  : 'bg-surface text-rose-700 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              <AlertCircle className="size-3.5" />
              Lỗi dữ liệu ({stats.invalids})
            </button>
          )}
        </div>

        {/* Right Tools: Partial Import & Export Error */}
        <div className="flex items-center gap-2">
          {stats.invalids > 0 && onTogglePartialImport && (
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowPartialImport}
                onChange={(e) => onTogglePartialImport(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary size-4"
              />
              <span>Cho phép chỉ lưu {stats.valid} dòng hợp lệ</span>
            </label>
          )}

          {stats.invalids > 0 && onExportErrors && (
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="size-3.5 text-rose-600" />}
              onClick={onExportErrors}
              className="text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              Xuất file lỗi ({stats.invalids})
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="overflow-x-auto max-h-[460px] divide-y divide-border">
        {/* Invalid Rows Section (If any) */}
        {showErrors && errors.length > 0 && (
          <div className="bg-rose-50/50 p-4 border-b border-rose-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
              <AlertCircle className="size-4 text-rose-600 shrink-0" />
              <span>Phát hiện {errors.length} dòng có lỗi vi phạm định dạng cần sửa trong file:</span>
            </div>
            <div className="divide-y divide-rose-200/60 font-mono text-[11px] max-h-40 overflow-y-auto">
              {errors.map((err, idx) => (
                <div key={idx} className="py-1.5 flex items-start gap-2 text-rose-900">
                  <span className="font-bold px-1.5 py-0.5 rounded bg-rose-200/70 text-rose-800">
                    Dòng #{err.row}
                  </span>
                  <span className="flex-1">{err.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Valid Rows Table */}
        {filteredValidRows.length > 0 && (
          <table className="w-full text-left text-xs">
            <thead className="bg-surface text-muted uppercase text-[11px] font-semibold border-b border-border sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="px-3 py-2.5 text-center w-12">#</th>
                <th className="px-3 py-2.5 w-24">Trạng thái</th>
                {type === 'menu' ? (
                  <>
                    <th className="px-3 py-2.5">Món ăn</th>
                    <th className="px-3 py-2.5">Cơ sở</th>
                    <th className="px-3 py-2.5 text-center">Ca</th>
                    <th className="px-3 py-2.5">Ngày</th>
                    <th className="px-3 py-2.5 text-center">BOM định mức</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2.5">Cơ sở</th>
                    <th className="px-3 py-2.5">Tên nguyên liệu</th>
                    <th className="px-3 py-2.5">Phân loại</th>
                    <th className="px-3 py-2.5 text-center">ĐVT</th>
                    <th className="px-3 py-2.5 text-right">Tồn kho (Cũ &rarr; Mới)</th>
                    <th className="px-3 py-2.5 text-right">Báo động min</th>
                    <th className="px-3 py-2.5 text-right">Đơn giá nhập</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredValidRows.map((row: any, idx: number) => {
                const isExpanded = expandedRowIds.has(row.rowNumber || idx);
                const hasRecipes = row.recipes && row.recipes.length > 0;

                return (
                  <React.Fragment key={row.rowNumber || idx}>
                    <tr className="hover:bg-surface-hover transition-colors">
                      <td className="px-3 py-2.5 text-center text-muted font-numeric">
                        #{row.rowNumber || idx + 1}
                      </td>

                      <td className="px-3 py-2.5">
                        {row.status === 'UPDATE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <RefreshCw className="size-3" />
                            Cập nhật
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <PlusCircle className="size-3" />
                            Tạo mới
                          </span>
                        )}
                      </td>

                      {type === 'menu' ? (
                        <>
                          <td className="px-3 py-2.5 font-medium text-foreground">
                            {row.dishName}
                            {row.description && (
                              <p className="text-[10px] text-muted truncate max-w-xs">{row.description}</p>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-muted">{row.canteenName || '—'}</td>
                          <td className="px-3 py-2.5 text-center">
                            {row.mealType === 'BREAKFAST' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                Sáng
                              </span>
                            ) : row.mealType === 'LUNCH' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-blue-50 text-[#0057b8] border border-blue-200">
                                Trưa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                Tối
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-numeric text-muted">
                            {row.dateStr || (row.date ? new Date(row.date).toLocaleDateString('vi-VN') : '—')}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {hasRecipes ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(row.rowNumber || idx)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-hover px-2 py-1 rounded-md bg-primary/10 border border-primary/20 transition cursor-pointer"
                              >
                                <Layers className="size-3" />
                                <span>{row.recipes.length} nguyên liệu</span>
                                {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted italic">Chưa có BOM</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2.5 text-muted">{row.canteenName || '—'}</td>
                          <td className="px-3 py-2.5 font-medium text-foreground">{row.name}</td>
                          <td className="px-3 py-2.5 text-muted">
                            <span className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground text-[10px]">
                              {row.category}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-muted">{row.unit}</td>
                          <td className="px-3 py-2.5 text-right font-numeric">
                            {row.status === 'UPDATE' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-muted line-through text-[11px]">
                                  {row.currentDbQty}
                                </span>
                                <span className="text-slate-400">&rarr;</span>
                                <span className="font-bold text-foreground">
                                  {row.currentQty}
                                </span>
                                <span className={`text-[10px] font-semibold ${row.deltaQty >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({row.deltaQty >= 0 ? `+${row.deltaQty}` : row.deltaQty} {row.unit})
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-foreground font-mono">
                                {row.currentQty} {row.unit}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-numeric text-muted">
                            {row.minQty} {row.unit}
                          </td>
                          <td className="px-3 py-2.5 text-right font-numeric font-medium text-foreground">
                            {row.unitPrice > 0 ? formatVND(row.unitPrice) : '—'}
                          </td>
                        </>
                      )}
                    </tr>

                    {/* Expandable Recipe Row for Menu */}
                    {type === 'menu' && hasRecipes && isExpanded && (
                      <tr className="bg-surface-subtle">
                        <td colSpan={7} className="px-6 py-3 border-t border-dashed border-border">
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                              <Layers className="size-3.5 text-primary" />
                              <span>Công thức định mức cấu thành ({row.dishName}):</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {row.recipes.map((rec: any, rIdx: number) => (
                                <div
                                  key={rIdx}
                                  className="p-2 rounded-lg bg-surface border border-border text-[11px] flex items-center justify-between"
                                >
                                  <div>
                                    <span className="font-medium text-foreground">{rec.ingredientName}</span>
                                    {rec.prepNote && (
                                      <p className="text-[10px] text-muted italic">{rec.prepNote}</p>
                                    )}
                                  </div>
                                  <span className="font-numeric font-bold text-primary shrink-0 ml-2">
                                    {rec.amount} {rec.unit || 'kg'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {filteredValidRows.length === 0 && (!showErrors || errors.length === 0) && (
          <div className="py-12 text-center text-xs text-muted">
            Không có dòng dữ liệu nào khớp với bộ lọc đã chọn.
          </div>
        )}
      </div>
    </div>
  );
};

