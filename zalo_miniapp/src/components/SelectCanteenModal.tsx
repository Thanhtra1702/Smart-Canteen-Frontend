import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useModalScrollLock } from '../hooks/useModalScrollLock';
import {
  MapPinIcon as MapPin,
  CheckIcon as Check,
  XIcon as X,
} from '@phosphor-icons/react';

interface SelectCanteenModalProps {
  isOpen: boolean;
  isInitial?: boolean;
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
      setErrorMsg('Vui lòng chọn một cơ sở.');
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
      onClick={(e) => {
        if (!isInitial && !isSubmitting && e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">
            {isInitial ? 'Chọn cơ sở Canteen' : 'Đổi cơ sở Canteen'}
          </h3>

          {!isInitial && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer shrink-0"
              aria-label="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-2.5">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          {canteens.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Đang tải danh sách cơ sở...
            </div>
          ) : (
            <div className="space-y-2">
              {canteens.map((canteen) => {
                const isSelected = selectedId === canteen.id;
                const isCurrentActive = selectedCanteen?.id === canteen.id;

                return (
                  <button
                    key={canteen.id}
                    type="button"
                    onClick={() => setSelectedId(canteen.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'border-[#0057b8] bg-blue-50/50 ring-1 ring-[#0057b8]'
                        : 'border-slate-200/80 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? 'border-[#0057b8] bg-[#0057b8] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check weight="bold" className="w-2.5 h-2.5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {canteen.name}
                        </span>
                        {isCurrentActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
                            Đang chọn
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{canteen.address || 'Khu đô thị giáo dục FPT'}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-3.5 border-t border-slate-100 flex items-center gap-2">
          {!isInitial && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Hủy
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedId}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center transition cursor-pointer ${
              isInitial ? 'w-full' : 'flex-1'
            } ${
              !selectedId || isSubmitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#0057b8] hover:bg-[#004593] text-white active:scale-98'
            }`}
          >
            {isSubmitting ? 'Đang lưu...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
};

