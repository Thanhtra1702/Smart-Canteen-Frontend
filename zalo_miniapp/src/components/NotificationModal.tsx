import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Clock,
  Info,
  Megaphone,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  type: 'NEWS' | 'SERVICE_CHANGE' | 'SYSTEM';
  publishedAt: string;
  isRead?: boolean;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FALLBACK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Thực đơn tuần mới: Bổ sung món Healthy & Cơm gạo lứt',
    content: 'Canteen trường bổ sung thực đơn cơm gạo lứt và salad rau hữu cơ tự chọn từ tuần này. Toàn bộ nguyên liệu đạt chuẩn ATVSTP loại A.',
    type: 'NEWS',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isRead: false,
  },
  {
    id: 'n2',
    title: 'Nhắc nhở thời gian Cut-off chốt suất ăn trưa',
    content: 'Quý phụ huynh và các em học sinh lưu ý: Giờ chốt suất ăn trưa là trước 09:00 sáng mỗi ngày để bếp chuẩn bị khay cơm nóng sốt.',
    type: 'SERVICE_CHANGE',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    isRead: false,
  },
  {
    id: 'n3',
    title: 'Hệ thống Quẹt mã QR Pass tự động đã hoạt động',
    content: 'Học sinh chỉ cần quét mã QR tại Line 2 để nhận khay cơm tự động trong vòng 3 giây mà không cần mang theo tiền mặt.',
    type: 'SYSTEM',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    isRead: true,
  },
];

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  useModalScrollLock(isOpen);
  const [filter, setFilter] = useState<'ALL' | 'NEWS' | 'SERVICE_CHANGE' | 'SYSTEM'>('ALL');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    api
      .get('/notifications')
      .then((res) => {
        if (!isMounted) return;
        if (Array.isArray(res.data) && res.data.length > 0) {
          setNotifications(res.data);
        } else {
          setNotifications(FALLBACK_NOTIFICATIONS);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setNotifications(FALLBACK_NOTIFICATIONS);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredList =
    filter === 'ALL'
      ? notifications
      : notifications.filter((n) => n.type === filter);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours < 1) return 'Vừa xong';
      if (diffHours < 24) return `${diffHours} giờ trước`;
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Gần đây';
    }
  };

  const getTypeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'SERVICE_CHANGE':
        return <Clock className="w-4 h-4 text-[#003E82]" />;
      case 'SYSTEM':
        return <Info className="w-4 h-4 text-[#0057b8]" />;
      case 'NEWS':
      default:
        return <Megaphone className="w-4 h-4 text-[#0057b8]" />;
    }
  };

  const getTypeLabel = (type: NotificationItem['type']) => {
    switch (type) {
      case 'SERVICE_CHANGE':
        return 'Giờ phục vụ';
      case 'SYSTEM':
        return 'Hệ thống';
      case 'NEWS':
      default:
        return 'Tin tức';
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col overscroll-contain modal-scrollable touch-pan-y"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Thông Báo Học Đường</h3>
              <p className="text-[11px] text-slate-500">Cập nhật tin tức & lịch phục vụ Canteen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none text-xs">
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'NEWS', label: 'Tin tức' },
            { key: 'SERVICE_CHANGE', label: 'Giờ phục vụ' },
            { key: 'SYSTEM', label: 'Hệ thống' },
          ].map((item) => {
            const isSelected = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key as any)}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer text-xs ${
                  isSelected
                    ? 'bg-[#0057b8] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-2 border-[#0057b8] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Đang tải thông báo...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 text-center space-y-2 bg-slate-50 rounded-2xl border border-slate-100 p-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mx-auto text-slate-300 shadow-xs">
                <Bell className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700">Chưa có thông báo mới</p>
              <p className="text-[11px] text-slate-400">Các thông báo từ Canteen trường sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            filteredList.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-[#B9E0FE] hover:bg-[#F8FAFC] transition space-y-2 text-left shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#003E82]">
                        {getTypeLabel(item.type)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10.5px] text-slate-400 flex items-center gap-1 shrink-0 font-medium">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {formatTime(item.publishedAt)}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
                    {item.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

