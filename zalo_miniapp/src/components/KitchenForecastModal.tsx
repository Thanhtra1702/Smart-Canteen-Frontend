import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { useModalScrollLock } from '../hooks/useModalScrollLock';
import {
  SunIcon as Sun,
  MoonIcon as Moon,
  ForkKnifeIcon as Utensils,
  XIcon as X,
  WarningIcon as AlertTriangle,
  CheckCircleIcon as CheckCircle2,
  LockIcon as Lock,
  CalendarBlankIcon as Calendar,
  CaretLeftIcon as ChevronLeft,
  CaretRightIcon as ChevronRight,
} from '@phosphor-icons/react';

interface KitchenForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMealSlot?: 'BREAKFAST' | 'LUNCH' | 'DINNER';
}

export const KitchenForecastModal: React.FC<KitchenForecastModalProps> = ({
  isOpen,
  onClose,
  initialMealSlot = 'LUNCH',
}) => {
  const { selectedCanteen, user, hasPermission } = useApp();

  const [todayStr] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const [tomorrowStr] = useState(() => {
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    return tomorrowObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  });

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMealType, setSelectedMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER'>(initialMealSlot);
  const [forecast, setForecast] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [onlyShortage, setOnlyShortage] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>(() => {
    const [y, m] = todayStr.split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  useModalScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setSelectedMealType(initialMealSlot);
      setShowDatePicker(false);
    }
  }, [isOpen, initialMealSlot]);

  useEffect(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    if (y && m) {
      setCalendarMonth({ year: y, month: m - 1 });
    }
  }, [selectedDate]);

  const targetCanteenId = selectedCanteen?.id || user?.canteenId;

  const fetchForecast = useCallback(
    async (silent = false) => {
      if (!targetCanteenId) return;
      try {
        if (!silent) setLoading(true);
        const res = await api.get(`/inventory/forecast/${targetCanteenId}`, {
          params: {
            date: selectedDate,
            mealType: selectedMealType,
          },
        });
        setForecast(res.data);
      } catch (err) {
        console.warn('Lỗi lấy dữ liệu dự báo bếp & BOM:', err);
        if (!silent) setForecast(null);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [targetCanteenId, selectedDate, selectedMealType]
  );

  useEffect(() => {
    if (isOpen && targetCanteenId) {
      fetchForecast(false);
    }
  }, [isOpen, targetCanteenId, fetchForecast]);

  const ingredients = useMemo(() => forecast?.ingredientsForecast || [], [forecast?.ingredientsForecast]);

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((item: any) => {
      if (onlyShortage && !item.isShortage) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ingredients, onlyShortage, searchQuery]);

  const shortageCount = useMemo(() => {
    return ingredients.filter((i: any) => i.isShortage).length;
  }, [ingredients]);

  if (!isOpen) return null;

  const canAccessBOM = hasPermission('INVENTORY_MANAGEMENT') || hasPermission('CANTEEN_CONFIG');

  const totalToCook = forecast
    ? Math.round(forecast.totalEstimatedServings * (1 + (forecast.bufferMarginPercent || 0) / 100))
    : 0;

  const formattedDateLabel = selectedDate.split('-').reverse().join('/');
  const firstDayOffset = (new Date(calendarMonth.year, calendarMonth.month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
  const toIsoDate = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const shiftCalendarMonth = (delta: number) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  return (
    <>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
      >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header (tối giản) */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">Dự báo Bếp &amp; Định mức BOM</h3>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {selectedCanteen?.name || 'Cơ sở của bạn'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-3">
          {/* Permission Guard */}
          {!canAccessBOM && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Thiếu quyền INVENTORY_MANAGEMENT</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Vui lòng liên hệ Quản trị viên để được cấp quyền xem định mức BOM.
              </p>
            </div>
          )}

          {/* Date & Shift Filter Bar */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(todayStr);
                    setShowDatePicker(false);
                  }}
                  className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer whitespace-nowrap ${
                    selectedDate === todayStr
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(tomorrowStr);
                    setShowDatePicker(false);
                  }}
                  className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer whitespace-nowrap ${
                    selectedDate === tomorrowStr
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ngày mai
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowDatePicker((prev) => !prev)}
                className={`flex-1 min-w-0 px-2.5 py-1.5 text-[11px] font-bold rounded-xl border transition cursor-pointer flex items-center justify-between gap-1.5 ${
                  showDatePicker
                    ? 'bg-blue-50/70 border-[#0057b8]/40 text-[#0057b8]'
                    : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="font-mono truncate">{formattedDateLabel}</span>
                <Calendar className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-xl">
              {[
                { id: 'BREAKFAST', label: 'Ca Sáng', icon: <Sun className="w-3.5 h-3.5" /> },
                { id: 'LUNCH', label: 'Ca Trưa', icon: <Utensils className="w-3.5 h-3.5" /> },
                { id: 'DINNER', label: 'Ca Tối', icon: <Moon className="w-3.5 h-3.5" /> },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMealType(m.id as any)}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                    selectedMealType === m.id
                      ? 'bg-white text-[#0057b8] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3-Column Metric Strip */}
          {forecast && (
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl py-2.5 px-1 grid grid-cols-3 divide-x divide-slate-200/80">
              {[
                { key: 'single', label: 'Đặt lẻ', value: forecast.totalSingleOrders },
                { key: 'pkg', label: 'Vé tháng', value: forecast.packageServingEstimate },
                {
                  key: 'cook',
                  label: `Cần nấu (+${forecast.bufferMarginPercent ?? 0}%)`,
                  value: totalToCook,
                  accent: true,
                },
              ].map(({ key, label, value, accent }) => (
                <div key={key} className="px-1.5 text-center min-w-0">
                  <div
                    className={`text-base font-black font-mono tabular-nums leading-tight ${
                      accent ? 'text-[#0057b8]' : 'text-slate-900'
                    }`}
                  >
                    {value}
                  </div>
                  <span className="text-[10.5px] font-medium text-slate-500 block mt-0.5 truncate">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Compact Stock Alert */}
          {forecast && (
            <div
              className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 ${
                shortageCount > 0
                  ? 'bg-rose-50/70 border-rose-200/80 text-rose-700'
                  : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-700'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold min-w-0">
                {shortageCount > 0 ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="truncate">Thiếu {shortageCount} nguyên liệu kho</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Đủ nguyên liệu nấu ca này</span>
                  </>
                )}
              </div>

              {shortageCount > 0 && (
                <button
                  type="button"
                  onClick={() => setOnlyShortage((prev) => !prev)}
                  className={`text-[10.5px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer border shrink-0 whitespace-nowrap ${
                    onlyShortage
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  {onlyShortage ? 'Tất cả' : 'Chỉ xem thiếu'}
                </button>
              )}
            </div>
          )}

          {/* Search & Counter Header */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-xs font-bold text-slate-800 whitespace-nowrap">
              Định mức BOM ({filteredIngredients.length})
            </span>

            <input
              type="text"
              placeholder="Tìm nguyên liệu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl w-40 focus:outline-none focus:border-[#0057b8]"
            />
          </div>

          {/* Ingredients List (tối giản 1 dòng thông số rõ ràng) */}
          {loading ? (
            <div className="space-y-2 py-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2 animate-pulse">
                  <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredIngredients.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              {onlyShortage
                ? 'Kho đủ nguyên liệu đáp ứng định mức ca.'
                : 'Chưa có công thức BOM cho ca ăn này.'}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-white overflow-hidden">
              {filteredIngredients.map((item: any) => {
                const isShort = Boolean(item.isShortage);
                const requiredQty = item.totalRequired ?? item.requiredQty ?? 0;
                const currentStock = item.currentStock ?? 0;
                const shortageQty =
                  item.shortageAmount ??
                  item.shortageQty ??
                  Math.max(0, Number((requiredQty - currentStock).toFixed(2)));

                return (
                  <div
                    key={item.ingredientId}
                    className={`px-3 py-2.5 flex items-center justify-between gap-3 ${
                      isShort ? 'bg-rose-50/35' : 'bg-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5 truncate">
                        Cần <strong className="text-slate-800">{requiredQty} {item.unit}</strong> • Kho{' '}
                        <strong className={isShort ? 'text-rose-600' : 'text-slate-700'}>
                          {currentStock} {item.unit}
                        </strong>
                      </p>
                    </div>

                    <div className="shrink-0">
                      {isShort ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 whitespace-nowrap">
                          Thiếu {shortageQty} {item.unit}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-600 whitespace-nowrap">
                          Đủ kho
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>

    {/* Centered Calendar Popup */}
    {showDatePicker && (
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowDatePicker(false);
        }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-xs rounded-2xl border border-slate-100 p-4 shadow-2xl space-y-3 animate-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-900">Chọn ngày dự báo</h4>
            <button
              type="button"
              onClick={() => setShowDatePicker(false)}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              aria-label="Đóng lịch"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftCalendarMonth(-1)}
                className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
                aria-label="Tháng trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-slate-900 px-1.5">
                Tháng {calendarMonth.month + 1}/{calendarMonth.year}
              </span>
              <button
                type="button"
                onClick={() => shiftCalendarMonth(1)}
                className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
                aria-label="Tháng sau"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedDate(todayStr);
                setShowDatePicker(false);
              }}
              className="text-[11px] font-bold text-[#0057b8] hover:underline cursor-pointer px-1.5 py-0.5"
            >
              Hôm nay
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
              <span key={d} className="py-0.5">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <span key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, idx) => {
              const day = idx + 1;
              const iso = toIsoDate(calendarMonth.year, calendarMonth.month, day);
              const isSelected = iso === selectedDate;
              const isToday = iso === todayStr;

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    setSelectedDate(iso);
                    setShowDatePicker(false);
                  }}
                  className={`h-8 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#0057b8] text-white shadow-2xs'
                      : isToday
                      ? 'bg-blue-50 text-[#0057b8] border border-blue-200'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    )}
    </>
  );
};

