import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MagnifyingGlassIcon as Search,
  WarningCircleIcon as AlertCircle,
  CheckCircleIcon as CheckCircle2,
  CaretUpDownIcon as ChevronsUpDown,
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DatePickerButton } from '../components/ui/DatePickerButton';

export const KitchenForecastPage: React.FC = () => {
  const { user, selectedCanteenId: globalCanteenId } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [selectedCanteenId, setSelectedCanteenId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  );
  const [selectedMealType, setSelectedMealType] = useState<string>('LUNCH');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyShortage, setOnlyShortage] = useState(false);

  const [sortField, setSortField] = useState<'name' | 'requiredQty' | 'currentStock' | 'isShortage'>('isShortage');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [forecast, setForecast] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (globalCanteenId && globalCanteenId !== 'ALL') {
      setSelectedCanteenId(globalCanteenId);
    }
  }, [globalCanteenId]);

  useEffect(() => {
    const loadCanteens = async () => {
      try {
        const endpoint = isSuperAdmin ? '/admin-hq/canteens' : '/canteens';
        const res = await api.get(endpoint).catch(() => api.get('/canteens'));
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        if (list.length > 0) {
          const defaultId =
            globalCanteenId && globalCanteenId !== 'ALL'
              ? globalCanteenId
              : user?.canteenId || list[0].id;
          setSelectedCanteenId(defaultId);
        }
      } catch (err) {
        console.error('Lỗi tải cơ sở', err);
      }
    };
    loadCanteens();
  }, [user, isSuperAdmin, globalCanteenId]);

  const fetchForecast = useCallback(
    async (silent = false) => {
      const targetCanteenId = isSuperAdmin
        ? selectedCanteenId
        : user?.canteenId || selectedCanteenId;
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
        console.error('Lỗi dự báo bếp', err);
        if (!silent) setForecast(null);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [isSuperAdmin, selectedCanteenId, user?.canteenId, selectedDate, selectedMealType]
  );

  useEffect(() => {
    if (selectedCanteenId) {
      fetchForecast(false);
      const interval = setInterval(() => {
        fetchForecast(true);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedCanteenId, fetchForecast]);

  const toggleSort = (field: 'name' | 'requiredQty' | 'currentStock' | 'isShortage') => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  const ingredients = useMemo(() => forecast?.ingredientsForecast || [], [forecast?.ingredientsForecast]);
  const shortageCount = useMemo(
    () => ingredients.filter((i: any) => i.isShortage).length,
    [ingredients]
  );

  const filteredIngredients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const factor = sortDir === 'asc' ? 1 : -1;

    return ingredients
      .filter((item: any) => {
        if (onlyShortage && !item.isShortage) return false;
        if (q) {
          return (
            item.name?.toLowerCase().includes(q) ||
            item.category?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a: any, b: any) => {
        if (sortField === 'name') {
          return String(a.name || '').localeCompare(String(b.name || ''), 'vi') * factor;
        }
        if (sortField === 'requiredQty') {
          const reqA = Number(a.totalRequired ?? a.requiredQty ?? 0);
          const reqB = Number(b.totalRequired ?? b.requiredQty ?? 0);
          return (reqA - reqB) * factor;
        }
        if (sortField === 'currentStock') {
          return (Number(a.currentStock || 0) - Number(b.currentStock || 0)) * factor;
        }
        return ((a.isShortage ? 1 : 0) - (b.isShortage ? 1 : 0)) * factor;
      });
  }, [ingredients, onlyShortage, searchQuery, sortField, sortDir]);

  const mealTabs = [
    { id: 'BREAKFAST', label: 'Ca Sáng' },
    { id: 'LUNCH', label: 'Ca Trưa' },
    { id: 'DINNER', label: 'Ca Tối' },
  ];

  const totalPreparedServings = forecast
    ? Math.round(
        Number(forecast.totalEstimatedServings || 0) *
          (1 + Number(forecast.bufferMarginPercent || 10) / 100)
      )
    : 0;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Unified 3-Column KPI Strip */}
      {forecast && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 overflow-hidden">
          <div className="p-4">
            <span className="text-xs text-slate-500 block">Đơn đặt trước (App)</span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="font-numeric text-2xl font-bold text-slate-900">
                {forecast.totalSingleOrders}
              </span>
              <span className="text-xs text-slate-400">suất lẻ</span>
            </div>
          </div>

          <div className="p-4">
            <span className="text-xs text-slate-500 block">Hội viên vé tháng</span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="font-numeric text-2xl font-bold text-slate-900">
                {forecast.packageServingEstimate || 0}
              </span>
              <span className="text-xs text-slate-400">suất ước tính</span>
            </div>
          </div>

          <div className="p-4">
            <span className="text-xs text-slate-500 block">Tổng bếp cần chuẩn bị</span>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-numeric text-2xl font-bold text-[#0057b8]">
                {totalPreparedServings}
              </span>
              <span className="text-xs text-slate-400 font-numeric">
                (+{forecast.bufferMarginPercent || 10}% dự phòng)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Control & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <DatePickerButton
            value={selectedDate}
            onChange={setSelectedDate}
            title="Chọn ngày dự báo"
          />

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {mealTabs.map((m) => {
              const isActive = selectedMealType === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMealType(m.id)}
                  className={`h-7 px-3 rounded-lg text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-56 sm:flex-none">
            <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nguyên liệu..."
              className="w-full pl-9 pr-3 h-9 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#0057b8] focus:ring-1 focus:ring-[#0057b8] outline-hidden transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => setOnlyShortage((prev) => !prev)}
            className={`h-9 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer inline-flex items-center gap-2 ${
              onlyShortage
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                shortageCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            />
            <span>
              Chỉ thiếu kho{shortageCount > 0 ? ` (${shortageCount})` : ''}
            </span>
          </button>
        </div>
      </div>

      {/* Floating Row-Card Forecast List */}
      {loading && !forecast ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200/75 px-4 py-3.5 animate-pulse flex items-center justify-between gap-4"
            >
              <div className="space-y-1.5 w-1/3">
                <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                <div className="h-2.5 bg-slate-100 rounded w-1/2" />
              </div>
              <div className="h-3.5 bg-slate-200 rounded w-20" />
              <div className="h-3.5 bg-slate-200 rounded w-20" />
              <div className="h-3.5 bg-slate-100 rounded w-24" />
            </div>
          ))}
        </div>
      ) : filteredIngredients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 py-14 px-6 text-center space-y-1.5">
          {onlyShortage ? (
            <>
              <CheckCircle2 className="size-7 text-emerald-500 mx-auto" />
              <p className="text-xs font-medium text-slate-800">
                Kho đủ nguyên liệu đáp ứng định mức ca.
              </p>
              <p className="text-[11px] text-slate-400">
                Không có nguyên liệu nào bị thiếu so với dự báo.
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="size-7 text-slate-300 mx-auto" />
              <p className="text-xs font-medium text-slate-700">
                Chưa có dữ liệu định mức BOM phù hợp.
              </p>
              <p className="text-[11px] text-slate-400">
                Vui lòng kiểm tra thực đơn ca ăn hoặc từ khóa tìm kiếm.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[640px] space-y-2">
              {/* Transparent Column Header Row */}
              <div className="grid grid-cols-[minmax(220px,1.5fr)_130px_130px_170px] items-center gap-3 px-4 py-1 text-xs font-medium text-slate-400">
                <button
                  type="button"
                  onClick={() => toggleSort('name')}
                  className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer text-left"
                >
                  <span>Nguyên liệu</span>
                  <ChevronsUpDown className="size-3 text-slate-300" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleSort('requiredQty')}
                  className="inline-flex items-center justify-end gap-1 hover:text-slate-700 transition-colors cursor-pointer text-right"
                >
                  <span>Cần nấu</span>
                  <ChevronsUpDown className="size-3 text-slate-300" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleSort('currentStock')}
                  className="inline-flex items-center justify-end gap-1 hover:text-slate-700 transition-colors cursor-pointer text-right"
                >
                  <span>Tồn kho</span>
                  <ChevronsUpDown className="size-3 text-slate-300" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleSort('isShortage')}
                  className="inline-flex items-center justify-end gap-1 hover:text-slate-700 transition-colors cursor-pointer text-right"
                >
                  <span>Trạng thái</span>
                  <ChevronsUpDown className="size-3 text-slate-300" />
                </button>
              </div>

              {/* Elevated Row Cards */}
              {filteredIngredients.map((item: any) => {
                const requiredQty = item.totalRequired ?? item.requiredQty ?? 0;
                const shortageAmount = item.shortageAmount ?? item.shortageQty ?? 0;

                return (
                  <div
                    key={item.ingredientId}
                    className="bg-white rounded-xl border border-slate-200/75 hover:border-[#0057b8] hover:shadow-xs px-4 py-3 grid grid-cols-[minmax(220px,1.5fr)_130px_130px_170px] items-center gap-3 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate" title={item.name}>
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.category || 'Nguyên liệu'}
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs font-medium text-slate-800 tabular-nums">
                      {requiredQty}{' '}
                      <span className="font-sans text-[11px] text-slate-400">{item.unit}</span>
                    </div>

                    <div className="text-right font-mono text-xs text-slate-600 tabular-nums">
                      {item.currentStock}{' '}
                      <span className="font-sans text-[11px] text-slate-400">{item.unit}</span>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <span
                        className={`size-1.5 rounded-full shrink-0 ${
                          item.isShortage ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          item.isShortage ? 'text-rose-600 font-medium' : 'text-slate-700'
                        }`}
                      >
                        {item.isShortage
                          ? `Thiếu ${shortageAmount} ${item.unit}`
                          : 'Đủ nguyên liệu'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-slate-400">
            {filteredIngredients.length} nguyên liệu
          </div>
        </div>
      )}
    </div>
  );
};
