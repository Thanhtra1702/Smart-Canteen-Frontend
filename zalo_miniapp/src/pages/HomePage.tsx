import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { TabKey } from '../components/BottomNavigation';
import {
  Hourglass,
  Calendar,
  Clock,
  Utensils,
  Sparkles,
  Check,
  Plus,
  Minus,
  ArrowRight,
  Soup,
  Sun,
  Sunset,
  Moon,
  Info,
  X,
  ShieldCheck,
  CreditCard,
  QrCode,
  Flame,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { DishDetailModal } from '../components/DishDetailModal';
import { CheckoutConfirmationModal, type CheckoutPaymentMethod } from '../components/CheckoutConfirmationModal';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

interface HomePageProps {
  onGoToTab: (tab: TabKey) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onGoToTab }) => {
  const {
    user,
    selectedCanteen,
    wallet,
    refreshUserData,
    refreshOrders,
    maxDishes,
  } = useApp();

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

  // Selected date: 'todayStr' or 'tomorrowStr'
  const [orderDate, setOrderDate] = useState<string>(todayStr);

  // 'BREAKFAST', 'LUNCH', or 'DINNER'
  const [selectedMealSlot, setSelectedMealSlot] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER'>('LUNCH');
  const [orderQuantity, setOrderQuantity] = useState<number>(1);

  // Live dishes fetched from API for selected canteen & meal slot
  const [availableDishes, setAvailableDishes] = useState<any[]>([]);
  const [isLoadingDishes, setIsLoadingDishes] = useState<boolean>(false);

  // Free dish selection up to maxDishes per portion (default 3)
  const [selectedDishes, setSelectedDishes] = useState<any[]>([]);
  const [inspectingDish, setInspectingDish] = useState<any | null>(null);

  // Weekly modal & Checkout modal
  const [showWeeklyModal, setShowWeeklyModal] = useState<boolean>(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Modal background scroll lock hook
  useModalScrollLock(showWeeklyModal || showCheckoutModal);

  // Countdown timer for meal cutoff
  const [remainingSeconds, setRemainingSeconds] = useState<number>(22 * 60 + 2);
  const [isPastCutoff, setIsPastCutoff] = useState<boolean>(false);

  // Vietnam Time & Cutoff logic
  const getVnSeconds = () => {
    const vnTimeStr = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
    const [h, m, s] = vnTimeStr.split(':').map(Number);
    return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
  };

  const getSlotCutoffSeconds = useCallback(
    (slot: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
      let cutoffStr = '10:30';
      if (slot === 'BREAKFAST') cutoffStr = selectedCanteen?.cutoffBreakfast || '07:00';
      else if (slot === 'LUNCH') cutoffStr = selectedCanteen?.cutoffLunch || '10:30';
      else if (slot === 'DINNER') cutoffStr = selectedCanteen?.cutoffDinner || '16:00';

      const [cutHour, cutMin] = cutoffStr.split(':').map(Number);
      if (cutHour === 23 && cutMin === 59) return 86400;
      return (cutHour || 0) * 3600 + (cutMin || 0) * 60;
    },
    [selectedCanteen]
  );

  const isSlotPastCutoff = useCallback(
    (slot: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
      if (orderDate !== todayStr) return false;
      const curSeconds = getVnSeconds();
      const cutoffSeconds = getSlotCutoffSeconds(slot);
      return curSeconds > cutoffSeconds;
    },
    [orderDate, todayStr, getSlotCutoffSeconds]
  );

  const availableSlots = (['BREAKFAST', 'LUNCH', 'DINNER'] as const).filter(
    (slot) => !isSlotPastCutoff(slot)
  );

  // Auto-switch to next open meal slot or auto-switch to tomorrow if all today's slots are closed
  useEffect(() => {
    if (orderDate === todayStr) {
      if (availableSlots.length === 0) {
        // All today's meal slots are closed -> automatically default to tomorrow
        setOrderDate(tomorrowStr);
      } else if (!availableSlots.includes(selectedMealSlot)) {
        // Currently selected slot is past cutoff -> switch to first open slot
        setSelectedMealSlot(availableSlots[0]);
        setSelectedDishes([]);
      }
    }
  }, [orderDate, todayStr, tomorrowStr, availableSlots, selectedMealSlot]);

  useEffect(() => {
    const calcCutoff = () => {
      const curSeconds = getVnSeconds();
      const cutoffSeconds = getSlotCutoffSeconds(selectedMealSlot);
      const past = orderDate === todayStr && curSeconds > cutoffSeconds;
      setIsPastCutoff(past);
      const rem = Math.max(0, cutoffSeconds - curSeconds);
      setRemainingSeconds(rem);
    };

    calcCutoff();
    const timer = setInterval(calcCutoff, 1000);
    return () => clearInterval(timer);
  }, [selectedMealSlot, selectedCanteen, orderDate, todayStr, getSlotCutoffSeconds]);

  // Load live dishes from database based on selected canteen & date & mealSlot
  useEffect(() => {
    let isMounted = true;
    const fetchDishes = async () => {
      if (!selectedCanteen?.id) return;
      try {
        setIsLoadingDishes(true);
        const res = await api.get('/menu/today', {
          params: { canteenId: selectedCanteen.id, date: orderDate },
        });
        const menus = res.data || [];
        const currentSlotMenu = Array.isArray(menus)
          ? menus.find((m: any) => m.mealType === selectedMealSlot)
          : null;

        if (currentSlotMenu && Array.isArray(currentSlotMenu.items) && currentSlotMenu.items.length > 0) {
          const dishes = currentSlotMenu.items.map((it: any) => ({
            id: it.dish.id,
            name: it.dish.name,
            description: it.dish.description,
            category: it.dish.category,
            extraPrice: Number(it.dish.extraPrice || 0),
                        image: it.dish.image || '',
            isBestSeller: Number(it.dish.extraPrice || 0) > 0,
          }));
          if (isMounted) setAvailableDishes(dishes);
        } else {
          // Fallback to canteen's dishes
          const dishesRes = await api.get('/menu/dishes', {
            params: { canteenId: selectedCanteen.id },
          });
          const rawDishes = dishesRes.data || [];
          if (Array.isArray(rawDishes) && rawDishes.length > 0) {
            const formatted = rawDishes.map((d: any) => ({
              id: d.id,
              name: d.name,
              description: d.description,
              category: d.category,
              extraPrice: Number(d.extraPrice || 0),
                            image: d.image || '',
              isBestSeller: Number(d.extraPrice || 0) > 0,
            }));
            if (isMounted) setAvailableDishes(formatted);
          } else {
            if (isMounted) setAvailableDishes([]);
          }
        }
      } catch (e) {
        console.error('Lỗi khi tải thực đơn:', e);
        if (isMounted) setAvailableDishes([]);
      } finally {
        if (isMounted) setIsLoadingDishes(false);
      }
    };

    fetchDishes();
    return () => {
      isMounted = false;
    };
  }, [selectedCanteen?.id, orderDate, selectedMealSlot]);

  // Keep selected dishes valid
  useEffect(() => {
    setSelectedDishes((prev) => prev.filter((d) => availableDishes.some((a) => a.id === d.id)));
  }, [availableDishes]);

  const formatCountdown = (totalSec: number) => {
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const isBreakfast = selectedMealSlot === 'BREAKFAST';
  const unitPrice = isBreakfast ? 20000 : 30000;
  const originalPrice = isBreakfast ? 25000 : 35000;
  const effectiveMaxDishes = Number(
    selectedCanteen?.mealPrices?.find((p: any) => p.mealType === selectedMealSlot)?.maxDishes ||
    maxDishes ||
    3
  );

  const hasActivePass = (wallet?.remainingMeals || 0) > 0;
  const remainingMeals = wallet?.remainingMeals || 0;
  // Always display retail price on menu selection bar; payment method (pass/wallet/etc.) is chosen during checkout
  const totalPrice = unitPrice * orderQuantity;

  // Cutoff times configured for canteen
  const cutoffBreakfast = selectedCanteen?.cutoffBreakfast || '07:00';
  const cutoffLunch = selectedCanteen?.cutoffLunch || '10:30';
  const cutoffDinner = selectedCanteen?.cutoffDinner || '16:00';

  const currentCutoffTime =
    selectedMealSlot === 'BREAKFAST'
      ? cutoffBreakfast
      : selectedMealSlot === 'LUNCH'
      ? cutoffLunch
      : cutoffDinner;

  const currentServingTime =
    selectedMealSlot === 'BREAKFAST'
      ? '06:30 - 08:30'
      : selectedMealSlot === 'LUNCH'
      ? '11:00 - 13:00'
      : '17:00 - 19:00';

  // Toggle dish selection (up to effectiveMaxDishes, default 3)
  const handleToggleDish = (dish: any) => {
    const exists = selectedDishes.some((d) => d.id === dish.id);
    if (exists) {
      setSelectedDishes(selectedDishes.filter((d) => d.id !== dish.id));
    } else {
      if (selectedDishes.length < effectiveMaxDishes) {
        setSelectedDishes([...selectedDishes, dish]);
      } else {
        alert(`Mỗi suất ăn tại cơ sở này chọn tối đa ${effectiveMaxDishes} món.`);
      }
    }
  };

  const isComboComplete = selectedDishes.length > 0 && selectedDishes.length <= effectiveMaxDishes;

  // Order summary text
  const traySummary = () => {
    if (selectedDishes.length === 0) return 'Chưa chọn món';
    return `${selectedDishes.map((d) => d.name).join(' + ')} (${selectedDishes.length}/${effectiveMaxDishes} món)`;
  };

  // Execute checkout
  const handleExecuteCheckout = async (paymentMethod: CheckoutPaymentMethod, note: string) => {
    try {
      setIsSubmitting(true);
      setCheckoutError(null);
      const canteenId = selectedCanteen?.id;
      if (!canteenId) {
        throw new Error('Vui lòng chọn cơ sở Canteen trước khi đặt món.');
      }

      const backendPaymentMethod =
        paymentMethod === 'PASS'
          ? 'MEAL_PASS'
          : paymentMethod === 'WALLET'
          ? 'WALLET'
          : paymentMethod;

      // Call live backend API with real dish IDs from selected canteen
      const res = await api.post('/orders', {
        canteenId,
        mealType: selectedMealSlot,
        orderDate,
        quantity: orderQuantity,
        paymentMethod: backendPaymentMethod,
        note: note ? note.trim() : undefined,
        items: selectedDishes.map((d) => ({
          dishId: d.id,
          name: d.name,
          quantity: 1,
        })),
      });

      const createdOrderId = res.data?.order?.id || res.data?.orders?.[0]?.id || (Array.isArray(res.data) ? res.data[0]?.id : undefined);
      if (createdOrderId) {
        try {
          localStorage.setItem('canteen_last_created_order_id', createdOrderId);
        } catch (_) {}
      }

      if (paymentMethod === 'VIETQR' && res.data?.vietqrUrl) {
        setSelectedDishes([]);
        await refreshUserData();
        await refreshOrders();
        return res.data;
      }

      setShowCheckoutModal(false);
      setSelectedDishes([]);
      setCheckoutSuccess(
        paymentMethod === 'PASS'
          ? 'Đặt suất thành công! 1 lượt ăn đã được trừ từ Vé Tháng.'
          : 'Đặt suất thành công! Đơn hàng đã được xác nhận thanh toán.'
      );

      await refreshUserData();
      await refreshOrders();

      setTimeout(() => {
        setCheckoutSuccess(null);
        onGoToTab('qr'); // Navigate directly to QR Nhận screen
      }, 1200);

      return res.data;
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Không thể hoàn tất đặt suất ăn. Vui lòng kiểm tra lại.';
      setCheckoutError(errMsg);
      throw new Error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-36 space-y-3.5 bg-[#F7FAFE] min-h-screen">
      {/* 1. CUT-OFF ALERT COUNTDOWN BANNER (Clean & Minimalist Status Card) */}
      <div className="px-4 pt-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              orderDate === todayStr && !isPastCutoff
                ? 'bg-blue-50 text-[#0057b8] border border-blue-100'
                : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}>
              <Hourglass className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase leading-none">
                {orderDate === todayStr
                  ? (isPastCutoff ? 'ĐÃ QUA GIỜ CHỐT HÔM NAY' : `CHỐT ĐƠN ${isBreakfast ? 'SÁNG' : selectedMealSlot === 'LUNCH' ? 'TRƯA' : 'CHIỀU'} (${currentCutoffTime})`)
                  : `ĐẶT TRƯỚC NGÀY MAI (${currentCutoffTime})`}
              </p>
              <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                {orderDate === todayStr
                  ? (isPastCutoff ? 'Vui lòng chọn Ngày mai để đặt món' : 'Thời gian nhận đơn còn lại:')
                  : 'Bếp tiếp nhận & chuẩn bị nguyên liệu'}
              </p>
            </div>
          </div>

          {orderDate === todayStr && !isPastCutoff ? (
            <div className="bg-slate-100/80 border border-slate-200/60 px-2.5 py-1 rounded-xl shrink-0">
              <span className="text-[#0057b8] font-bold text-xs tracking-wider font-mono">
                {formatCountdown(remainingSeconds)}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOrderDate(orderDate === todayStr ? tomorrowStr : todayStr)}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-200/80 text-slate-700 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl transition cursor-pointer active:scale-95 shrink-0"
            >
              {orderDate === todayStr ? 'Đổi sang Ngày mai' : 'Đổi sang Hôm nay'}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* 2. DAY & WEEK SELECTOR (Clean Segmented Control) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/50">
            <button
              type="button"
              onClick={() => setOrderDate(todayStr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                orderDate === todayStr
                  ? 'bg-white text-[#0057b8] shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${orderDate === todayStr ? 'bg-[#0057b8]' : 'bg-slate-300'}`} />
              <span>Hôm nay</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderDate(tomorrowStr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                orderDate === tomorrowStr
                  ? 'bg-white text-[#0057b8] shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${orderDate === tomorrowStr ? 'bg-[#0057b8]' : 'bg-slate-300'}`} />
              <span>Ngày mai</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowWeeklyModal(true)}
            className="bg-white hover:bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs active:scale-95"
          >
            <Calendar className="w-3.5 h-3.5 text-[#0057b8]" />
            <span>Thực đơn tuần</span>
          </button>
        </div>

        {/* 3. MEAL SLOT FILTER (Clean & Lightweight Tabs) */}
        {availableSlots.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.includes('BREAKFAST') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMealSlot('BREAKFAST');
                    setSelectedDishes([]);
                  }}
                  className={`p-2 rounded-xl text-left transition-all cursor-pointer border active:scale-95 flex flex-col justify-between ${
                    selectedMealSlot === 'BREAKFAST'
                      ? 'bg-[#0057b8] text-white border-[#0057b8] shadow-xs'
                      : 'bg-white border-slate-200/80 text-slate-700 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Sun className={`w-4 h-4 ${selectedMealSlot === 'BREAKFAST' ? 'text-amber-200' : 'text-amber-500'}`} />
                    <span className={`text-[9px] font-mono ${selectedMealSlot === 'BREAKFAST' ? 'text-sky-100' : 'text-slate-400'}`}>
                      {cutoffBreakfast}
                    </span>
                  </div>
                  <div className="mt-1">
                    <p className="text-xs font-bold leading-tight">Bữa Sáng</p>
                    <p className={`text-[9px] mt-0.5 ${selectedMealSlot === 'BREAKFAST' ? 'text-sky-100' : 'text-slate-400'}`}>
                      Chốt: {cutoffBreakfast}
                    </p>
                  </div>
                </button>
              )}

              {availableSlots.includes('LUNCH') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMealSlot('LUNCH');
                    setSelectedDishes([]);
                  }}
                  className={`p-2 rounded-xl text-left transition-all cursor-pointer border active:scale-95 flex flex-col justify-between ${
                    selectedMealSlot === 'LUNCH'
                      ? 'bg-[#0057b8] text-white border-[#0057b8] shadow-xs'
                      : 'bg-white border-slate-200/80 text-slate-700 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Sunset className={`w-4 h-4 ${selectedMealSlot === 'LUNCH' ? 'text-orange-200' : 'text-orange-500'}`} />
                    <span className={`text-[9px] font-mono ${selectedMealSlot === 'LUNCH' ? 'text-sky-100' : 'text-slate-400'}`}>
                      {cutoffLunch}
                    </span>
                  </div>
                  <div className="mt-1">
                    <p className="text-xs font-bold leading-tight">Bữa Trưa</p>
                    <p className={`text-[9px] mt-0.5 ${selectedMealSlot === 'LUNCH' ? 'text-sky-100' : 'text-slate-400'}`}>
                      Chốt: {cutoffLunch}
                    </p>
                  </div>
                </button>
              )}

              {availableSlots.includes('DINNER') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMealSlot('DINNER');
                    setSelectedDishes([]);
                  }}
                  className={`p-2 rounded-xl text-left transition-all cursor-pointer border active:scale-95 flex flex-col justify-between ${
                    selectedMealSlot === 'DINNER'
                      ? 'bg-[#0057b8] text-white border-[#0057b8] shadow-xs'
                      : 'bg-white border-slate-200/80 text-slate-700 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Moon className={`w-4 h-4 ${selectedMealSlot === 'DINNER' ? 'text-indigo-200' : 'text-indigo-500'}`} />
                    <span className={`text-[9px] font-mono ${selectedMealSlot === 'DINNER' ? 'text-sky-100' : 'text-slate-400'}`}>
                      {cutoffDinner}
                    </span>
                  </div>
                  <div className="mt-1">
                    <p className="text-xs font-bold leading-tight">Bữa Chiều</p>
                    <p className={`text-[9px] mt-0.5 ${selectedMealSlot === 'DINNER' ? 'text-sky-100' : 'text-slate-400'}`}>
                      Chốt: {cutoffDinner}
                    </p>
                  </div>
                </button>
              )}
            </div>

            {/* Thông tin phục vụ ca */}
            <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100/60 rounded-xl px-3 py-1.5 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock className="w-3.5 h-3.5 text-[#0057b8] shrink-0" />
                <span className="text-[11px] text-slate-600">
                  Chốt nhận đơn:
                </span>
                <span className="text-[11px] font-bold text-[#0057b8]">
                  Trước {currentCutoffTime}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium shrink-0">
                Phục vụ: {currentServingTime}
              </span>
            </div>
          </div>
        )}

        {/* 4. COMBO BUILDER CARD CONTAINER */}
        {orderDate === todayStr && availableSlots.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <Hourglass className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Đã qua giờ chốt đơn tất cả các ca hôm nay
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Nhà bếp đã đóng nhận đơn để tiến hành sơ chế và phục vụ. Bạn vui lòng chọn <strong>Ngày mai</strong> để đặt món trước nhé!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOrderDate(tomorrowStr)}
              className="px-4 py-2 bg-[#0057b8] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#004593] transition cursor-pointer inline-flex items-center gap-2 active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>Chuyển sang đặt món Ngày mai</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3.5">
            {/* Header Title & Pricing */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <p className="text-[9.5px] font-bold text-[#0057b8] uppercase tracking-wider">
                  {isBreakfast ? 'ĐIỂM TÂM SÁNG HỌC ĐƯỜNG' : 'TIÊU CHUẨN CANTEEN'}
                </p>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  {isBreakfast ? 'Combo Điểm Tâm Sáng' : 'Combo Tiêu Chuẩn Sinh Viên'}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-[#0057b8] leading-none font-mono">
                  {formatVND(unitPrice)}
                </p>
                <p className="text-[10px] text-slate-400 line-through mt-0.5">
                  {formatVND(originalPrice)}
                </p>
              </div>
            </div>

            {/* DANH SÁCH MÓN ĂN TỰ CHỌN CHO SUẤT ĂN */}
            <div>
              {/* Progress Selection Indicator */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Chọn tối đa {effectiveMaxDishes} món
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({selectedDishes.length}/{effectiveMaxDishes} đã chọn)
                  </span>
                </div>

                {/* Mini Segment Progress Dots */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: effectiveMaxDishes }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        i < selectedDishes.length ? 'w-4 bg-[#0057b8]' : 'w-2 bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Grid Món Ăn */}
              {isLoadingDishes ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-2xl border border-slate-150 bg-white p-2.5 space-y-2 animate-pulse">
                      <div className="w-full h-24 bg-slate-100 rounded-xl" />
                      <div className="w-3/4 h-3 bg-slate-100 rounded" />
                      <div className="w-1/2 h-2.5 bg-slate-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : availableDishes.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 p-4">
                  <p className="font-semibold text-slate-700">Chưa có món ăn phục vụ cho ca này</p>
                  <p className="text-[11px] text-slate-400 mt-1">Canteen đang hoàn thiện thực đơn hoặc bạn có thể đổi ca khác để xem món.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {availableDishes.map((dish: any) => {
                    const isSelected = selectedDishes.some((d) => d.id === dish.id);

                    return (
                      <div
                        key={dish.id}
                        className={`group rounded-2xl border transition-all duration-150 overflow-hidden bg-white shadow-2xs flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#0057b8] ring-1 ring-[#0057b8] bg-blue-50/20'
                            : 'border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        {/* Ảnh món ăn + Nút xem chi tiết (i) */}
                        <div
                          onClick={() => setInspectingDish(dish)}
                          className="relative h-28 w-full bg-slate-100 cursor-pointer overflow-hidden"
                        >
                          {dish.image ? (
                            <img
                              src={dish.image}
                              alt={dish.name}
                              className="w-full h-full object-cover group-hover:scale-103 transition duration-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/30 text-slate-400 p-2 select-none">
                              <div className="w-9 h-9 rounded-xl bg-white shadow-2xs border border-slate-200/60 flex items-center justify-center mb-1 text-slate-400 group-hover:text-[#0057b8] transition duration-150">
                                <Utensils className="w-4 h-4" />
                              </div>
                              <span className="text-[9px] font-medium text-slate-400 text-center leading-tight">
                                Món tươi mới
                              </span>
                            </div>
                          )}
                          {dish.isBestSeller && (
                            <span className="absolute top-2 left-2 bg-white/95 backdrop-blur-xs text-[#0057b8] text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
                              Bán chạy
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectingDish(dish);
                            }}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/35 text-white flex items-center justify-center backdrop-blur-xs hover:bg-black/55 transition cursor-pointer"
                            title="Xem chi tiết dinh dưỡng"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Tiêu đề món + Nút chọn nhanh */}
                        <div className="p-2.5 flex items-center justify-between gap-1.5">
                          <div
                            onClick={() => setInspectingDish(dish)}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {dish.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {dish.extraPrice > 0 ? `+${formatVND(dish.extraPrice)}` : (dish.tag || 'Món chính')}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleDish(dish)}
                            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90 ${
                              isSelected
                                ? 'bg-[#0057b8] text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                            title={isSelected ? 'Bỏ chọn' : 'Chọn món'}
                          >
                            {isSelected ? (
                              <Check className="w-4 h-4 stroke-[3px]" />
                            ) : (
                              <Plus className="w-4 h-4 stroke-[2.5px]" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Complimentary Free Refill Banner (Clean & Delightful) */}
            <div className="bg-slate-50 border border-slate-200/70 p-2.5 rounded-xl space-y-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                MIỄN PHÍ TẠI QUẦY (ĐÃ BAO GỒM 0Đ):
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-150 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-[11px] text-slate-800">Cơm trắng / Lứt</p>
                    <p className="text-[9.5px] text-emerald-600 font-medium">Lấy thêm tùy sức</p>
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-150 flex items-center gap-2">
                  <Soup className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-[11px] text-slate-800">Canh nóng súp</p>
                    <p className="text-[9.5px] text-emerald-600 font-medium">Nóng hổi mỗi ngày</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. DOCKED FLOATING CHECKOUT BAR (Clean Minimalist Island) */}
      {availableSlots.length > 0 && (
        <div
          className="fixed left-0 right-0 max-w-md mx-auto px-3.5 z-40 transition-all duration-200"
          style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200/90 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
            {/* Top row: Summary + Stepper */}
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-[#0057b8] shrink-0 text-[11px]">
                  Khay cơm:
                </span>
                <span className="text-slate-500 truncate text-[11px]">{traySummary()}</span>
              </div>

              {/* Stepper */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                  className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-black cursor-pointer active:scale-90"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-bold text-[11px] px-2 text-slate-800 font-mono">
                  {orderQuantity} suất
                </span>
                <button
                  type="button"
                  onClick={() => setOrderQuantity(orderQuantity + 1)}
                  className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-black cursor-pointer active:scale-90"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Bottom row: Total Price + CTA Button */}
            <div className="flex items-center justify-between pt-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block leading-none font-medium">Tổng tiền</span>
                <span className="text-base font-bold text-slate-900 font-mono tracking-tight mt-0.5 inline-block">
                  {formatVND(totalPrice)}
                </span>
              </div>

              <button
                type="button"
                disabled={!isComboComplete || isSubmitting}
                onClick={() => setShowCheckoutModal(true)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  isComboComplete
                    ? 'bg-[#0057b8] text-white shadow-xs hover:bg-[#004593] active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>{isComboComplete ? 'Tiến hành đặt suất' : `Chọn món (${selectedDishes.length}/${effectiveMaxDishes})`}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST NOTIFICATION */}
      {checkoutSuccess && (
        <div className="fixed top-20 left-4 right-4 max-w-sm mx-auto bg-[#003E82] text-white px-4 py-3 rounded-2xl shadow-xl z-50 text-xs font-bold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span>{checkoutSuccess}</span>
        </div>
      )}

      {/* ERROR TOAST NOTIFICATION */}
      {checkoutError && (
        <div className="fixed top-20 left-4 right-4 max-w-sm mx-auto bg-rose-600 text-white px-4 py-3 rounded-2xl shadow-xl z-50 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}

      {/* CHECKOUT CONFIRMATION & PAYMENT METHOD MODAL */}
      <CheckoutConfirmationModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        canteen={selectedCanteen}
        mealSlot={selectedMealSlot}
        orderDate={orderDate}
        todayStr={todayStr}
        tomorrowStr={tomorrowStr}
        orderQuantity={orderQuantity}
        selectedDishes={selectedDishes}
        wallet={wallet}
        user={user}
        unitPrice={unitPrice}
        isBreakfast={isBreakfast}
        hasActivePass={hasActivePass}
        remainingMeals={remainingMeals}
        isSubmitting={isSubmitting}
        onConfirmCheckout={handleExecuteCheckout}
      />

      {/* WEEKLY MENU MODAL */}
      {showWeeklyModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowWeeklyModal(false);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-end justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto space-y-3 overscroll-contain modal-scrollable touch-pan-y shadow-2xl"
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1 mb-2" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#0057b8]" />
                <h4 className="text-sm font-black text-[#131B2E]">
                  Thực Đơn Cả Tuần (Thứ 2 - Thứ 6)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowWeeklyModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-black flex items-center justify-center cursor-pointer transition-colors"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs pb-14">
              {[
                { day: 'Thứ Hai', dishes: 'Bò kho tiêu xanh, Trứng ốp la, Cải ngọt luộc, Canh bí đỏ' },
                { day: 'Thứ Ba', dishes: 'Sườn cốt lết ram mặn, Chả trứng, Đậu que xào, Canh chua cá' },
                { day: 'Thứ Tư (Hôm nay)', dishes: 'Gà sốt chua ngọt, Thịt kho cút, Trứng cuộn, Canh mồng tơi', current: true },
                { day: 'Thứ Năm', dishes: 'Cá basa chiên giòn mắm xoài, Rau muống xào tỏi, Canh ngao' },
                { day: 'Thứ Sáu', dishes: 'Thịt ba chỉ luộc cà pháo, Tôm rim, Dưa leo, Canh rau ngót tôm' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    item.current
                      ? 'border-[#0057b8] bg-[#EFF6FF]'
                      : 'border-[#E2E8F0] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#131B2E]">{item.day}</span>
                    {item.current && (
                      <span className="bg-[#0057b8] text-white text-[9.5px] font-bold px-2 py-0.5 rounded-full">
                        Đang phục vụ
                      </span>
                    )}
                  </div>
                  <p className="text-slate-700 mt-1.5 leading-relaxed"><strong>Món ăn gợi ý:</strong> {item.dishes}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DISH DETAIL BOTTOM SHEET (PROGRESSIVE DISCLOSURE) */}
      <DishDetailModal
        dish={inspectingDish}
        isOpen={Boolean(inspectingDish)}
        isSelected={selectedDishes.some((d) => d.id === inspectingDish?.id)}
        maxDishes={effectiveMaxDishes}
        currentSelectedCount={selectedDishes.length}
        onClose={() => setInspectingDish(null)}
        onToggleSelect={handleToggleDish}
      />
    </div>
  );
};
