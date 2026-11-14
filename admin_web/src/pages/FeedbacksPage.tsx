import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Star,
  RefreshCw,
  UserCheck,
  Send,
  X,
  CheckCircle2,
  UtensilsCrossed,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

type FeedbackStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export const FeedbacksPage: React.FC = () => {
  const { selectedCanteenId } = useAuth();
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<'ALL' | '5' | '4' | 'LOW'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [selectedFb, setSelectedFb] = useState<any>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyResolve, setReplyResolve] = useState(true);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

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

  const fetchStaff = useCallback(async () => {
    try {
      const res = await api.get('/admin-hq/staff').catch(() => api.get('/users', { params: { role: 'ADMIN' } }));
      const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setStaffList(data);
    } catch {
      // Non-critical, ignore if staff cannot be fetched
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
    fetchStaff();
  }, [fetchFeedbacks, fetchStaff]);

  const totalCount = feedbacks.length;
  const avgRating =
    totalCount > 0
      ? (feedbacks.reduce((sum, f) => sum + Number(f.rating || 0), 0) / totalCount).toFixed(1)
      : '5.0';


  const newCount = useMemo(() => feedbacks.filter((f) => f.status === 'NEW' || !f.status).length, [feedbacks]);
  const assignedCount = useMemo(() => feedbacks.filter((f) => f.status === 'ASSIGNED').length, [feedbacks]);
  const inProgressCount = useMemo(() => feedbacks.filter((f) => f.status === 'IN_PROGRESS').length, [feedbacks]);
  const resolvedCount = useMemo(() => feedbacks.filter((f) => f.status === 'RESOLVED').length, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      // Rating filter
      const r = Number(fb.rating);
      if (ratingFilter === '5' && r !== 5) return false;
      if (ratingFilter === '4' && r !== 4) return false;
      if (ratingFilter === 'LOW' && r > 3) return false;

      // Status filter
      const s = fb.status || 'NEW';
      if (statusFilter !== 'ALL' && s !== statusFilter) return false;

      return true;
    });
  }, [feedbacks, ratingFilter, statusFilter]);

  const handleOpenReplyModal = (fb: any) => {
    setSelectedFb(fb);
    setReplyText(fb.reply || '');
    setReplyResolve(true);
    setShowReplyModal(true);
  };

  const handleOpenAssignModal = (fb: any) => {
    setSelectedFb(fb);
    setAssignedStaffId(fb.assignedToId || (staffList.length > 0 ? staffList[0].id : ''));
    setShowAssignModal(true);
  };

  const handleStatusChange = async (fb: any, newStatus: FeedbackStatus) => {
    try {
      await api.patch(`/feedbacks/${fb.id}`, { status: newStatus });
      toast.success(`Đã cập nhật trạng thái sang ${newStatus}`);
      fetchFeedbacks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật trạng thái');
    }
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
        resolve: replyResolve,
      });
      toast.success('Gửi phản hồi thành công!');
      setShowReplyModal(false);
      fetchFeedbacks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi gửi phản hồi');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleSubmitAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFb || !assignedStaffId) {
      toast.error('Vui lòng chọn nhân viên phụ trách');
      return;
    }

    try {
      setIsSubmittingAssign(true);
      await api.post(`/feedbacks/${selectedFb.id}/assignments`, {
        staffId: assignedStaffId,
      });
      toast.success('Phân công xử lý thành công!');
      setShowAssignModal(false);
      fetchFeedbacks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi phân công');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ASSIGNED':
        return <Badge variant="brand" size="sm">Đã phân công</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="warning" size="sm">Đang xử lý</Badge>;
      case 'RESOLVED':
        return <Badge variant="success" size="sm">Đã giải quyết</Badge>;
      case 'CLOSED':
        return <Badge variant="neutral" size="sm">Đã đóng</Badge>;
      case 'NEW':
      default:
        return <Badge variant="brand" size="sm">Mới tiếp nhận</Badge>;
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Divided Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-px bg-border border border-border rounded-2xl overflow-hidden shadow-2xs">
        <div className="bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Điểm CSAT trung bình</span>
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-numeric text-2xl font-bold text-amber-600">{avgRating}</span>
            <span className="text-xs font-medium text-amber-700/80">/ 5.0 sao</span>
          </div>
        </div>

        <div className="bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Tổng lượt đánh giá</span>
            <span className="text-xs text-muted">Toàn hệ thống</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-numeric text-2xl font-bold text-foreground">{totalCount}</span>
            <span className="text-xs text-muted">lượt</span>
          </div>
        </div>

        <div className="bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700">Cần xử lý</span>
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-numeric text-2xl font-bold text-amber-600">{newCount + assignedCount}</span>
            <span className="text-xs text-amber-700/90 font-medium">phản hồi</span>
          </div>
        </div>

        <div className="bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">Đã giải quyết</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              {totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-numeric text-2xl font-bold text-emerald-600">{resolvedCount}</span>
            <span className="text-xs text-emerald-700 font-medium">hoàn tất</span>
          </div>
        </div>
      </div>

      {/* Main Feedback Feed */}
      <Card flush>
        {/* Filter Bar */}
        <div className="p-4 border-b border-border flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-secondary/80 rounded-xl border border-border flex-wrap">
              {[
                { id: 'ALL', label: 'Tất cả', count: totalCount },
                { id: 'NEW', label: 'Mới', count: newCount },
                { id: 'ASSIGNED', label: 'Đã phân công', count: assignedCount },
                { id: 'IN_PROGRESS', label: 'Đang xử lý', count: inProgressCount },
                { id: 'RESOLVED', label: 'Đã giải quyết', count: resolvedCount },
              ].map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-surface text-foreground shadow-xs font-semibold'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1 rounded-full font-numeric ${
                        isActive ? 'bg-secondary text-foreground' : 'text-muted'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Rating Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-secondary/80 rounded-xl border border-border">
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
                    onClick={() => setRatingFilter(tab.id as any)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-surface text-foreground shadow-xs font-semibold'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {tab.id !== 'ALL' && (
                      <Star className="size-3 fill-amber-400 text-amber-400 shrink-0" />
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* List of Feedback Rows */}
        <div className="divide-y divide-border">
          {filteredFeedbacks.map((fb) => {
            const userName = fb.user?.fullName || fb.user?.email || 'Khách hàng';
            const initial = userName.charAt(0).toUpperCase();

            return (
              <div key={fb.id} className="p-5 hover:bg-secondary/20 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary text-foreground text-xs font-semibold flex items-center justify-center shrink-0 border border-border mt-0.5">
                      {initial}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground text-xs">{userName}</span>
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`size-3.5 ${
                                star <= fb.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'fill-slate-100 text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                        {getStatusBadge(fb.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted mt-1">
                        {fb.mealType && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                              fb.mealType === 'BREAKFAST'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : fb.mealType === 'LUNCH'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            }`}
                          >
                            {fb.mealType === 'BREAKFAST'
                              ? 'Ca Sáng'
                              : fb.mealType === 'LUNCH'
                              ? 'Ca Trưa'
                              : 'Ca Tối'}
                          </span>
                        )}
                        {fb.canteen?.name && <span>{fb.canteen.name}</span>}
                        {fb.dish?.name && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            <UtensilsCrossed className="size-3 text-blue-600" />
                            {fb.dish.name}
                          </span>
                        )}
                        {fb.assignedTo && (
                          <span className="text-brand flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            Phụ trách: <strong>{fb.assignedTo.fullName || fb.assignedTo.email}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    <span className="font-numeric text-[11px] text-muted">
                      {new Date(fb.feedbackDate || fb.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>

                {/* User Comment */}
                <p className="text-xs text-foreground/90 leading-relaxed pl-11">
                  {fb.comment ? (
                    fb.comment
                  ) : (
                    <span className="text-muted italic">Người dùng không để lại bình luận chi tiết.</span>
                  )}
                </p>

                {/* Staff Reply Box if any */}
                {fb.reply && (
                  <div className="ml-11 p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-muted text-[11px]">
                      <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        Phản hồi từ Ban Quản lý Canteen:
                      </span>
                      {fb.resolvedAt && (
                        <span className="text-emerald-700/80 font-mono">
                          {new Date(fb.resolvedAt).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-800 leading-relaxed pl-5 font-normal">{fb.reply}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="ml-11 pt-1 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenReplyModal(fb)}
                    icon={<Send className="w-3 h-3" />}
                  >
                    {fb.reply ? 'Sửa phản hồi' : 'Phản hồi'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenAssignModal(fb)}
                    icon={<UserCheck className="w-3 h-3" />}
                  >
                    {fb.assignedTo ? 'Đổi người phụ trách' : 'Phân công'}
                  </Button>

                  {/* Status Dropdown/Selector */}
                  <select
                    value={fb.status || 'NEW'}
                    onChange={(e) => handleStatusChange(fb, e.target.value as FeedbackStatus)}
                    className="h-8 px-2.5 bg-surface border border-border rounded-lg text-xs font-medium text-foreground cursor-pointer outline-hidden hover:bg-secondary/40"
                  >
                    <option value="NEW">Trạng thái: Mới</option>
                    <option value="ASSIGNED">Trạng thái: Đã phân công</option>
                    <option value="IN_PROGRESS">Trạng thái: Đang xử lý</option>
                    <option value="RESOLVED">Trạng thái: Đã giải quyết</option>
                    <option value="CLOSED">Trạng thái: Đã đóng</option>
                  </select>
                </div>
              </div>
            );
          })}

          {filteredFeedbacks.length === 0 && (
            <div className="py-16 text-center text-xs text-muted">
              {loading ? 'Đang tải phản hồi...' : 'Không có phản hồi nào phù hợp với bộ lọc.'}
            </div>
          )}
        </div>
      </Card>

      {/* Modal Phản Hồi */}
      {showReplyModal && selectedFb && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-5 border border-border shadow-modal space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">
                Phản Hồi Ý Kiến Khách Hàng
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

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={replyResolve}
                  onChange={(e) => setReplyResolve(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-focus"
                />
                <span className="text-xs text-foreground">
                  Đánh dấu đã giải quyết (RESOLVED) sau khi gửi phản hồi
                </span>
              </label>

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
                  isLoading={isSubmittingReply}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  Gửi phản hồi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Phân Công */}
      {showAssignModal && selectedFb && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 border border-border shadow-modal space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">
                Phân Công Nhân Sự Phụ Trách
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer outline-hidden"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAssign} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block font-medium text-foreground">
                  Chọn nhân sự / Admin cơ sở *
                </label>
                <select
                  required
                  value={assignedStaffId}
                  onChange={(e) => setAssignedStaffId(e.target.value)}
                  className="w-full h-10 px-3 bg-surface border border-border-strong rounded-xl text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                >
                  <option value="">-- Chọn nhân sự phụ trách --</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName || st.email} ({st.canteen?.name || 'HQ'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAssignModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmittingAssign}
                  icon={<UserCheck className="w-3.5 h-3.5" />}
                >
                  Xác nhận phân công
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
