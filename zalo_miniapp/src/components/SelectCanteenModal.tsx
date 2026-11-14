import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useModalScrollLock } from '../hooks/useModalScrollLock';
import {
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  ArrowRight,
  Sparkles,
  School,
} from 'lucide-react';

interface SelectCanteenModalProps {
  isOpen: boolean;
  isInitial?: boolean; // true = onboarding / first time (cannot close without selecting); false = settings change
  onClose: () => void;
  onSuccess?: () => void;
}

export const SelectCanteenModal: React.FC<SelectCanteenModalProps> = ({
  isOpen,
  isInitial = false,
  onClose,
  onSuccess,
}) => {
  const { canteens, selectedCanteen, confirmCanteen } = useApp();
  const [selectedId, setSelectedId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useModalScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setSelectedId(selectedCanteen?.id || canteens[0]?.id || '');
      setErrorMsg(null);
    }
  }, [isOpen, selectedCanteen, canteens]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedId) {
      setErrorMsg('Vui lòng chọn một cơ sở Canteen.');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await confirmCanteen(selectedId);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể cập nhật cơ sở. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#EFF6FF] text-[#003E82] flex items-center justify-center shrink-0 border border-[#D0E7FF] shadow-xs">
              {isInitial ? <School className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-[#131B2E]">
                  {isInitial ? 'Chọn cơ sở học tập của bạn' : 'Thay đổi cơ sở phục vụ'}
                </h3>
                <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#003E82]">
                  <Lock className="w-2.5 h-2.5" />
                  Cố định
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isInitial
                  ? 'Chọn trường của bạn để tải đúng thực đơn hôm nay'
                  : 'Cập nhật cơ sở học tập & Canteen liên kết'}
              </p>
            </div>
          </div>

          {!isInitial && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer shrink-0"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Informative / Warning Alert */}
          {isInitial ? (
            <div className="p-3.5 rounded-2xl bg-[#EFF6FF] border border-[#D0E7FF] text-xs text-slate-700 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#003E82]">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Khóa chặt cơ sở để tránh đặt nhầm món</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-slate-600">
                Hệ thống sẽ ghi nhớ và cố định thực đơn theo cơ sở bạn chọn. Bạn có thể thay đổi lại bất cứ lúc nào trong mục <strong>Cá nhân &gt; Cấu hình cơ sở</strong>.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Lưu ý khi thay đổi cơ sở</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-amber-700">
                Khi đổi cơ sở, thực đơn sẽ được làm mới hoàn toàn theo cơ sở mới và giỏ hàng hiện tại sẽ được xóa để đảm bảo bạn không nhận nhầm suất ăn.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Canteen List Options */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Danh sách cơ sở Canteen ({canteens.length})
            </label>

            {canteens.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Đang tải danh sách cơ sở...
              </div>
            ) : (
              canteens.map((canteen) => {
                const isSelected = selectedId === canteen.id;
                const isCurrentActive = selectedCanteen?.id === canteen.id;

                return (
                  <button
                    key={canteen.id}
                    type="button"
                    onClick={() => setSelectedId(canteen.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 relative ${
                      isSelected
                        ? 'border-[#003E82] bg-[#F0F7FF] shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Radio Indicator */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                        isSelected
                          ? 'border-[#003E82] bg-[#003E82] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>

                    {/* Canteen Info */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-[#131B2E]">
                          {canteen.name}
                        </span>
                        {isCurrentActive && (
                          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đang chọn
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{canteen.address || 'Khu đô thị giáo dục FPT'}</span>
                      </div>

                      {/* Cut-off info chip */}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                        <span>Chốt trưa: <strong className="text-slate-600">{canteen.cutoffLunch || '09:30'}</strong></span>
                        <span>•</span>
                        <span>Chốt tối: <strong className="text-slate-600">{canteen.cutoffDinner || '15:00'}</strong></span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-100 bg-[#F7FAFE] flex items-center gap-2">
          {!isInitial && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Hủy bỏ
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedId}
            className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
              isInitial ? 'w-full' : 'flex-1'
            } ${
              !selectedId || isSubmitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#003E82] hover:bg-[#004b8c] text-white active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? (
              <span>Đang lưu...</span>
            ) : (
              <>
                <span>{isInitial ? 'Xác nhận cơ sở & Bắt đầu' : 'Lưu thay đổi cơ sở'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

