import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { useModalScrollLock } from '../hooks/useModalScrollLock';
import {
  ChefHat,
  Sun,
  Moon,
  Utensils,
  ShoppingBag,
  ShieldCheck,
  RotateCw,
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Lock,
  Layers,
  Sparkles,
  Filter,
} from 'lucide-react';

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

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMealType, setSelectedMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER'>(initialMealSlot);
  const [forecast, setForecast] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [onlyShortage, setOnlyShortage] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useModalScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setSelectedMealType(initialMealSlot);
    }
  }, [isOpen, initialMealSlot]);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 pt-4 pb-3.5 border-b border-slate-100 flex items-start justify-between gap-3 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center shrink-0 border border-[#D0E7FF] shadow-xs">
              <ChefHat className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-black text-[#131B2E]">Dự báo Bếp & Định mức BOM</h3>
                <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Thời gian thực
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {selectedCanteen?.name || 'Cơ sở của bạn'}
              </p>
            </div>
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
        <div className="p-4 overflow-y-auto space-y-3.5">
          {/* Permission Guard */}
          {!canAccessBOM && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Tính năng bị khóa (Thiếu quyền INVENTORY_MANAGEMENT)</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-amber-700">
                Tài khoản của bạn chưa được Quản trị viên Web cấp quyền xem định mức nguyên liệu BOM. Vui lòng liên hệ Quản trị viên cấp cao để được kích hoạt.
              </p>
            </div>
          )}

          {/* Date & Shift Filter Bar */}
          <div className="bg-[#F7FAFE] p-3 rounded-lg border border-slate-200/80 space-y-2.5">
            {/* Date Segmented Controls */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    selectedDate === todayStr
                      ? 'bg-[#0057b8] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(tomorrowStr)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    selectedDate === tomorrowStr
                      ? 'bg-[#0057b8] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ngày mai
                </button>
              </div>

              {/* Date Input for Other Dates */}
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0057b8]"
                />
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => fetchForecast(false)}
                disabled={loading}
                className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer shadow-2xs shrink-0"
                title="Cập nhật lại dữ liệu"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0057b8]' : ''}`} />
              </button>
            </div>

            {/* Meal Shift Segmented Buttons */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
              {[
                { id: 'BREAKFAST', label: 'Ca Sáng', icon: <Sun className="w-3.5 h-3.5" /> },
                { id: 'LUNCH', label: 'Ca Trưa', icon: <Utensils className="w-3.5 h-3.5" /> },
                { id: 'DINNER', label: 'Ca Tối', icon: <Moon className="w-3.5 h-3.5" /> },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMealType(m.id as any)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedMealType === m.id
                      ? 'bg-white text-[#0057b8] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3 Metric Summary Cards */}
          {forecast && (
            <div className="grid grid-cols-3 gap-2">
              {/* Single Orders */}
              <div className="bg-[#F7FAFE] border border-slate-200 p-2.5 rounded-lg text-center space-y-0.5">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-bold uppercase">
                  <ShoppingBag className="w-3 h-3 text-[#0057b8]" />
                  <span>Đơn đặt lẻ</span>
                </div>
                <div className="text-lg font-black text-[#131B2E] font-mono">
                  {forecast.totalSingleOrders}
                </div>
                <span className="text-[9.5px] text-slate-400 block">qua App học sinh</span>
              </div>

              {/* Package Subscribers */}
              <div className="bg-[#F7FAFE] border border-slate-200 p-2.5 rounded-lg text-center space-y-0.5">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-bold uppercase">
                  <ShieldCheck className="w-3 h-3 text-[#0057b8]" />
                  <span>Vé tháng</span>
                </div>
                <div className="text-lg font-black text-[#131B2E] font-mono">
                  {forecast.packageServingEstimate}
                </div>
                <span className="text-[9.5px] text-slate-400 block">gói kích hoạt</span>
              </div>

              {/* Total Kitchen Preparation Target */}
              <div className="bg-[#0057b8] text-white p-2.5 rounded-lg text-center space-y-0.5 shadow-xs">
                <div className="flex items-center justify-center gap-1 text-[10px] text-white/90 font-bold uppercase">
                  <ChefHat className="w-3 h-3" />
                  <span>Cần nấu</span>
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {Math.round(
                    forecast.totalEstimatedServings * (1 + (forecast.bufferMarginPercent || 0) / 100)
                  )}
                </div>
                <span className="text-[9px] text-white/80 block">
                  +{forecast.bufferMarginPercent}% dôi dư
                </span>
              </div>
            </div>
          )}

          {/* Stock Alert Banner */}
          {forecast && (
            <div
              className={`p-3 rounded-lg border flex items-center justify-between gap-2 ${
                shortageCount > 0
                  ? 'bg-rose-50/80 border-rose-200 text-rose-800'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold">
                {shortageCount > 0 ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Có {shortageCount} nguyên liệu kho bị thiếu!</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Kho đủ nguyên liệu cho ca ăn này</span>
                  </>
                )}
              </div>

              {shortageCount > 0 && (
                <button
                  type="button"
                  onClick={() => setOnlyShortage((prev) => !prev)}
                  className={`text-[10.5px] font-bold px-2 py-1 rounded-xl transition cursor-pointer border ${
                    onlyShortage
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  {onlyShortage ? 'Hiện tất cả' : 'Chỉ xem thiếu'}
                </button>
              )}
            </div>
          )}

          {/* Search & Counter Header */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>Định mức BOM nguyên liệu</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {filteredIngredients.length} mục
              </span>
            </span>

            <input
              type="text"
              placeholder="Tìm nguyên liệu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs px-2.5 py-1 bg-[#F7FAFE] border border-slate-200 rounded-xl max-w-[140px] focus:outline-none focus:border-[#0057b8]"
            />
          </div>

          {/* Ingredients List */}
          {loading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 rounded-lg border border-slate-200 bg-white space-y-2 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-16" />
                  </div>
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredIngredients.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
              {onlyShortage
                ? 'Kho đủ nguyên vật liệu đáp ứng định mức ca.'
                : 'Chưa có thực đơn hoặc công thức BOM cho ca ăn này.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredIngredients.map((item: any) => {
                const isShort = item.isShortage;

                return (
                  <div
                    key={item.ingredientId}
                    className={`p-3 rounded-lg border transition-all ${
                      isShort
                        ? 'bg-rose-50/40 border-rose-200 shadow-2xs'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-[#131B2E] truncate">
                            {item.name}
                          </h4>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-medium">
                            {item.category || 'Nguyên liệu'}
                          </span>
                        </div>

                        {/* Breakdown info */}
                        <div className="flex items-center gap-2 text-[10.5px] text-slate-500 mt-1">
                          <span>
                            Cần: <strong className="text-[#131B2E] font-bold">{item.totalRequired} {item.unit}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Tồn kho: <strong className={isShort ? 'text-rose-600 font-bold' : 'text-slate-700'}>{item.currentStock} {item.unit}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0 text-right">
                        {isShort ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Thiếu {item.shortageAmount} {item.unit}
                            </span>
                            <span className="block text-[9px] text-rose-500 font-medium">
                              Cần nhập thêm
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Đủ kho
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Formula subtext */}
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-400">
                      <span>Định mức gốc: {item.baseRequired} {item.unit}</span>
                      <span>Dự phòng an toàn (+{item.bufferMarginPercent}%): +{item.bufferExtra} {item.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-[#F7FAFE] flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#0057b8]" />
            <span className="text-[11px]">Tự động cập nhật khi có học sinh đặt thêm</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-[#0057b8] hover:bg-[#003E82] text-white font-bold text-xs transition cursor-pointer shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

