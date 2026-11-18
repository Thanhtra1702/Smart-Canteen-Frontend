import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { TabKey } from '../components/BottomNavigation';
import {
  QrCodeIcon as QrCode,
  PlusIcon as Plus,
  ArrowsClockwiseIcon as RefreshCw,
  ClockIcon as Clock,
  ForkKnifeIcon as Utensils,
  CheckCircleIcon as CheckCircle,
  WarningCircleIcon as AlertCircle,
  CopyIcon as Copy,
  CheckIcon as Check,
  DownloadSimpleIcon as Download,
  InfoIcon as Info,
  XIcon as X,
  PencilSimpleIcon as Edit3,
  TrashIcon as Trash2,
  ChefHatIcon as ChefHat,
} from '@phosphor-icons/react';
import { DishImage } from '../components/DishImage';
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
    refreshUserData,
    loading,
    showAlert,
    showConfirm,
  } = useApp();

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [qrToken, setQrToken] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(300);
  const [generatingToken, setGeneratingToken] = useState<boolean>(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
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

  useModalScrollLock(showGuideModal);

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
  const [todayStr] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const pendingOrders = activeOrders.filter((o) => {
    if (o.status !== 'PENDING' && o.status !== 'CONFIRMED') return false;
    const ordDate = o.orderDate
      ? new Date(o.orderDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
      : (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) : todayStr);
    return ordDate === todayStr;
  });

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
          } catch {}
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

  const selectedOrderId = selectedOrder?.id;
  const selectedOrderStatus = selectedOrder?.status;

  // Polling hook: Poll orders every 3s when waiting for food
  useEffect(() => {
    if (!selectedOrderId) return;
    const isWaiting =
      selectedOrderStatus === 'PENDING' || selectedOrderStatus === 'CONFIRMED';
    if (!isWaiting) return;

    const interval = setInterval(async () => {
      try {
        await refreshOrders();
      } catch (err) {
        console.error('Lỗi tự động kiểm tra trạng thái đơn:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedOrderId, selectedOrderStatus, refreshOrders]);

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

  const cleanOrderId = selectedOrder?.id ? selectedOrder.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';

  const orderCode = selectedOrder?.id
    ? `#${selectedOrder.id.substring(0, 8).toUpperCase()}`
    : '';

  const otpCode = cleanOrderId
    ? `${cleanOrderId.substring(0, 3)} ${cleanOrderId.substring(3, 6)}`.trim()
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
    const confirmed = await showConfirm({
      title: 'Hủy đơn hàng',
      message: 'Bạn có chắc chắn muốn hủy đơn hàng này không? Tiền/lượt ăn đã thanh toán sẽ được hoàn trả 100% vào tài khoản của bạn.',
      confirmText: 'Hủy đơn',
      cancelText: 'Giữ lại',
      danger: true,
    });
    if (!confirmed) return;

    try {
      setIsCancelling(true);
      const res = await api.put(`/orders/${selectedOrder.id}/cancel`);
      setQrToken('');
      setSelectedOrder(null);
      await refreshOrders();
      await refreshUserData();
      await showAlert(
        res.data?.message || 'Hủy đơn hàng thành công! Số tiền/lượt ăn đã được hoàn trả lại ví.',
        'Đã hủy đơn'
      );
    } catch (err: any) {
      await showAlert(
        err?.response?.data?.message || err?.message || 'Không thể hủy đơn hàng',
        'Lỗi'
      );
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

  const activeShiftTime =
    selectedOrder?.mealType === 'BREAKFAST'
      ? 'Sáng • 06:30 - 08:30'
      : selectedOrder?.mealType === 'DINNER'
      ? 'Chiều • 17:00 - 19:00'
      : 'Trưa • 11:00 - 13:00';

  return (
    <div className="px-3.5 pt-3 sm:px-5 sm:pt-4 pb-28 space-y-3 bg-[#F7FAFE] min-h-screen">
      {/* 1. Header (Minimal & Responsive) */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
          Phiếu Ăn Điện Tử
        </h2>
        {selectedOrder && (
          <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-700 shrink-0">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{activeShiftTime}</span>
          </div>
        )}
      </div>

      {/* 2. Order Switcher: Responsive grid when 2+ orders today */}
      {sortedPendingOrders.length > 1 && (
        <div
          className={`bg-slate-100 p-1 rounded-xl gap-1 grid ${
            sortedPendingOrders.length === 2
              ? 'grid-cols-2'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
          }`}
        >
          {sortedPendingOrders.map((ord, idx) => {
            const isCurrent = selectedOrder?.id === ord.id;
            const shortMeal =
              ord.mealType === 'BREAKFAST' ? 'Sáng' : ord.mealType === 'DINNER' ? 'Chiều' : 'Trưa';
            const isWaiting = ord.isWaitingServing;
            return (
              <button
                key={ord.id}
                type="button"
                onClick={() => setSelectedOrder(ord)}
                className={`min-w-0 px-2 py-2 rounded-lg text-[11px] sm:text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                  isCurrent
                    ? isWaiting
                      ? 'bg-amber-500 text-white shadow-xs font-bold'
                      : 'bg-[#0057b8] text-white shadow-xs font-bold'
                    : isWaiting
                    ? 'text-amber-800 hover:bg-amber-50 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 font-medium'
                }`}
              >
                {isWaiting ? (
                  <Clock className="w-3.5 h-3.5 shrink-0" weight={isCurrent ? 'fill' : 'regular'} />
                ) : (
                  <QrCode className="w-3.5 h-3.5 shrink-0" weight={isCurrent ? 'bold' : 'regular'} />
                )}
                <span className="truncate">
                  Suất {idx + 1} • {shortMeal}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Empty State hoặc Loading khi tải đơn */}
      {!selectedOrder ? (
        loading ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 space-y-4 max-w-lg mx-auto w-full animate-pulse">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="w-32 h-3 bg-slate-200 rounded" />
              <div className="w-12 h-4 bg-slate-100 rounded" />
            </div>
            <div className="w-44 h-44 sm:w-52 sm:h-52 bg-slate-200/80 rounded-2xl mx-auto" />
            <div className="w-48 h-8 bg-slate-100 rounded-xl mx-auto" />
            <div className="space-y-2 pt-2">
              <div className="h-9 bg-slate-100 rounded-xl" />
              <div className="h-9 bg-slate-100 rounded-xl" />
            </div>
          </div>
        ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 text-center space-y-3.5 max-w-md mx-auto w-full">
          <div className="w-12 h-12 bg-blue-50 text-[#0057b8] border border-blue-100 rounded-2xl flex items-center justify-center mx-auto">
            <QrCode className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              Bạn chưa có đơn hàng nào
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Vui lòng chọn món để tạo mã QR nhận suất ăn tại quầy.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('menu')}
            className="px-5 py-2.5 bg-[#0057b8] hover:bg-[#004593] text-white rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow-xs active:scale-95"
          >
            <Utensils className="w-3.5 h-3.5" />
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
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.04)] text-center relative overflow-hidden max-w-lg mx-auto w-full">
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
              <span className="text-xs font-mono font-semibold text-slate-500">
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
              <div className="p-2.5 sm:p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs inline-block mx-auto">
                {generatingToken ? (
                  <div className="w-44 h-44 sm:w-52 sm:h-52 flex flex-col items-center justify-center gap-2 bg-slate-50 rounded-xl animate-pulse">
                    <div className="w-8 h-8 border-3 border-[#0057b8] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[11px] font-medium text-slate-500">Đang tạo mã QR...</span>
                  </div>
                ) : (
                  <div className="w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
                    <QRCodeSVG
                      id="dining-pass-qr-svg"
                      value={qrValue}
                      size={210}
                      level="L"
                      includeMargin={true}
                      fgColor="#000000"
                      bgColor="#ffffff"
                      className="w-full h-full rounded-xl mx-auto block"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Backup OTP Token Section (Minimal 1-row) */}
            {!isServed && otpCode && (
              <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70 max-w-xs mx-auto flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                    OTP
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono tracking-wider truncate">
                    {otpCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyOtp}
                  className="text-[11px] font-bold text-[#0057b8] flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                >
                  {copiedOtp ? <Check className="w-3.5 h-3.5 text-[#0057b8]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedOtp ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            )}
          </div>

          {/* PERFORATED TICKET NOTCHES (Airline Ticket Edge) */}
          <div className="relative flex items-center justify-between">
            <div className="w-4 h-4 rounded-full bg-[#F7FAFE] -ml-2 border-r border-slate-200/80" />
            <div className="flex-1 border-b-2 border-dashed border-slate-200 mx-1.5" />
            <div className="w-4 h-4 rounded-full bg-[#F7FAFE] -mr-2 border-l border-slate-200/80" />
          </div>

          {/* TICKET FOOTER: Minimal Student + Dishes + Actions */}
          <div className="p-4 pt-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-800 truncate">
                {user?.fullName || zaloProfile?.name || 'Học sinh FPT'}
              </span>
              <span className="font-mono font-semibold text-slate-500 shrink-0">
                {user?.studentCode || (user?.cards?.[0]?.cardUid ? user.cards[0].cardUid.replace(/^RFID-/i, '') : 'HS-2026-0098')}
              </span>
            </div>

            {/* Tray items list */}
            {selectedOrder?.items && selectedOrder.items.length > 0 && (
              <ul className="bg-slate-50/90 border border-slate-200/70 rounded-xl px-3 py-1.5 divide-y divide-slate-200/60 text-xs text-left">
                {selectedOrder.items.map((it: any, idx: number) => {
                  const dish = it.dish || it;
                  const dishImg = dish?.image;
                  const dishName = dish?.name || 'Món ăn';
                  return (
                    <li key={dish?.id || idx} className="py-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <DishImage
                          src={dishImg}
                          alt={dishName}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200/70 shrink-0"
                        />
                        <span className="text-slate-700 font-medium truncate">{dishName}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                        x{it.quantity || 1}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Order Edit / Cancel Toolbar */}
            {!isServed && !isCancelled && selectedOrder && (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-[10.5px] text-slate-500 px-0.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${canEdit ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {canEdit ? `Đổi món trước ${cutoffTimeDisplay}` : `Đã chốt lúc ${cutoffTimeDisplay}`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    disabled={!canEdit}
                    className="py-2 px-3 bg-[#0057b8] hover:bg-[#004593] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Đổi món</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelOrder}
                    disabled={!canEdit || isCancelling}
                    className="py-2 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
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
                  <span>Làm mới</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCard}
                  className="py-2 px-3 rounded-xl bg-blue-50 text-[#0057b8] hover:bg-blue-100 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Lưu QR</span>
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

      {/* Serving Guidelines Centered Modal */}
      {showGuideModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuideModal(false);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto overscroll-contain modal-scrollable touch-pan-y">
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
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  Đổi món ăn ({editSelectedDishIds.length}/3)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Chọn tối đa 3 món • Chốt lúc {cutoffTimeDisplay}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i < editSelectedDishIds.length ? 'w-4 bg-[#0057b8]' : 'w-1.5 bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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

            <div className="flex-1 overflow-y-auto py-1 modal-scrollable">
              {loadingMenuDishes ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-2xl border border-slate-100 bg-white p-2.5 flex items-center gap-3 animate-pulse">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="w-3/4 h-3 bg-slate-100 rounded" />
                        <div className="w-1/3 h-2.5 bg-slate-100 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : menuDishes.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Không tìm thấy danh sách món thay thế.
                </div>
              ) : (
                <ul className="space-y-2">
                  {menuDishes.map((dish) => {
                    const isChecked = editSelectedDishIds.includes(dish.id);
                    const extraPrice = Number(dish.extraPrice || 0);
                    const catLabel =
                      dish.category === 'MAIN'
                        ? 'Món chính'
                        : dish.category === 'VEGETABLE'
                        ? 'Rau xào'
                        : dish.category === 'SOUP'
                        ? 'Món canh'
                        : dish.category === 'SIDE'
                        ? 'Món phụ'
                        : dish.category === 'DRINK'
                        ? 'Đồ uống'
                        : dish.category === 'DESSERT'
                        ? 'Tráng miệng'
                        : 'Suất chuẩn';

                    const toggleDish = () => {
                      if (isChecked) {
                        setEditSelectedDishIds((prev) => prev.filter((id) => id !== dish.id));
                      } else {
                        if (editSelectedDishIds.length >= 3) {
                          void showAlert('Chỉ được chọn tối đa 3 món cho một suất ăn.');
                          return;
                        }
                        setEditSelectedDishIds((prev) => [...prev, dish.id]);
                      }
                    };

                    return (
                      <li
                        key={dish.id}
                        onClick={toggleDish}
                        className={`p-2.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-2.5 cursor-pointer active:scale-99 ${
                          isChecked
                            ? 'border-[#0057b8] ring-1 ring-[#0057b8]/40 bg-blue-50/30'
                            : 'border-slate-200/80 bg-white hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <DishImage
                            src={dish.image}
                            alt={dish.name}
                            className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/70 shrink-0"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{dish.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10.5px] font-medium text-slate-500">
                                {catLabel}
                              </span>
                              {extraPrice > 0 && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200">
                                  +{extraPrice.toLocaleString('vi-VN')}đ
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isChecked
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-[#0057b8] text-white shadow-2xs'
                          }`}
                        >
                          {isChecked ? (
                            <Check className="w-3.5 h-3.5" weight="bold" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" weight="bold" />
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSubmittingEdit || editSelectedDishIds.length === 0}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#0057b8] hover:bg-[#004593] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isSubmittingEdit ? 'Đang lưu...' : `Lưu thay đổi (${editSelectedDishIds.length} món)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
