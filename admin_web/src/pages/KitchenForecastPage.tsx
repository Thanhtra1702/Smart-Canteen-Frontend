import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, ChefHat, ShoppingBag, ShieldCheck, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

export const KitchenForecastPage: React.FC = () => {
  const { user, selectedCanteenId: globalCanteenId } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [canteens, setCanteens] = useState<any[]>([]);
  const [selectedCanteenId, setSelectedCanteenId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  );
  const [selectedMealType, setSelectedMealType] = useState<string>('LUNCH');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [forecast, setForecast] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [onlyShortage, setOnlyShortage] = useState(false);

  useEffect(() => {
    if (globalCanteenId && globalCanteenId !== 'ALL') {
      setSelectedCanteenId(globalCanteenId);
    }
  }, [globalCanteenId]);

  useEffect(() => {
    const loadCanteens = async () => {
      try {
        const endpoint = isSuperAdmin ? '/admin-hq/canteens' : '/canteens';
        const res = await api.get(endpoint);
        setCanteens(res.data);
        if (res.data.length > 0) {
          const defaultId = (globalCanteenId && globalCanteenId !== 'ALL')
            ? globalCanteenId
            : (user?.canteenId || res.data[0].id);
          setSelectedCanteenId(defaultId);
        }
      } catch (err) {
        console.error('Lỗi tải cơ sở', err);
      }
    };
    loadCanteens();
  }, [user, isSuperAdmin, globalCanteenId]);

  const fetchForecast = useCallback(async (silent = false) => {
    const targetCanteenId = isSuperAdmin ? selectedCanteenId : (user?.canteenId || selectedCanteenId);
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
  }, [isSuperAdmin, selectedCanteenId, user?.canteenId, selectedDate, selectedMealType]);

  useEffect(() => {
    if (selectedCanteenId) {
      fetchForecast(false);
      const interval = setInterval(() => {
        fetchForecast(true);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedCanteenId, fetchForecast]);

  const ingredients = useMemo(() => forecast?.ingredientsForecast || [], [forecast?.ingredientsForecast]);
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((item: any) => {
      if (onlyShortage && !item.isShortage) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [ingredients, onlyShortage, searchQuery]);

  const shortageCount = ingredients.filter((i: any) => i.isShortage).length;

  const mealTabs = [
    { id: 'BREAKFAST', label: 'Ca Sáng' },
    { id: 'LUNCH', label: 'Ca Trưa' },
    { id: 'DINNER', label: 'Ca Tối' },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. Control Toolbar */}
      <Card className="p-3.5 rounded-xl border border-slate-200 shadow-2xs bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date picker */}
            <div className="relative flex items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8.5 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer"
              />
            </div>

            {/* Meal Segmented Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              {mealTabs.map((m) => {
                const isActive = selectedMealType === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMealType(m.id)}
                    className={`h-7 px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-primary shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {forecast && (
              <div className="hidden sm:flex items-center gap-2">
                <Badge variant="neutral" size="sm">
                  Dự phòng: +{forecast.bufferMarginPercent}%
                </Badge>
                {shortageCount > 0 ? (
                  <Badge variant="error" size="sm" dot>
                    {shortageCount} thiếu kho
                  </Badge>
                ) : (
                  <Badge variant="success" size="sm" dot>
                    Đủ nguyên liệu
                  </Badge>
                )}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchForecast(false)}
            loading={loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Làm mới
          </Button>
        </div>
      </Card>

      {/* 3. Metric Strip (Divided 1-Frame Grid) */}
      {forecast && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
          <div className="bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Đơn đặt trước (App)</span>
              <span className="p-1 rounded bg-slate-100 text-slate-600">
                <ShoppingBag className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
                {forecast.totalSingleOrders}
              </span>
              <span className="text-xs text-slate-500">suất lẻ</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Học sinh / CBNV đặt trước</p>
          </div>

          <div className="bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Hội viên vé tháng</span>
              <span className="p-1 rounded bg-slate-100 text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
                {forecast.packageServingEstimate || 0}
              </span>
              <span className="text-xs text-slate-500">suất</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Ước tính từ gói bán trú hoạt động</p>
          </div>

          <div className="bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">Tổng bếp cần chuẩn bị</span>
              <span className="p-1 rounded bg-blue-50 text-primary border border-blue-100">
                <ChefHat className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold tracking-tight text-primary">
                {Math.round(
                  forecast.totalEstimatedServings * (1 + (forecast.bufferMarginPercent || 10) / 100)
                )}
              </span>
              <span className="text-xs font-semibold text-primary">suất</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Bao gồm +{forecast.bufferMarginPercent || 10}% hao hụt định mức
            </p>
          </div>
        </div>
      )}

      {/* 4. Ingredients BOM Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        {/* Table Toolbar */}
        <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-800">
              Nguyên vật liệu cần dùng theo BOM
            </span>
            <Badge variant="neutral" size="sm">
              {filteredIngredients.length} mục
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nguyên liệu..."
                className="h-7.5 pl-8 pr-2.5 rounded-md border border-slate-300 text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0057b8]"
              />
            </div>

            {/* Shortage toggle */}
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyShortage}
                onChange={(e) => setOnlyShortage(e.target.checked)}
                className="rounded border-slate-300 text-[#0057b8] focus:ring-[#0057b8]/20"
              />
              <span>
                Chỉ thiếu kho{' '}
                {shortageCount > 0 && (
                  <strong className="text-rose-600 font-mono">({shortageCount})</strong>
                )}
              </span>
            </label>
          </div>
        </div>

        {/* Content Body */}
        {loading && !forecast ? (
          <div className="p-4 space-y-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 animate-pulse">
                <div className="space-y-1.5 w-1/3">
                  <div className="h-3.5 bg-slate-200 rounded w-4/5" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="h-4 bg-slate-200 rounded w-20" />
                <div className="h-4 bg-slate-200 rounded w-20" />
                <div className="h-5 bg-slate-100 rounded w-24" />
              </div>
            ))}
          </div>
        ) : filteredIngredients.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            {onlyShortage ? (
              <div className="flex flex-col items-center justify-center gap-1.5">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                <span className="font-semibold text-slate-800">Kho đủ nguyên vật liệu đáp ứng định mức ca.</span>
                <span className="text-[11px] text-slate-400">Không có mục nào bị thiếu so với số lượng đặt trước.</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5">
                <AlertCircle className="w-7 h-7 text-slate-400" />
                <span className="font-semibold text-slate-800">Chưa có thực đơn hoặc định mức BOM cho ca đã chọn.</span>
                <span className="text-[11px] text-slate-400">Vui lòng kiểm tra lại cấu hình thực đơn ca ăn.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Nguyên liệu</th>
                  <th className="px-4 py-2.5 text-right">Tổng cần nấu</th>
                  <th className="px-4 py-2.5 text-right">Tồn kho hiện tại</th>
                  <th className="px-4 py-2.5 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIngredients.map((item: any) => (
                  <tr key={item.ingredientId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-2 font-medium text-slate-900">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-500">{item.category}</div>
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">
                      {item.totalRequired}{' '}
                      <span className="font-normal text-slate-500 text-[11px]">{item.unit}</span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-600">
                      {item.currentStock}{' '}
                      <span className="font-normal text-slate-500 text-[11px]">{item.unit}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {item.isShortage ? (
                        <Badge variant="error" size="sm" dot>
                          Thiếu {item.shortageAmount} {item.unit}
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm" dot>
                          Đủ nguyên liệu
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
