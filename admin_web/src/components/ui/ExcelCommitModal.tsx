import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  PlusCircle,
  RefreshCw,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Button } from './Button';

interface ExcelCommitModalProps {
  isOpen: boolean;
  type: 'menu' | 'inventory';
  summary: {
    total: number;
    inserts: number;
    updates: number;
    canteenName?: string;
    totalBomIngredients?: number;
  };
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (options?: { autoPublish?: boolean }) => void;
}

export const ExcelCommitModal: React.FC<ExcelCommitModalProps> = ({
  isOpen,
  type,
  summary,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  const [autoPublish, setAutoPublish] = useState<boolean>(true);
  const [isDoubleConfirmed, setIsDoubleConfirmed] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-surface rounded-2xl max-w-md w-full border border-border shadow-modal overflow-hidden text-xs space-y-0">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldAlert className="size-4.5" />
            </div>
            <div>
              <h4 className="font-bold text-foreground text-sm">
                Xác nhận lưu {type === 'menu' ? 'Thực đơn tuần' : 'Kiểm kê Tồn kho'}
              </h4>
              <p className="text-[11px] text-muted">
                {summary.canteenName ? `Cơ sở: ${summary.canteenName}` : 'Kiểm tra kỹ trước khi ghi dữ liệu'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-secondary cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px]">
                <PlusCircle className="size-3.5 text-emerald-600" />
                <span>Thêm mới (Insert)</span>
              </div>
              <p className="text-xl font-bold font-numeric text-emerald-700">
                {summary.inserts} <span className="text-[11px] font-normal text-emerald-800">mục</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-800 font-semibold text-[11px]">
                <RefreshCw className="size-3.5 text-blue-600" />
                <span>Cập nhật (Update)</span>
              </div>
              <p className="text-xl font-bold font-numeric text-blue-700">
                {summary.updates} <span className="text-[11px] font-normal text-blue-800">mục</span>
              </p>
            </div>
          </div>

          {/* Business Impact Note */}
          {type === 'menu' ? (
            <div className="p-3 rounded-xl bg-secondary/50 border border-border space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Layers className="size-3.5 text-primary" />
                <span>Tác động định mức & Xuất bản:</span>
              </div>
              <p className="text-muted leading-relaxed">
                Hệ thống sẽ lưu <strong>{summary.total} món ăn</strong> và đồng bộ{' '}
                <strong>{summary.totalBomIngredients || 0} nguyên liệu định mức BOM</strong> để bếp dự báo tiêu hao tự động.
              </p>

              <label className="flex items-center gap-2 pt-1 text-foreground font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoPublish}
                  onChange={(e) => setAutoPublish(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary size-4"
                />
                <span>Tự động xuất bản thực đơn lên Mobile & Zalo Mini App ngay</span>
              </label>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 space-y-1.5 text-amber-900">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="size-3.5 text-amber-600" />
                <span>Ghi sổ cái kế toán kho:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Các mục có thay đổi tồn kho thực tế sẽ tự động sinh phiếu điều chỉnh (<strong>ADJUSTMENT</strong>) trong Sổ kho để đối soát và kiểm toán minh bạch.
              </p>
            </div>
          )}

          {/* Final Checkbox for 2-step confirmation */}
          <label className="flex items-start gap-2 p-2.5 rounded-xl border border-dashed border-border bg-surface-subtle cursor-pointer select-none text-[11px] text-foreground">
            <input
              type="checkbox"
              checked={isDoubleConfirmed}
              onChange={(e) => setIsDoubleConfirmed(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary size-4 mt-0.5 shrink-0"
            />
            <span>
              Tôi đã kiểm tra kỹ số liệu và xác nhận đồng ý ghi nhận{' '}
              <strong>{summary.total} dòng dữ liệu</strong> vào cơ sở dữ liệu hệ thống.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-surface-subtle flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!isDoubleConfirmed || isSubmitting}
            loading={isSubmitting}
            onClick={() => onConfirm({ autoPublish })}
          >
            {isSubmitting ? 'Đang lưu CSDL...' : 'Xác nhận Lưu'}
          </Button>
        </div>
      </div>
    </div>
  );
};

