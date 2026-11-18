import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { TabKey } from '../components/BottomNavigation';
import {
  HourglassIcon as Hourglass,
  CalendarBlankIcon as Calendar,
  ClockIcon as Clock,
  CheckIcon as Check,
  PlusIcon as Plus,
  MinusIcon as Minus,
  ArrowRightIcon as ArrowRight,
  SunIcon as Sun,
  SunHorizonIcon as Sunset,
  MoonIcon as Moon,
  ShieldCheckIcon as ShieldCheck,
  WarningCircleIcon as AlertCircle,
} from '@phosphor-icons/react';
import { CheckoutConfirmationModal, type CheckoutPaymentMethod } from '../components/CheckoutConfirmationModal';
import { DishImage } from '../components/DishImage';
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
    showAlert,
  } = useApp();

  const [todayStr] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const [tomorrowStr] = useState(() => {
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    return tomorrowObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  });

  const [orderDate, setOrderDate] = useState<string>(todayStr);
  const [selectedMealSlot, setSelectedMealSlot] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER'>('LUNCH');
  const [orderQuantity, setOrderQuantity] = useState<number>(1);

  // Live dishes fetched from API for selected canteen & date & mealSlot
  const [availableDishes, setAvailableDishes] = useState<any[]>([]);
  const [isLoadingDishes, setIsLoadingDishes] = useState<boolean>(false);

  // Dish selection up to maxDishes per portion (default 3)
  const [selectedDishes, setSelectedDishes] = useState<any[]>([]);

  // Checkout modal
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useModalScrollLock(showCheckoutModal);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(22 * 60 + 2);
  const [isPastCutoff, setIsPastCutoff] = useState<boolean>(false);

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

  useEffect(() => {
    if (orderDate === todayStr) {
      if (availableSlots.length === 0) {
        setOrderDate(tomorrowStr);
      } else if (!availableSlots.includes(selectedMealSlot)) {
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

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'MAIN':
        return 'Món chính';
      case 'VEGETABLE':
        return 'Rau xào';
      case 'SOUP':
        return 'Món canh';
      case 'SIDE':
        return 'Món phụ';
      case 'DRINK':
        return 'Đồ uống';
      case 'DESSERT':
        return 'Tráng miệng';
      default:
        return 'Suất chuẩn';
    }
  };

  const isBreakfast = selectedMealSlot === 'BREAKFAST';
  const unitPrice = isBreakfast ? 20000 : 30000;
  const effectiveMaxDishes = Number(
    selectedCanteen?.mealPrices?.find((p: any) => p.mealType === selectedMealSlot)?.maxDishes ||
      maxDishes ||
      3
  );

  const hasActivePass = (wallet?.remainingMeals || 0) > 0;
  const remainingMeals = wallet?.remainingMeals || 0;
  const totalPrice = unitPrice * orderQuantity;

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

  const handleToggleDish = (dish: any) => {
    const exists = selectedDishes.some((d) => d.id === dish.id);
    if (exists) {
      setSelectedDishes(selectedDishes.filter((d) => d.id !== dish.id));
    } else {
      if (selectedDishes.length < effectiveMaxDishes) {
        setSelectedDishes([...selectedDishes, dish]);
      } else {
        void showAlert(`Mỗi suất ăn tại cơ sở này chọn tối đa ${effectiveMaxDishes} món.`);
      }
    }
  };

  const isComboComplete = selectedDishes.length > 0 && selectedDishes.length <= effectiveMaxDishes;

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

      const createdOrderId =
        res.data?.order?.id ||
        res.data?.orders?.[0]?.id ||
        (Array.isArray(res.data) ? res.data[0]?.id : undefined);
      if (createdOrderId) {
        try {
          localStorage.setItem('canteen_last_created_order_id', createdOrderId);
        } catch {}
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
        onGoToTab('qr');
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
    <div className="pb-40 bg-[#F7FAFE] min-h-screen">
      <div className="px-3.5 sm:px-5 pt-3 sm:pt-4 space-y-3.5">
        {/* 1. COMPACT DAY & MEAL SHIFT SELECTOR */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs space-y-2.5">
          {/* Top Row: Day Toggle */}
          <div className="grid grid-cols-2 bg-slate-100 p-0.5 rounded-xl gap-0.5">
            <button
              type="button"
              onClick={() => setOrderDate(todayStr)}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                orderDate === todayStr
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => setOrderDate(tomorrowStr)}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                orderDate === tomorrowStr
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Ngày mai
            </button>
          </div>

          {availableSlots.length > 0 && (
            <>
              {/* Single-line Unified Meal Shift Navbar */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                {(
                  [
                    { id: 'BREAKFAST' as const, label: 'Bữa Sáng', Icon: Sun },
                    { id: 'LUNCH' as const, label: 'Bữa Trưa', Icon: Sunset },
                    { id: 'DINNER' as const, label: 'Bữa Chiều', Icon: Moon },
                  ] as const
                )
                  .filter((slot) => availableSlots.includes(slot.id))
                  .map(({ id, label, Icon }) => {
                    const isActive = selectedMealSlot === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setSelectedMealSlot(id);
                          setSelectedDishes([]);
                        }}
                        className={`flex-1 py-2 px-2 rounded-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                          isActive
                            ? 'bg-[#0057b8] text-white shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900 font-medium'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" weight={isActive ? 'fill' : 'regular'} />
                        <span className="text-xs whitespace-nowrap">{label}</span>
                      </button>
                    );
                  })}
              </div>

              {/* Minimal Footer Status Line */}
              <div className="flex items-center justify-between pt-0.5 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {orderDate === todayStr && !isPastCutoff ? (
                    <>
                      Còn{' '}
                      <strong className="font-mono text-slate-800">
                        {formatCountdown(remainingSeconds)}
                      </strong>{' '}
                      (chốt {currentCutoffTime})
                    </>
                  ) : (
                    <>
                      Chốt trước <strong className="text-slate-800">{currentCutoffTime}</strong>
                    </>
                  )}
                </span>
                <span className="text-[10.5px] text-slate-400">Phục vụ {currentServingTime}</span>
              </div>
            </>
          )}
        </div>

        {/* 2. PAST CUTOFF EMPTY STATE OR COMBO BUILDER GRID */}
        {orderDate === todayStr && availableSlots.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0057b8] border border-blue-100 flex items-center justify-center mx-auto">
              <Hourglass className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Đã qua giờ chốt đơn tất cả các ca hôm nay
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Nhà bếp đã đóng nhận đơn để tiến hành sơ chế. Bạn vui lòng chuyển sang{' '}
                <strong>Ngày mai</strong> để đặt món trước nhé!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOrderDate(tomorrowStr)}
              className="px-4 py-2 bg-[#0057b8] text-white text-xs font-bold rounded-full shadow-xs hover:bg-[#004593] transition cursor-pointer inline-flex items-center gap-2 active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>Chuyển sang đặt món Ngày mai</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                  {isBreakfast ? 'ĐIỂM TÂM SÁNG' : 'COMBO SUẤT ĂN'} • {formatVND(unitPrice)}
                </p>
                <h3 className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-2">
                  <span>Chọn tối đa {effectiveMaxDishes} món ({selectedDishes.length}/{effectiveMaxDishes})</span>
                  {isLoadingDishes && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-400">
                      <span className="w-3 h-3 border-2 border-[#0057b8] border-t-transparent rounded-full animate-spin" />
                      Đang tải...
                    </span>
                  )}
                </h3>
              </div>

              {/* Progress Dots */}
              <div className="flex items-center gap-1">
                {Array.from({ length: effectiveMaxDishes }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i < selectedDishes.length ? 'w-5 bg-[#0057b8]' : 'w-2 bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {isLoadingDishes ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="rounded-2xl border border-slate-100 bg-white overflow-hidden animate-pulse">
                    <div className="w-full h-26 sm:h-32 bg-slate-200/80" />
                    <div className="p-2.5 flex items-center justify-between gap-2">
                      <div className="flex-1 space-y-1.5">
                        <div className="w-4/5 h-3 bg-slate-200 rounded" />
                        <div className="w-1/2 h-2.5 bg-slate-100 rounded" />
                      </div>
                      <div className="w-7.5 h-7.5 rounded-full bg-slate-200 shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : availableDishes.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 p-4">
                <p className="font-semibold text-slate-700">Chưa có món ăn phục vụ cho ca này</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Canteen đang hoàn thiện thực đơn hoặc bạn có thể đổi ca khác để xem món.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {availableDishes.map((dish: any) => {
                  const isSelected = selectedDishes.some((d) => d.id === dish.id);

                  return (
                    <div
                      key={dish.id}
                      onClick={() => handleToggleDish(dish)}
                      className={`group rounded-2xl border transition-all duration-150 overflow-hidden bg-white shadow-2xs flex flex-col justify-between cursor-pointer active:scale-[0.98] ${
                        isSelected
                          ? 'border-[#0057b8] ring-1 ring-[#0057b8] bg-blue-50/20'
                          : 'border-slate-200/80 hover:border-blue-200'
                      }`}
                    >
                      <div className="relative h-26 sm:h-32 w-full bg-slate-100 overflow-hidden">
                        <DishImage
                          src={dish.image}
                          alt={dish.name}
                          loading="eager"
                          showSkeleton
                          className="w-full h-full"
                          imgClassName="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                        />
                        {dish.isBestSeller && (
                          <span className="absolute top-2 left-2 bg-white/95 text-slate-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-2xs">
                            Bán chạy
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 flex items-center justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{dish.name}</p>
                          <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">
                            {dish.extraPrice > 0 ? `+${formatVND(dish.extraPrice)}` : getCategoryLabel(dish.category)}
                          </p>
                        </div>

                        <span
                          className={`w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-[#0057b8] text-white shadow-2xs'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5" weight="bold" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" weight="bold" />
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* DOCKED FLOATING CHECKOUT BAR */}
      {availableSlots.length > 0 && (
        <div
          className="fixed left-0 right-0 max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-3.5 sm:px-5 z-40 transition-all duration-200"
          style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200/90 shadow-[0_8px_30px_rgba(15,23,42,0.08)] flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div>
                <span className="text-[10px] text-slate-400 block leading-none font-medium">Tổng tiền</span>
                <span className="text-sm sm:text-base font-bold text-slate-900 font-mono tracking-tight mt-0.5 inline-block tabular-nums">
                  {formatVND(totalPrice)}
                </span>
              </div>

              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                  className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-black cursor-pointer active:scale-90"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-bold text-[11px] px-1.5 text-slate-800 font-mono">
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

            <button
              type="button"
              disabled={!isComboComplete || isSubmitting}
              onClick={() => setShowCheckoutModal(true)}
              className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isComboComplete
                  ? 'bg-[#0057b8] text-white shadow-xs hover:bg-[#004593] active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>
                {isComboComplete
                  ? 'Đặt suất'
                  : `Chọn món (${selectedDishes.length}/${effectiveMaxDishes})`}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {checkoutSuccess && (
        <div className="fixed top-20 left-4 right-4 max-w-sm mx-auto bg-[#003E82] text-white px-4 py-3 rounded-2xl shadow-xl z-50 text-xs font-bold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span>{checkoutSuccess}</span>
        </div>
      )}

      {/* ERROR TOAST */}
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
    </div>
  );
};
