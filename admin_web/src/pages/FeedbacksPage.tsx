import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StarIcon as Star,
  PaperPlaneTiltIcon as Send,
  XIcon as X,
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

const isResolvedStatus = (status?: string) => status === 'RESOLVED' || status === 'CLOSED';

export const FeedbacksPage: React.FC = () => {
  const { selectedCanteenId } = useAuth();
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<'ALL' | '5' | '4' | 'LOW'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [selectedFb, setSelectedFb] = useState<any>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/feedbacks', {
        params: {
          canteenId: selectedCanteenId !== 'ALL' ? selectedCanteenId : undefined,
        },
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setFeedbacks(data);
    } catch (err) {
      console.error('Failed to load feedbacks', err);
      // silent catch to prevent render loop
    } finally {
      setLoading(false);
    }
  }, [selectedCanteenId]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const totalCount = feedbacks.length;
  const avgRating =
    totalCount > 0
      ? (feedbacks.reduce((sum, f) => sum + Number(f.rating || 0), 0) / totalCount).toFixed(1)
      : '5.0';

  const pendingCount = useMemo(
    () => feedbacks.filter((f) => !isResolvedStatus(f.status)).length,
    [feedbacks]
  );
  const resolvedCount = useMemo(
    () => feedbacks.filter((f) => isResolvedStatus(f.status)).length,
    [feedbacks]
  );

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      // Rating filter
      const r = Number(fb.rating);
      if (ratingFilter === '5' && r !== 5) return false;
      if (ratingFilter === '4' && r !== 4) return false;
      if (ratingFilter === 'LOW' && r > 3) return false;

      // Status filter
      if (statusFilter === 'PENDING' && isResolvedStatus(fb.status)) return false;
      if (statusFilter === 'RESOLVED' && !isResolvedStatus(fb.status)) return false;

      return true;
    });
  }, [feedbacks, ratingFilter, statusFilter]);

  const handleOpenReplyModal = (fb: any) => {
    setSelectedFb(fb);
    setReplyText(fb.reply || '');
    setShowReplyModal(true);
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFb || !replyText.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }

    try {
      setIsSubmittingReply(true);
      await api.post(`/feedbacks/${selectedFb.id}/replies`, {
        reply: replyText.trim(),
        resolve: true,
      });
      toast.success('Đã gửi phản hồi và cập nhật trạng thái');
      setShowReplyModal(false);
      fetchFeedbacks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi gửi phản hồi');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const getStatusBadge = (status?: string) =>
    isResolvedStatus(status) ? (
      <Badge variant="success" size="sm">Đã giải quyết</Badge>
    ) : (
      <Badge variant="warning" size="sm">Chờ xử lý</Badge>
    );

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Compact 4-Column Stat Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 overflow-hidden">
        <div className="p-4">
          <span className="text-xs text-slate-500 block">Điểm trung bình</span>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="font-numeric text-2xl font-bold text-slate-900">{avgRating}</span>
            <Star weight="fill" className="size-4 text-amber-400" />
          </div>
        </div>

        <div className="p-4">
          <span className="text-xs text-slate-500 block">Tổng đánh giá</span>
          <div className="mt-1.5 font-numeric text-2xl font-bold text-slate-900">
            {totalCount}
          </div>
        </div>

        <div className="p-4">
          <span className="text-xs text-slate-500 block">Chờ xử lý</span>
          <div className="mt-1.5 font-numeric text-2xl font-bold text-amber-600">
            {pendingCount}
          </div>
        </div>

        <div className="p-4">
          <span className="text-xs text-slate-500 block">Đã giải quyết</span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-numeric text-2xl font-bold text-emerald-600">{resolvedCount}</span>
            <span className="text-xs text-slate-400 font-numeric">
              ({totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Main Feedback Feed */}
      <Card flush>
        {/* Minimal Filter Bar */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'ALL', label: 'Tất cả', count: totalCount },
              { id: 'PENDING', label: 'Chờ xử lý', count: pendingCount },
              { id: 'RESOLVED', label: 'Đã giải quyết', count: resolvedCount },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`h-7 px-2.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] text-slate-400 font-numeric">{tab.count}</span>
                </button>
              );
            })}
          </div>

          {/* Rating Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'ALL', label: 'Tất cả sao' },
              { id: '5', label: '5 sao' },
              { id: '4', label: '4 sao' },
              { id: 'LOW', label: '≤ 3 sao' },
            ].map((tab) => {
              const isActive = ratingFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRatingFilter(tab.id as any)}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    isActive
                      ? 'bg-[#0057b8] text-white shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.id !== 'ALL' && (
                    <Star
                      weight="fill"
                      className={`size-3 shrink-0 ${
                        isActive ? 'text-white' : 'text-amber-400'
                      }`}
                    />
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List of Feedback Rows */}
        <div className="divide-y divide-slate-100">
          {filteredFeedbacks.map((fb) => {
            const userName = fb.user?.fullName || fb.user?.email || 'Khách hàng';
            const metaParts = [
              fb.mealType === 'BREAKFAST'
                ? 'Ca Sáng'
                : fb.mealType === 'LUNCH'
                ? 'Ca Trưa'
                : fb.mealType === 'DINNER'
                ? 'Ca Tối'
                : null,
              fb.canteen?.name,
              fb.dish?.name,
            ].filter(Boolean);

            return (
              <div key={fb.id} className="p-4 sm:px-5 hover:bg-slate-50/50 transition-colors space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 text-xs">{userName}</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            weight={star <= fb.rating ? 'fill' : 'regular'}
                            className={`size-3 ${
                              star <= fb.rating ? 'text-amber-400' : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      {getStatusBadge(fb.status)}
                    </div>
                    {metaParts.length > 0 && (
                      <p className="text-[11px] text-slate-400 truncate">
                        {metaParts.join(' • ')}
                      </p>
                    )}
                  </div>

                  <span className="font-numeric text-[11px] text-slate-400 shrink-0">
                    {new Date(fb.feedbackDate || fb.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                {/* User Comment */}
                {fb.comment && (
                  <p className="text-xs text-slate-700 leading-relaxed">{fb.comment}</p>
                )}

                {/* Staff Reply */}
                {fb.reply && (
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">Canteen phản hồi</span>
                      {fb.resolvedAt && (
                        <span className="font-numeric text-slate-400">
                          {new Date(fb.resolvedAt).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 leading-relaxed">{fb.reply}</p>
                  </div>
                )}

                {/* Compact Action Row */}
                <div className="pt-0.5 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenReplyModal(fb)}
                    icon={<Send className="w-3 h-3" />}
                  >
                    {fb.reply ? 'Sửa phản hồi' : 'Phản hồi'}
                  </Button>
                </div>
              </div>
            );
          })}

          {filteredFeedbacks.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400">
              {loading ? 'Đang tải phản hồi...' : 'Không có phản hồi phù hợp.'}
            </div>
          )}
        </div>
      </Card>

      {/* Modal Phản Hồi */}
      {showReplyModal && selectedFb && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReplyModal(false);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4"
        >
          <div className="bg-surface rounded-2xl max-w-md w-full p-5 border border-border shadow-modal space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">
                Phản hồi ý kiến khách hàng
              </h3>
              <button
                onClick={() => setShowReplyModal(false)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer outline-hidden"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-3 bg-secondary/40 rounded-xl text-muted text-xs">
              Ý kiến từ <strong>{selectedFb.user?.fullName || 'Khách hàng'}</strong>:
              <p className="mt-1 text-foreground italic">"{selectedFb.comment || 'Không có nhận xét'}"</p>
            </div>

            <form onSubmit={handleSubmitReply} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block font-medium text-foreground">
                  Nội dung phản hồi tới khách hàng *
                </label>
                <textarea
                  rows={4}
                  required
                  autoFocus
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Nhập nội dung tiếp thu ý kiến và cam kết khắc phục..."
                  className="w-full p-3 bg-surface border border-border-strong rounded-xl text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReplyModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmittingReply}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  Gửi phản hồi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
