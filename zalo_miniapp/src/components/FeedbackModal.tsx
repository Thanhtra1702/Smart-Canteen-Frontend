import React, { useState } from 'react';
import {
  StarIcon as Star,
  XIcon as X,
  CheckCircleIcon as CheckCircle2,
  WarningCircleIcon as AlertCircle,
  PaperPlaneTiltIcon as Send,
  ChatCircleDotsIcon as MessageSquareHeart,
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

interface FeedbackSuccessNoticeProps {
  action?: React.ReactNode;
  className?: string;
}

/** Shared feedback submission confirmation state across parent and student views. */
export const FeedbackSuccessNotice: React.FC<FeedbackSuccessNoticeProps> = ({
  action,
  className = 'py-8',
}) => (
  <div className={`text-center space-y-2 animate-in fade-in duration-150 ${className}`}>
    <CheckCircle2 className="w-12 h-12 text-[#0057b8] mx-auto" />
    <h4 className="text-sm font-bold text-slate-900">Cảm ơn bạn đã đóng góp ý kiến!</h4>
    <p className="text-xs text-slate-500">Phản hồi của bạn đã được ghi nhận vào hệ thống.</p>
    {action && <div className="pt-2">{action}</div>}
  </div>
);

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: any | null;
  initialDishId?: string | null;
  onSuccess?: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  order,
  initialDishId,
  onSuccess,
}) => {
  useModalScrollLock(isOpen);
  const { selectedCanteen, refreshFeedbacks } = useApp();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [selectedDishId, setSelectedDishId] = useState<string>(initialDishId || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const ratingLabels: Record<number, string> = {
    1: 'Rất không hài lòng',
    2: 'Chưa hài lòng',
    3: 'Tạm ổn / Bình thường',
    4: 'Hài lòng, đồ ăn ngon',
    5: 'Rất ngon & phục vụ chu đáo',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const canteenId = order?.canteenId || selectedCanteen?.id;
    if (!canteenId) {
      setErrorMsg('Vui lòng chọn cơ sở Canteen');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      await api.post('/feedbacks', {
        canteenId,
        rating,
        comment: comment.trim() || undefined,
        mealType: order?.mealType,
        dishId: selectedDishId || undefined,
      });

      setSuccess(true);
      await refreshFeedbacks();
      onSuccess?.();

      setTimeout(() => {
        setSuccess(false);
        setComment('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const dishes = order?.items?.map((i: any) => i.dish).filter(Boolean) || [];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[85vh] overflow-y-auto overscroll-contain modal-scrollable touch-pan-y animate-in zoom-in-95 duration-150"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center">
              <MessageSquareHeart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Đánh Giá Chất Lượng Suất Ăn</h3>
              <p className="text-[11px] text-slate-500">Ý kiến của bạn giúp Canteen nâng cao dịch vụ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <FeedbackSuccessNotice />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Star Rating Section */}
            <div className="text-center py-2 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Mức độ hài lòng của bạn
              </span>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating ?? rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer transition transform hover:scale-115"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          active
                            ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-bold text-slate-700 mt-1.5">
                {ratingLabels[hoverRating ?? rating]}
              </p>
            </div>

            {/* Optional Dish Selection */}
            {dishes.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Món ăn cụ thể (Tùy chọn)</label>
                <select
                  value={selectedDishId}
                  onChange={(e) => setSelectedDishId(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-[#0057b8]"
                >
                  <option value="">-- Đánh giá chung cho cả suất ăn --</option>
                  {dishes.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.category})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Comment Area */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Ý kiến đóng góp chi tiết</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Chia sẻ thêm cảm nhận của bạn về khẩu phần, độ nóng, gia vị..."
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0057b8] resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0057b8] hover:bg-[#003E82] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi đánh giá</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
