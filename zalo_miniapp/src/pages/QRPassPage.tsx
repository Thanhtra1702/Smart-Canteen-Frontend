import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { TabKey } from '../components/BottomNavigation';
import {
  QrCode,
  Plus,
  RefreshCw,
  Clock,
  Utensils,
  CheckCircle,
  AlertCircle,
  Calendar,
  Sparkles,
  MapPin,
  MessageSquareHeart,
  ChevronRight,
  ShieldCheck,
  Copy,
  Check,
  Download,
  Info,
  X,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChefHat,
} from 'lucide-react';
import { FeedbackModal } from '../components/FeedbackModal';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

interface QRPassPageProps {
  onNavigateTab: (tab: TabKey) => void;
}

export const QRPassPage: React.FC<QRPassPageProps> = ({ onNavigateTab }) => {
  const {
    user,
    zaloProfile,
    selectedCanteen,
    activeOrders,
    refreshOrders,
    wallet,
    selectedMealType,
    setSelectedMealType,
    refreshUserData,
  } = useApp();

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [qrToken, setQrToken] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(300);
  const [generatingToken, setGeneratingToken] = useState<boolean>(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [copiedOtp, setCopiedOtp] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [menuDishes, setMenuDishes] = useState<any[]>([]);
  const [loadingMenuDishes, setLoadingMenuDishes] = useState<boolean>(false);
  const [editSelectedDishIds, setEditSelectedDishIds] = useState<string[]>([]);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  useModalScrollLock(showGuideModal || showFeedbackModal);

  // Screen WakeLock API to keep display awake during meal pickup
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock request error:', err);
      }
    };
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // Filter pending/confirmed orders awaiting pickup for TODAY only
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const pendingOrders = activeOrders.filter((o) => {
    if (o.status !== 'PENDING' && o.status !== 'CONFIRMED') return false;
    const ordDate = o.orderDate
      ? new Date(o.orderDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
      : (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) : todayStr);
    return ordDate === todayStr;
  });

  const servedOrdersToday = activeOrders.filter((o) => {
    if (o.status !== 'SERVED' && o.status !== 'COMPLETED') return false;
    const ordDate = o.orderDate
      ? new Date(o.orderDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
      : (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) : todayStr);
    return ordDate === todayStr;
  });

  const remainingMeals = Number(wallet?.remainingMeals ?? wallet?.totalRemainingMeals ?? 0);
  const hasPackage = remainingMeals > 0;

  // Sort pending orders: unscanned orders FIRST (so QR code displays immediately!), then scanned waiting orders, then newest createdAt
  const sortedPendingOrders = [...pendingOrders].sort((a, b) => {
    // 1. Unscanned orders needing QR scan at counter always come first
    if (!a.isWaitingServing && b.isWaitingServing) return -1;
    if (a.isWaitingServing && !b.isWaitingServing) return 1;

    // 2. Newest orders first
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    if (timeA !== timeB) return timeB - timeA;

    return 0;
  });

  // Sync selected order: only when there are pending orders
  useEffect(() => {
    if (sortedPendingOrders.length > 0) {
      // Prioritize recently created order if present
      const lastCreatedId = localStorage.getItem('canteen_last_created_order_id');
      if (lastCreatedId) {
        const matchingOrder = sortedPendingOrders.find((o) => o.id === lastCreatedId);
        if (matchingOrder) {
          try {
            localStorage.removeItem('canteen_last_created_order_id');
          } catch (_) {}
          setSelectedOrder(matchingOrder);
          return;
        }
      }

      if (!selectedOrder || !sortedPendingOrders.some((o) => o.id === selectedOrder.id)) {
        setSelectedOrder(sortedPendingOrders[0]);
      } else {
        const fresh = sortedPendingOrders.find((o) => o.id === selectedOrder.id);
        if (fresh && (fresh.status !== selectedOrder.status || fresh.isWaitingServing !== selectedOrder.isWaitingServing || fresh.checkinStatus !== selectedOrder.checkinStatus)) {
          setSelectedOrder(fresh);
        }
      }
    } else {
      setSelectedOrder(null);
    }
  }, [activeOrders, sortedPendingOrders, selectedOrder]);

  // Polling hook: Poll orders every 3s when waiting for food
  useEffect(() => {
    if (!selectedOrder) return;
    const isWaiting =
      selectedOrder.status === 'PENDING' || selectedOrder.status === 'CONFIRMED';
    if (!isWaiting) return;

    const interval = setInterval(async () => {
      try {
        await refreshOrders();
      } catch (err) {
        console.error('Lỗi tự động kiểm tra trạng thái đơn:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedOrder?.id, selectedOrder?.status, refreshOrders]);

  const generatePickupToken = useCallback(
    async (order: any) => {
      if (!order?.id || order.status === 'COMPLETED' || order.status === 'SERVED' || order.status === 'CANCELLED') {
        setQrToken('');
        return;
      }

      const canteenId = order.canteenId || selectedCanteen?.id || user?.canteenId || 'canteen-1';

      try {
        setGeneratingToken(true);
        setTokenError(null);
        const payload: any = {
          canteenId,
          mealType: order.mealType || selectedMealType || 'LUNCH',
          orderId: order.id,
        };

        const res = await api.post('/pickup/token', payload);

        if (res.data?.qrToken) {
          setQrToken(res.data.qrToken);
          const exp = new Date(res.data.expiresAt);
          setExpiresAt(exp);
          const diff = Math.max(0, Math.floor((exp.getTime() - Date.now()) / 1000));
          setCountdown(diff);
        }
      } catch (err: any) {
        const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Không thể tạo mã nhận suất ăn';
        setTokenError(errMsg);
        if (order?.id) {
          setQrToken(`cheero://pass/${order.id}`);
          setCountdown(300);
        }
      } finally {
        setGeneratingToken(false);
      }
    },
    [selectedCanteen?.id, user?.canteenId, selectedMealType]
  );

  useEffect(() => {
    if (selectedOrder) {
      generatePickupToken(selectedOrder);
    } else {
      setQrToken('');
    }
  }, [selectedOrder, generatePickupToken]);

  // Live countdown
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleRefresh = async () => {
    await refreshOrders();
    await refreshUserData();
    if (selectedOrder) {
      const updated = activeOrders.find((o) => o.id === selectedOrder.id) || selectedOrder;
      setSelectedOrder(updated);
      await generatePickupToken(updated);
    }
  };

  const orderCode = selectedOrder?.id
    ? `#${selectedOrder.id.substring(0, 8).toUpperCase()}`
    : '';

  const otpCode = selectedOrder?.id
    ? `${selectedOrder.id.substring(0, 3).toUpperCase()} ${selectedOrder.id.substring(3, 6).toUpperCase()}`
    : '';

  const qrValue = selectedOrder?.id ? `ORDER:${selectedOrder.id}` : (qrToken || (wallet?.studentCode ? `STUDENT:${wallet.studentCode}` : (user?.id ? `STUDENT:${user.id}` : '')));

  const orderItemsSummary = selectedOrder?.items && selectedOrder.items.length > 0
    ? selectedOrder.items.map((it: any) => it.dish?.name || it.name).join(' + ')
    : null;

  const isExpired = countdown <= 0;
  const isServed = selectedOrder?.status === 'SERVED' || selectedOrder?.status === 'COMPLETED';
  const isCancelled = selectedOrder?.status === 'CANCELLED';

  const copyOtp = () => {
    if (!otpCode) return;
    navigator.clipboard.writeText(otpCode.replace(/\s+/g, ''));
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  // Cutoff calculation & Edit check
  const isPastCutoff = selectedOrder?.isPastCutoff ?? (() => {
    if (!selectedOrder) return false;
    const canteen = selectedOrder.canteen || selectedCanteen;
    let cutoffStr = '10:30';
    if (selectedOrder.mealType === 'BREAKFAST') cutoffStr = canteen?.cutoffBreakfast || '07:00';
    else if (selectedOrder.mealType === 'LUNCH') cutoffStr = canteen?.cutoffLunch || '10:30';
    else if (selectedOrder.mealType === 'DINNER') cutoffStr = canteen?.cutoffDinner || '16:00';

    const ordDate = selectedOrder.orderDate ? new Date(selectedOrder.orderDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) : todayStr;
    if (ordDate < todayStr) return true;
    if (ordDate > todayStr) return false;

    const now = new Date();
    const vnDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const curHour = vnDate.getUTCHours();
    const curMin = vnDate.getUTCMinutes();
    const curSec = vnDate.getUTCSeconds();
    const curSeconds = curHour * 3600 + curMin * 60 + curSec;

    const [h, m] = cutoffStr.split(':').map(Number);
    const cutSeconds = (h || 0) * 3600 + (m || 0) * 60;
    return curSeconds > cutSeconds;
  })();

  const cutoffTimeDisplay = selectedOrder?.cutoffTimeStr || (() => {
    const canteen = selectedOrder?.canteen || selectedCanteen;
    if (selectedOrder?.mealType === 'BREAKFAST') return canteen?.cutoffBreakfast || '07:00';
    if (selectedOrder?.mealType === 'DINNER') return canteen?.cutoffDinner || '16:00';
    return canteen?.cutoffLunch || '10:30';
  })();

  const canEdit = !isPastCutoff && (selectedOrder?.status === 'CONFIRMED' || selectedOrder?.status === 'PENDING');

  const handleOpenEditModal = async () => {
    if (!selectedOrder) return;
    setShowEditModal(true);
    setEditErrorMsg(null);
    setEditSuccessMsg(null);
    const currentDishIds = selectedOrder.items?.map((it: any) => it.dishId || it.dish?.id).filter(Boolean) || [];
    setEditSelectedDishIds(currentDishIds);

    try {
      setLoadingMenuDishes(true);
      const cid = selectedOrder.canteenId || selectedCanteen?.id;
      const dateStr = selectedOrder.orderDate
        ? new Date(selectedOrder.orderDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
        : todayStr;
      
      const res = await api.get('/menu/today', {
        params: { canteenId: cid, date: dateStr }
      });

      const menus = Array.isArray(res.data) ? res.data : [];
      const mealMenu = menus.find((m: any) => m.mealType === selectedOrder.mealType) || menus[0];
      const dishes = mealMenu?.items?.map((it: any) => it.dish).filter(Boolean) || [];

      if (dishes.length === 0) {
        const dishesRes = await api.get('/menu/dishes', { params: { canteenId: cid } });
        setMenuDishes(Array.isArray(dishesRes.data) ? dishesRes.data : []);
      } else {
        setMenuDishes(dishes);
      }
    } catch (err: any) {
      console.warn('Lỗi tải thực đơn để đổi món:', err);
    } finally {
      setLoadingMenuDishes(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedOrder || editSelectedDishIds.length === 0) return;
    try {
      setIsSubmittingEdit(true);
      setEditErrorMsg(null);
      const res = await api.put(`/orders/${selectedOrder.id}`, {
        items: editSelectedDishIds.map((id) => ({ dishId: id, quantity: 1 })),
      });
      setEditSuccessMsg(res.data?.message || 'Cập nhật món ăn thành công!');
      await refreshOrders();
      await refreshUserData();
      setTimeout(() => {
        setShowEditModal(false);
        setEditSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setEditErrorMsg(err?.response?.data?.message || err?.message || 'Không thể cập nhật món ăn');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không? Tiền/lượt ăn đã thanh toán sẽ được hoàn trả 100% vào tài khoản của bạn ngay lập tức.')) {
      return;
    }
    try {
      setIsCancelling(true);
      const res = await api.put(`/orders/${selectedOrder.id}/cancel`);
      alert(res.data?.message || 'Hủy đơn hàng thành công! Số tiền/lượt ăn đã được hoàn trả lại ví.');
      await refreshOrders();
      await refreshUserData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Không thể hủy đơn hàng');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDownloadCard = () => {
    if (!selectedOrder?.id) return;
    try {
      const svgElement = document.getElementById('dining-pass-qr-svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = `QR-Pass-${orderCode}.svg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(svgUrl);
      }
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.warn('Lỗi tải thẻ QR:', err);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    }
  };

  return (
    <div className="p-4 space-y-3.5 pb-28 bg-[#F7FAFE] min-h-screen">
      {/* 1. Header (Clean & Minimalist Shift & Title) */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full text-xs font-semibold text-[#0057b8]">
          <Clock className="w-3.5 h-3.5" />
          <span>CA ĂN TRƯA • 11:00 - 13:30</span>
        </div>
        <h2 className="text-base font-bold text-slate-900">
          Phiếu Ăn Điện Tử (Dining Pass)
        </h2>
        <p className="text-xs text-slate-500">
          {pendingOrders.length > 0
            ? 'Xuất trình mã QR tại quầy để nhân viên quét nhận suất cơm'
            : 'Mã QR sẽ hiển thị sau khi bạn hoàn tất đặt món'}
        </p>
      </div>

      {/* 2. Order Switcher: Chỉ hiển thị khi có từ 2 suất ăn đã đặt hôm nay */}
{sortedPendingOrders.length > 1 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {sortedPendingOrders.map((ord, idx) => {
              const isCurrent = selectedOrder?.id === ord.id;
              const mealLabel = ord.mealType === 'BREAKFAST' ? 'Bữa Sáng' : ord.mealType === 'DINNER' ? 'Bữa Chiều' : 'Bữa Trưa';
              const isWaiting = ord.isWaitingServing;
              return (
                <button
                  key={ord.id}
                  onClick={() => setSelectedOrder(ord)}
className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 active:scale-95 ${
                    isCurrent
                      ? isWaiting
                        ? 'bg-amber-500 text-white border-amber-600 shadow-2xs font-bold'
                        : 'bg-[#0057b8] text-white border-[#0057b8] shadow-2xs font-bold'
                      : isWaiting
                      ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{isWaiting ? '⏳' : '🎟️'}</span>
                  <span>Suất {idx + 1}: {mealLabel}</span>
                  <span className={`text-[10px] ml-0.5 px-1 py-0.2 rounded font-mono ${isCurrent ? 'bg-black/15' : 'bg-slate-100'}`}>
                    {isWaiting ? 'Chờ gắp' : 'Mã QR'}
                  </span>
                </button>
              );
            })}
          </div>
<p className="text-[10.5px] text-slate-400 text-left px-1">
            Chạm vào từng suất để chuyển mã QR nhận phần cơm tương ứng
          </p>
        </div>
      )}

      {/* 3. Empty State khi KHÔNG CÓ ĐƠN ĐẶT CƠM */}
      {!selectedOrder ? (
        servedOrdersToday.length > 0 ? (
          /* Đã nhận xong tất cả suất ăn hôm nay */
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-7 text-center space-y-3.5">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-150 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Bạn đã nhận xong suất ăn hôm nay!
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Đơn #{servedOrdersToday[0].id.substring(0, 8).toUpperCase()} đã được phục vụ tại quầy. Chúc bạn có một bữa ăn ngon miệng!
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1 max-w-xs mx-auto">
              <button
                onClick={() => onNavigateTab('feedback')}
                className="w-full px-4 py-2.5 bg-[#0057b8] hover:bg-[#004593] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <MessageSquareHeart className="w-4 h-4" />
                <span>Đánh giá bữa ăn</span>
              </button>
              <button
                onClick={() => onNavigateTab('menu')}
                className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Đặt món cho ngày mai</span>
              </button>
            </div>
          </div>
        ) : (
          /* Chưa có đơn đặt cơm hôm nay */
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-7 text-center space-y-3.5">
            <div className="w-14 h-14 bg-blue-50 text-[#0057b8] border border-blue-150 rounded-2xl flex items-center justify-center mx-auto">
              <QrCode className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Chưa có đơn đặt suất ăn hôm nay
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Mã QR chỉ xuất hiện khi bạn có đơn đặt cơm. Vui lòng vào thực đơn để chọn món trước khi đến quầy Canteen nhé!
              </p>
            </div>

            {hasPackage && (
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-[#0057b8] text-left flex items-start gap-2 max-w-xs mx-auto">
                <Sparkles className="w-4 h-4 text-[#0057b8] shrink-0 mt-0.5" />
                <p className="leading-snug text-[11.5px]">
                  Bạn đang có <strong>Vé Tháng Bán Trú (còn {remainingMeals} suất)</strong>. Hãy vào thực đơn đặt món, hệ thống tự động trừ 0đ!
                </p>
              </div>
            )}

            <button
              onClick={() => onNavigateTab('menu')}
              className="px-5 py-2.5 bg-[#0057b8] hover:bg-[#004593] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 mx-auto cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Đặt món ngay</span>
            </button>
          </div>
        )
      ) : selectedOrder?.isWaitingServing ? (
        /* ĐÃ QUÉT MÃ QR -> ĐANG TRONG HÀNG ĐỢI GẮP CƠM */
        <div className="bg-white rounded-3xl border border-amber-300 shadow-md p-6 text-center space-y-4 relative overflow-hidden">
          {/* Top Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>ĐÃ QUÉT MÃ • ĐANG CHỜ GẮP CƠM</span>
            </span>

            <span className="text-xs font-mono font-bold text-slate-500">
              {orderCode}
            </span>
          </div>

          {/* Cooking Illustration */}
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-2xs relative">
            <Utensils className="w-7 h-7 text-amber-600 animate-bounce" />
            <div className="absolute -bottom-1 -right-1 bg-[#0057b8] text-white p-1 rounded-lg">
              <ChefHat className="w-3 h-3" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Đang trong hàng đợi quầy gắp món
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Mã QR đã được ghi nhận. Đơn hàng hiển thị trên màn hình phục vụ, nhân viên đang chuẩn bị khay cơm cho bạn.
            </p>
          </div>

          {/* Order Identity Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-left space-y-1.5">
            <div className="flex items-center justify-between text-xs border-b border-slate-200/60 pb-1.5">
              <span className="text-slate-500">Bữa ăn:</span>
              <span className="font-bold text-slate-800">
                {selectedOrder.mealType === 'BREAKFAST' ? 'Bữa Sáng' : selectedOrder.mealType === 'DINNER' ? 'Bữa Chiều' : 'Bữa Trưa'}
              </span>
            </div>

            {orderItemsSummary && (
              <div className="space-y-0.5 pt-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Khay cơm gồm:
                </span>
                <p className="text-xs font-bold text-[#0057b8] leading-snug">
                  {orderItemsSummary}
                </p>
              </div>
            )}
          </div>

          {/* Waiting Pulse Notice */}
          <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center gap-2 text-left">
            <div className="w-2 h-2 rounded-full bg-[#0057b8] shrink-0 animate-ping" />
            <p className="text-[11px] text-[#0057b8] font-medium leading-snug">
              Màn hình tự động cập nhật khi quầy hoàn tất trao khay cơm.
            </p>
          </div>
        </div>
      ) : (
        /* CÓ ĐƠN ĐẶT CƠM -> HIỂN THỊ THẺ VÉ ĂN ĐIỆN TỬ (CLEAN MINIMALIST DINING TICKET) */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.04)] text-center relative overflow-hidden">
          {tokenError && (
            <div className="m-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-snug">{tokenError}</p>
            </div>
          )}

          {/* TICKET TOP: Header & Status Bar */}
          <div className="p-4 pb-3 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-left">
              <div className="w-2 h-2 rounded-full bg-[#0057b8] animate-ping" />
              <span className="text-xs font-bold text-slate-800">
                {selectedOrder.mealType === 'BREAKFAST' ? 'Bữa Sáng' : selectedOrder.mealType === 'DINNER' ? 'Bữa Chiều' : 'Bữa Trưa'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-mono font-bold text-[#0057b8]">
                {orderCode}
              </span>
            </div>

            {!isServed && !isCancelled && (
              <div
                className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg border ${
                  isExpired
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-slate-100 border-slate-200/70 text-slate-600'
                }`}
              >
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{isExpired ? 'Hết hạn' : `${countdown}s`}</span>
              </div>
            )}
          </div>

          {/* TICKET BODY: QR Code & OTP */}
          <div className="p-4 space-y-3">
            {isExpired ? (
              <div className="py-8 bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-3 p-4">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Mã QR đã hết hạn bảo mật</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mã bảo mật được làm mới định kỳ chống sao chép.
                  </p>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={generatingToken}
                  className="px-4 py-2 bg-[#0057b8] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 mx-auto cursor-pointer shadow-xs hover:bg-[#004593] active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generatingToken ? 'animate-spin' : ''}`} />
                  <span>Tạo mã mới</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs inline-block mx-auto">
                {generatingToken ? (
                  <div className="w-56 h-56 flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-[#0057b8] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center">
                    <QRCodeSVG
                      id="dining-pass-qr-svg"
                      value={qrValue}
                      size={210}
                      level="L"
                      includeMargin={true}
                      fgColor="#000000"
                      bgColor="#ffffff"
                      className="rounded-xl mx-auto block"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Backup OTP Token Section */}
            {!isServed && (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 max-w-xs mx-auto space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                    MÃ ĐỌC TẠI QUẦY (OTP):
                  </span>
                  <button
                    type="button"
                    onClick={copyOtp}
                    className="text-[10px] font-bold text-[#0057b8] flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    {copiedOtp ? <Check className="w-3 h-3 text-[#0057b8]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedOtp ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <p className="text-xl font-bold text-slate-900 font-mono tracking-widest">
                  {otpCode}
                </p>
                <p className="text-[10px] text-slate-400">
                  Đọc mã này nếu camera quét tại quầy gặp sự cố
                </p>
              </div>
            )}
          </div>

          {/* PERFORATED TICKET NOTCHES (Airline Ticket Edge) */}
          <div className="relative flex items-center justify-between">
            <div className="w-4 h-4 rounded-full bg-[#F7FAFE] -ml-2 border-r border-slate-200/80" />
            <div className="flex-1 border-b-2 border-dashed border-slate-200 mx-1.5" />
            <div className="w-4 h-4 rounded-full bg-[#F7FAFE] -mr-2 border-l border-slate-200/80" />
          </div>

          {/* TICKET FOOTER: Student Details & Khay Cơm */}
          <div className="p-4 pt-3 space-y-3">
            <div className="text-left space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Học sinh:</span>
                <span className="font-bold text-slate-800">
                  {user?.fullName || zaloProfile?.name || 'Học sinh FPT'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">MSSV / Thẻ:</span>
                <span className="font-mono font-bold text-[#0057b8]">
                  {user?.studentCode || (user?.cards?.[0]?.cardUid ? user.cards[0].cardUid.replace(/^RFID-/i, '') : 'HS-2026-0098')}
                </span>
              </div>
            </div>

            {/* Tray items summary */}
            {orderItemsSummary && (
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 text-xs text-left">
                <div className="flex items-center gap-1 font-bold text-slate-700 text-[11px] mb-0.5">
                  <Utensils className="w-3.5 h-3.5 text-[#0057b8]" />
                  <span>Khay cơm đã đặt:</span>
                </div>
                <p className="text-slate-600 font-medium leading-relaxed">
                  {orderItemsSummary}
                </p>
              </div>
            )}

            {/* Cut-off Status & Order Edit / Cancel Toolbar */}
            {!isServed && !isCancelled && selectedOrder && (
              <div className="p-2.5 rounded-xl border text-left space-y-2 bg-slate-50 border-slate-200/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${canEdit ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span className="text-[11px] font-semibold text-slate-700">
                      {canEdit
                        ? `Có thể đổi món trước ${cutoffTimeDisplay}`
                        : `Đã chốt món lúc ${cutoffTimeDisplay}`}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    canEdit
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {canEdit ? 'Được đổi' : 'Đã khóa'}
                  </span>
                </div>

                <div className="flex gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    disabled={!canEdit}
                    className="flex-1 py-1.5 px-3 bg-[#0057b8] hover:bg-[#004593] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Đổi món ăn</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelOrder}
                    disabled={!canEdit || isCancelling}
                    className="py-1.5 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isCancelling ? 'Đang hủy...' : 'Hủy đơn'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons: Refresh + Download SVG */}
            {!isServed && (
              <div className="border-t border-slate-100 pt-2.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={generatingToken}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generatingToken ? 'animate-spin' : ''}`} />
                  <span>Làm mới mã</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCard}
                  className="py-2 px-3 rounded-xl bg-blue-50 text-[#0057b8] hover:bg-blue-100 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Lưu ảnh QR</span>
                </button>
              </div>
            )}

            {downloadSuccess && (
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Đã lưu ảnh mã QR vào thiết bị!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Serving Guidelines Trigger */}
      <div className="text-center pt-1">
        <button
          type="button"
          onClick={() => setShowGuideModal(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0057b8] transition cursor-pointer"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Hướng dẫn 4 bước nhận khay tại quầy &gt;</span>
        </button>
      </div>

      {/* Serving Guidelines BottomSheet Modal */}
      {showGuideModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuideModal(false);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-end justify-center p-0 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-250 overscroll-contain modal-scrollable touch-pan-y">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center">
                  <Utensils className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-black text-[#131B2E]">
                  Hướng Dẫn Nhận Khay Ăn Tại Quầy
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="text-xs text-slate-600 space-y-2.5 list-decimal pl-4 leading-relaxed">
              <li>Di chuyển tới làn nhận khay ưu tiên dành cho học sinh có Vé Tháng / Đặt trước.</li>
              <li>Đưa màn hình mã QR trước camera quét của máy tại quầy cách 15-20cm.</li>
              <li>Khi nghe tiếng "Ting!", máy sẽ mở chốt hoặc nhân viên trao khay cơm theo món đã đặt.</li>
              <li>Tự do lấy thêm cơm trắng, cơm lứt và canh nóng miễn phí tại quầy tiếp thực Refill.</li>
            </ol>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-2xl bg-[#0057b8] text-white font-bold text-xs hover:bg-[#004593] transition cursor-pointer"
            >
              Đã hiểu, quay lại quét mã
            </button>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa món ăn đã đặt */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Chỉnh sửa món ăn đã đặt</h3>
                <p className="text-[11px] text-slate-500">
                  Chọn tối đa 3 món • Chốt lúc {cutoffTimeDisplay}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editErrorMsg}</span>
              </div>
            )}

            {editSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-bold">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{editSuccessMsg}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 py-1">
              {loadingMenuDishes ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-[#0057b8] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Đang tải thực đơn hôm nay...</p>
                </div>
              ) : menuDishes.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Không tìm thấy danh sách món thay thế.
                </div>
              ) : (
                menuDishes.map((dish) => {
                  const isChecked = editSelectedDishIds.includes(dish.id);
                  const extraPrice = Number(dish.extraPrice || 0);

                  const toggleDish = () => {
                    if (isChecked) {
                      setEditSelectedDishIds((prev) => prev.filter((id) => id !== dish.id));
                    } else {
                      if (editSelectedDishIds.length >= 3) {
                        alert('Chỉ được chọn tối đa 3 món cho một suất ăn');
                        return;
                      }
                      setEditSelectedDishIds((prev) => [...prev, dish.id]);
                    }
                  };

                  return (
                    <div
                      key={dish.id}
                      onClick={toggleDish}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-[#EFF6FF] border-[#0057b8] ring-1 ring-[#0057b8]/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition ${
                            isChecked ? 'bg-[#0057b8] text-white' : 'border border-slate-300 bg-slate-50'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{dish.name}</p>
                          <p className="text-[10px] text-slate-400">{dish.category || 'Món ăn'}</p>
                        </div>
                      </div>

                      {extraPrice > 0 && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                          +{extraPrice.toLocaleString('vi-VN')}đ
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSubmittingEdit || editSelectedDishIds.length === 0}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#0057b8] hover:bg-[#004593] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isSubmittingEdit ? 'Đang cập nhật...' : `Lưu thay đổi (${editSelectedDishIds.length} món)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
