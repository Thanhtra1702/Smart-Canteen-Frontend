import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeftIcon as ArrowLeft,
  ArrowCounterClockwiseIcon as RotateCcw,
  CheckCircleIcon as CheckCircle2,
  WarningCircleIcon as AlertCircle,
  SpeakerHighIcon as Volume2,
  SpeakerSlashIcon as VolumeX,
  ArrowsOutSimpleIcon as Maximize2,
  ArrowsInSimpleIcon as Minimize2,
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';

interface ServingDisplayPageProps {
  canteenId: string;
  isEmbedded?: boolean;
}

export const ServingDisplayPage: React.FC<ServingDisplayPageProps> = ({ canteenId, isEmbedded }) => {
  const [data, setData] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeMealType, setActiveMealType] = useState<string>('LUNCH');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hasSyncedInitialMealRef = useRef(false);

  // Toast notification
  const [scannerToast, setScannerToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const playScanChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // ignore audio context errors
    }
  }, [soundEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(
    async (meal = activeMealType) => {
      try {
        const res = await api.get(`/menu/display/${canteenId}`, {
          params: { mealType: meal },
        });
        setData(res.data);
        if (res.data?.activeMealType && !hasSyncedInitialMealRef.current) {
          hasSyncedInitialMealRef.current = true;
          setActiveMealType(res.data.activeMealType);
        }
      } catch (err: any) {
        console.error('Lỗi tải dữ liệu màn hình quầy gắp món:', err);
      }
    },
    [canteenId, activeMealType]
  );

  useEffect(() => {
    fetchData(activeMealType);
    const interval = setInterval(() => {
      fetchData(activeMealType);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeMealType, fetchData]);

  const handleServingAction = useCallback(
    async (action: string, checkinId?: string) => {
      try {
        setActionLoading(true);
        await api.post(`/menu/display/${canteenId}/action`, {
          action,
          checkinId,
        });
        playScanChime();
        await fetchData(activeMealType);
      } catch (err: any) {
        console.error('Lỗi cập nhật phục vụ:', err);
      } finally {
        setActionLoading(false);
      }
    },
    [canteenId, activeMealType, playScanChime, fetchData]
  );

  const handleCheckinToken = useCallback(
    async (tokenToUse: string) => {
      const rawClean = tokenToUse.trim();
      const clean = rawClean.replace(/^#/, '').replace(/\s+/g, '').trim();
      if (!clean) return;

      try {
        setActionLoading(true);
        let res: any;

        if (
          rawClean.startsWith('ORDER:') ||
          rawClean.startsWith('cheero://pass/') ||
          rawClean.startsWith('CANTEEN_ORDER:')
        ) {
          const orderId = rawClean
            .replace('cheero://pass/', '')
            .replace('CANTEEN_ORDER:', '')
            .replace('ORDER:', '')
            .replace(/^#/, '')
            .trim();
          res = await api.post('/checkin/order', { orderId, canteenId });
        } else if (/^[0-9a-fA-F-]{6,36}$/.test(clean)) {
          try {
            res = await api.post('/checkin/order', { orderId: clean, canteenId });
          } catch {
            res = await api.post('/checkin/qr', { qrToken: clean, canteenId, mealType: activeMealType });
          }
        } else {
          res = await api.post('/checkin/qr', { qrToken: clean, canteenId, mealType: activeMealType });
        }

        const orderMealType = res.data?.checkin?.mealType || res.data?.order?.mealType;
        const targetMeal = orderMealType || activeMealType;
        if (orderMealType && orderMealType !== activeMealType) {
          setActiveMealType(orderMealType);
        }

        playScanChime();
        setScannerToast({
          type: 'success',
          text: res.data?.message || 'Check-in nhận cơm thành công!',
        });
        await fetchData(targetMeal);
        setTimeout(() => setScannerToast(null), 3500);
      } catch (err: any) {
        setScannerToast({
          type: 'error',
          text: err?.response?.data?.message || err?.message || 'Mã QR không hợp lệ hoặc đã sử dụng',
        });
        setTimeout(() => setScannerToast(null), 3500);
      } finally {
        setActionLoading(false);
      }
    },
    [canteenId, activeMealType, playScanChime, fetchData]
  );

  // Keyboard & USB Barcode Gun Listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const now = Date.now();

      if (e.code === 'Enter') {
        if (buffer.length >= 4) {
          e.preventDefault();
          const scannedToken = buffer;
          buffer = '';
          handleCheckinToken(scannedToken);
          return;
        } else if (data?.currentServing?.id && !actionLoading) {
          e.preventDefault();
          handleServingAction('COMPLETE_SERVING', data.currentServing.id);
          return;
        }
      }

      if (e.code === 'Space') {
        if (data?.currentServing?.id && !actionLoading) {
          e.preventDefault();
          handleServingAction('COMPLETE_SERVING', data.currentServing.id);
          return;
        }
      }

      if (e.key && e.key.length === 1) {
        if (now - lastKeyTime > 120) {
          buffer = '';
        }
        buffer += e.key;
        lastKeyTime = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data?.currentServing, actionLoading, handleServingAction, handleCheckinToken]);

  const currentMenu = data?.todayMenus?.find((m: any) => m.mealType === activeMealType);
  const menuDishes = currentMenu?.items?.map((i: any) => i.dish) || [];

  const waitingQueue = data?.waitingQueue || [];
  const currentServing = data?.currentServing || null;
  const completedQueue = data?.completedQueue || [];

  const getStudentName = (item: any) => item?.userName || item?.studentName || 'Học sinh';
  const getItemTime = (item: any) => {
    if (item?.timeStr) return item.timeStr;
    const raw = item?.servedAt || item?.checkedInAt;
    if (!raw) return '';
    return new Date(raw).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Compose dish list
  const dishesToServe: { name: string; category?: string }[] = [];
  if (currentServing?.preOrderedDishes && currentServing.preOrderedDishes.length > 0) {
    currentServing.preOrderedDishes.forEach((d: any) => {
      dishesToServe.push({ name: d.name, category: d.category || 'MAIN' });
    });
  } else if (currentServing?.dishes && currentServing.dishes.length > 0) {
    currentServing.dishes.forEach((d: any) => {
      if (typeof d === 'string') {
        const isSoup = d.toLowerCase().startsWith('canh');
        dishesToServe.push({ name: d, category: isSoup ? 'SOUP' : 'MAIN' });
      } else {
        dishesToServe.push({ name: d.name, category: d.category || 'MAIN' });
      }
    });
  } else {
    dishesToServe.push({ name: 'Cơm trắng', category: 'BASE' });
    menuDishes.forEach((d: any) => {
      dishesToServe.push({ name: d.name, category: d.category });
    });
    dishesToServe.push({ name: 'Canh nóng trong ngày', category: 'SOUP' });
  }

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'MAIN':
        return 'Món chính';
      case 'SIDE':
        return 'Món phụ';
      case 'SOUP':
        return 'Canh';
      case 'BASE':
        return 'Cơm';
      case 'DESSERT':
        return 'Tráng miệng';
      case 'DRINK':
        return 'Đồ uống';
      default:
        return '';
    }
  };

  return (
    <div
      className={`min-h-screen bg-[#F7FAFE] text-slate-900 font-sans select-none flex flex-col p-4 sm:p-5 gap-3.5 antialiased ${
        isEmbedded ? 'p-0 bg-transparent min-h-full' : ''
      }`}
    >
      {/* Toast Notification */}
      {scannerToast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl border shadow-sm flex items-center gap-2 text-xs font-medium transition-all ${
            scannerToast.type === 'success'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {scannerToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span>{scannerToast.text}</span>
        </div>
      )}

      {/* Minimal Header */}
      <header className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {!isEmbedded && (
            <button
              type="button"
              onClick={() => window.history.back()}
              className="size-8 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Quay lại"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-slate-900 truncate">
                {data?.canteen?.name || 'Quầy phục vụ suất ăn'}
              </h1>
              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" title="Đang kết nối" />
            </div>
          </div>
        </div>

        {/* Meal Switcher */}
        <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs">
          {[
            { id: 'BREAKFAST', label: 'Ca Sáng' },
            { id: 'LUNCH', label: 'Ca Trưa' },
            { id: 'DINNER', label: 'Ca Tối' },
          ].map((meal) => {
            const isActive = activeMealType === meal.id;
            return (
              <button
                key={meal.id}
                type="button"
                onClick={() => {
                  setActiveMealType(meal.id);
                  fetchData(meal.id);
                }}
                className={`h-7 px-3 rounded-lg transition cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                {meal.label}
              </button>
            );
          })}
        </div>

        {/* Tools */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="size-8 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4 text-slate-400" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="size-8 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>

          <span className="font-mono text-xs font-medium text-slate-600 tabular-nums pl-2 border-l border-slate-200 hidden sm:inline">
            {currentTime || '--:--:--'}
          </span>
        </div>
      </header>

      {/* Three Columns */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch min-h-0">
        {/* COL 1: HÀNG ĐỢI */}
        <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">Hàng đợi</span>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {waitingQueue.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 max-h-[calc(100vh-16rem)]">
            {waitingQueue.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Hàng đợi trống
              </div>
            ) : (
              waitingQueue.map((item: any, idx: number) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleServingAction('START_SERVING', item.id)}
                  className="w-full p-2.5 rounded-xl border border-slate-200/75 bg-white hover:border-[#0057b8] hover:bg-slate-50/50 cursor-pointer transition text-left flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-800 truncate">
                      {item.seqDisplay || `#${idx + 1}`} · {getStudentName(item)}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                      {item.studentCode || '—'}
                      {getItemTime(item) ? ` • ${getItemTime(item)}` : ''}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 group-hover:text-[#0057b8] shrink-0">
                    Gắp →
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        {/* COL 2: KHAY ĐANG PHỤC VỤ */}
        <section className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between p-6">
          {currentServing ? (
            <div className="space-y-6">
              {/* Student Header */}
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span>Đang phục vụ</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5 tracking-tight truncate">
                    {getStudentName(currentServing)}
                  </h2>
                  {currentServing.allergies && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
                      <AlertCircle className="size-4 text-rose-600 shrink-0" />
                      <span>Lưu ý dị ứng: {currentServing.allergies}</span>
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-400">Mã thẻ</div>
                  <div className="font-mono text-base sm:text-lg font-semibold text-slate-800 mt-0.5">
                    {currentServing.studentCode || currentServing.id?.slice(0, 8)}
                  </div>
                </div>
              </div>

              {/* Clean Dish List */}
              <div className="space-y-2.5">
                <span className="text-sm font-medium text-slate-500 block">
                  Khay phần ăn ({dishesToServe.length} món)
                </span>
                <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100">
                  {dishesToServe.map((dish, idx) => {
                    const catLabel = getCategoryLabel(dish.category);
                    return (
                      <div
                        key={idx}
                        className="px-4 py-3.5 flex items-center justify-between gap-4"
                      >
                        <span className="text-base sm:text-lg font-medium text-slate-900">
                          {dish.name}
                        </span>
                        {catLabel && (
                          <span className="text-sm text-slate-400 shrink-0">{catLabel}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="my-auto py-20 text-center text-sm text-slate-400">
              Quầy hiện đang trống. Chọn học sinh từ hàng đợi để bắt đầu phục vụ.
            </div>
          )}

          {currentServing && (
            <div className="pt-5 mt-6 border-t border-slate-100">
              <Button
                variant="primary"
                size="lg"
                className="w-full h-12 text-sm sm:text-base font-semibold cursor-pointer"
                disabled={actionLoading}
                loading={actionLoading}
                onClick={() => handleServingAction('COMPLETE_SERVING', currentServing.id)}
              >
                {actionLoading ? 'Đang cập nhật...' : 'Hoàn tất khay ăn (Space)'}
              </Button>
            </div>
          )}
        </section>

        {/* COL 3: ĐÃ NHẬN KHAY */}
        <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">Đã nhận khay</span>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {completedQueue.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 max-h-[calc(100vh-16rem)]">
            {completedQueue.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Chưa có lượt hoàn tất
              </div>
            ) : (
              completedQueue.map((item: any) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl border border-slate-200/70 bg-slate-50/50 text-xs flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-700 truncate">
                      {getStudentName(item)}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {getItemTime(item) || 'Vừa xong'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleServingAction('UNDO_COMPLETED', item.id)}
                    className="size-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white flex items-center justify-center transition cursor-pointer shrink-0"
                    title="Hoàn tác"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
