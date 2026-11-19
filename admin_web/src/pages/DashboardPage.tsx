import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  ArrowRightIcon as ArrowRight,
  CaretRightIcon as CaretRight,
  CheckCircleIcon as CheckCircle2,
  WarningIcon as AlertTriangle,
  ArrowsClockwiseIcon as RefreshCw,
  WalletIcon as Wallet,
  ForkKnifeIcon as Utensils,
  ClockIcon as Clock,
  CalendarIcon as Calendar,
  ChartLineUpIcon as ChartLineUp,
  FireIcon as Fire,
  CrownIcon as Crown,
  BuildingsIcon as Building2,
  InfoIcon as Info,
  TrendUpIcon as TrendUp,
} from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
  onNavigateTab: (tab: any) => void;
}

type DashboardTab = 'overview' | 'dishes' | 'traffic' | 'alerts';

export const DashboardPage: React.FC<DashboardProps> = ({ onNavigateTab }) => {
  const { selectedCanteenId } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [trendMetric, setTrendMetric] = useState<'revenue' | 'meals'>('revenue');

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin-hq/dashboard', {
        params: {
          canteenId: selectedCanteenId !== 'ALL' ? selectedCanteenId : undefined,
        },
      });
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data', err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể tải dữ liệu bảng điều khiển.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedCanteenId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const formatVND = (num: number) => `${Math.round(num || 0).toLocaleString('vi-VN')} đ`;

  const formatAxisVND = (val: number) => {
    if (val === 0) return '0';
    if (val >= 1000000) {
      const m = val / 1000000;
      return `${Number.isInteger(m) ? m : m.toFixed(1)} tr`;
    }
    return `${Math.round(val / 1000)}k`;
  };

  const getCategoryMeta = (category: string) => {
    switch (category) {
      case 'MAIN':
        return { label: 'Món chính', dot: 'bg-[#0057b8]' };
      case 'SIDE':
        return { label: 'Món phụ', dot: 'bg-emerald-500' };
      case 'SOUP':
        return { label: 'Món canh', dot: 'bg-amber-500' };
      case 'DRINK':
        return { label: 'Đồ uống', dot: 'bg-cyan-500' };
      case 'DESSERT':
        return { label: 'Tráng miệng', dot: 'bg-purple-500' };
      default:
        return { label: category || 'Món ăn', dot: 'bg-slate-400' };
    }
  };

  const normalizedWeekdayTraffic = useMemo(() => {
    const raw = data?.weekdayTraffic || [];
    return raw.map((item: any) => ({
      ...item,
      label: item.shortDay || item.day,
      meals: Number(item.meals ?? item.count ?? 0),
    }));
  }, [data?.weekdayTraffic]);

  const sevenDayTotals = useMemo(() => {
    const list = data?.sevenDayTrend || [];
    return list.reduce(
      (acc: { revenue: number; meals: number }, d: any) => ({
        revenue: acc.revenue + Number(d.revenue || 0),
        meals: acc.meals + Number(d.meals || 0),
      }),
      { revenue: 0, meals: 0 }
    );
  }, [data?.sevenDayTrend]);

  if (loading) {
    return (
      <div className="py-28 text-center flex flex-col items-center justify-center gap-3">
        <div className="size-7 border-2 border-slate-200 border-t-[#0057b8] rounded-full animate-spin" />
        <span className="text-xs text-slate-400">Đang tải dữ liệu tổng quan...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-20 text-center max-w-md mx-auto flex flex-col items-center justify-center gap-3">
        <AlertTriangle className="size-8 text-rose-500" />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900">Không thể tải dữ liệu</h3>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
        <Button variant="primary" size="sm" icon={RefreshCw} onClick={fetchDashboard}>
          Thử lại
        </Button>
      </div>
    );
  }

  const summary = data?.summary || {};
  const canteensPerformance = data?.canteensPerformance || [];
  const lowStockAlerts = data?.lowStockAlerts || [];
  const topDishes = data?.topDishes || [];
  const hourlyTraffic = data?.hourlyTraffic || [];
  const sevenDayTrend = data?.sevenDayTrend || [];

  const totalMealsToday =
    Number(summary.totalCheckinsToday || 0) + Number(summary.totalOrdersToday || 0);
  const alertCount = summary.lowStockAlertCount ?? lowStockAlerts.length ?? 0;

  // Compare today vs previous day from 7-day trend if available
  const prevDay = sevenDayTrend.length >= 2 ? sevenDayTrend[sevenDayTrend.length - 2] : null;
  const revDeltaPct =
    prevDay && Number(prevDay.revenue) > 0
      ? ((Number(summary.totalRevenueToday || 0) - Number(prevDay.revenue)) / Number(prevDay.revenue)) *
        100
      : null;
  const mealsDeltaPct =
    prevDay && Number(prevDay.meals) > 0
      ? ((totalMealsToday - Number(prevDay.meals)) / Number(prevDay.meals)) * 100
      : null;

  const tabs: {
    id: DashboardTab;
    label: string;
    icon: React.ComponentType<{ className?: string; weight?: 'regular' | 'fill' }>;
    count?: number;
  }[] = [
    { id: 'overview', label: 'Tổng quan (7 ngày)', icon: ChartLineUp },
    { id: 'dishes', label: 'Món bán chạy nhất', icon: Fire },
    { id: 'traffic', label: 'Giờ cao điểm & Lưu lượng', icon: Clock },
    {
      id: 'alerts',
      label: 'Cảnh báo nguyên liệu',
      icon: AlertTriangle,
      count: alertCount > 0 ? alertCount : undefined,
    },
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <span className="text-rose-700">{error}</span>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchDashboard}>
            Thử lại
          </Button>
        </div>
      )}

      {/* TOP 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Hero Revenue Card */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0057b8] to-[#004494] text-white p-3.5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-1.5 relative z-10">
            <div className="size-7 rounded-lg bg-white/15 flex items-center justify-center">
              <Wallet weight="fill" className="size-3.5 text-white" />
            </div>
            <div>
              <span className="text-[11px] text-blue-100 block">Doanh thu hôm nay</span>
              <div className="mt-0.5 font-numeric text-xl font-bold tracking-tight">
                {formatVND(summary.totalRevenueToday)}
              </div>
            </div>
            {revDeltaPct !== null && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-[10.5px] text-white">
                <TrendUp className="size-3" />
                <span>
                  {revDeltaPct >= 0 ? '+' : ''}
                  {revDeltaPct.toFixed(1)}% so với hôm qua
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 mt-2.5 border-t border-white/15 flex items-center justify-between text-[11px] relative z-10">
            <span className="text-blue-100">Tháng này</span>
            <span className="font-numeric font-semibold">{formatVND(summary.totalRevenueMonth)}</span>
          </div>
        </div>

        {/* Card 2: Meals Served */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="size-7 rounded-lg bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center">
              <Utensils className="size-3.5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Suất ăn phục vụ</span>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-numeric text-xl font-bold text-slate-900">
                  {totalMealsToday}
                </span>
                <span className="text-[11px] text-slate-400">suất</span>
              </div>
            </div>
            {mealsDeltaPct !== null && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[10.5px] text-[#0057b8] font-medium">
                <TrendUp className="size-3" />
                <span>
                  {mealsDeltaPct >= 0 ? '+' : ''}
                  {mealsDeltaPct.toFixed(1)}% so với hôm qua
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Đặt trước: <strong className="text-slate-800 font-semibold font-numeric">{summary.totalOrdersToday || 0}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Vãng lai: <strong className="text-slate-800 font-semibold font-numeric">{summary.totalCheckinsToday || 0}</strong>
            </span>
          </div>
        </div>

        {/* Card 3: Peak Hour */}
        <button
          type="button"
          onClick={() => setActiveTab('traffic')}
          className="bg-white rounded-2xl border border-slate-200/80 hover:border-[#0057b8]/50 p-3.5 shadow-2xs flex flex-col justify-between text-left transition-all cursor-pointer group"
        >
          <div className="space-y-1.5 w-full">
            <div className="flex items-center justify-between">
              <div className="size-7 rounded-lg bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center">
                <Clock className="size-3.5" />
              </div>
              <CaretRight className="size-3.5 text-slate-300 group-hover:text-[#0057b8] transition-colors" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Khung giờ cao điểm</span>
              <div className="mt-0.5 font-mono text-xl font-bold text-slate-900 tracking-tight">
                {summary.peakHourSlot || '—'}
              </div>
            </div>
          </div>

          <div className="pt-2 mt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500 w-full">
            <Calendar className="size-3.5 text-slate-400 shrink-0" />
            <span>
              Đông nhất: <strong className="text-slate-800 font-semibold">{summary.busiestDay || '—'}</strong>
            </span>
          </div>
        </button>

        {/* Card 4: Low Stock Alerts */}
        <div
          className={`rounded-2xl border p-3.5 shadow-2xs flex flex-col justify-between ${
            alertCount > 0
              ? 'bg-rose-50/55 border-rose-200/80'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div
                className={`size-7 rounded-lg flex items-center justify-center ${
                  alertCount > 0
                    ? 'bg-rose-100/80 text-rose-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {alertCount > 0 ? (
                  <AlertTriangle className="size-3.5" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('alerts')}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Xem cảnh báo"
              >
                <CaretRight className="size-3.5" />
              </button>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Nguyên liệu sắp hết</span>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-numeric text-xl font-bold text-slate-900">
                  {alertCount}
                </span>
                <span className="text-[11px] text-slate-500">mặt hàng</span>
              </div>
            </div>
          </div>

          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className="w-full h-7 rounded-full bg-white border border-slate-200/90 hover:border-[#0057b8] hover:text-[#0057b8] text-[11px] font-medium text-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              Xem danh sách
            </button>
          </div>
        </div>
      </div>

      {/* SECTION NAVIGATION PILLS */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`h-8.5 px-3.5 rounded-full text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-[#0057b8] text-white font-semibold shadow-2xs'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium'
              }`}
            >
              <Icon weight={isActive ? 'fill' : 'regular'} className="size-3.5 shrink-0" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-numeric font-semibold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW BENTO GRID (LEFT CHART + RIGHT TOP DISHES & CANTEENS) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: 7-Day Area/Line Chart + Total Summary Strip */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center shrink-0">
                  <ChartLineUp className="size-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {trendMetric === 'revenue'
                    ? 'Xu hướng doanh thu 7 ngày qua'
                    : 'Xu hướng suất ăn 7 ngày qua'}
                </h3>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full w-fit shrink-0">
                <button
                  type="button"
                  onClick={() => setTrendMetric('revenue')}
                  className={`h-7 px-3 rounded-full text-xs transition-all cursor-pointer ${
                    trendMetric === 'revenue'
                      ? 'bg-[#0057b8] text-white font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  Doanh thu (VNĐ)
                </button>
                <button
                  type="button"
                  onClick={() => setTrendMetric('meals')}
                  className={`h-7 px-3 rounded-full text-xs transition-all cursor-pointer ${
                    trendMetric === 'meals'
                      ? 'bg-[#0057b8] text-white font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  Số suất ăn
                </button>
              </div>
            </div>

            <div className="h-68 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sevenDayTrend} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="minoAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0057b8" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#0057b8" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateStr"
                    padding={{ left: 12, right: 12 }}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (trendMetric === 'revenue' ? formatAxisVND(v) : `${v}`)}
                  />
                  <Tooltip
                    formatter={(value: any) => [
                      trendMetric === 'revenue' ? formatVND(value) : `${value} suất`,
                      trendMetric === 'revenue' ? 'Doanh thu' : 'Số suất ăn',
                    ]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? `${item.dayLabel}, ${item.dateStr}` : label;
                    }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#0f172a',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '12px',
                      boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.25)',
                    }}
                    itemStyle={{ color: '#ffffff', fontWeight: 600 }}
                    labelStyle={{ color: '#93c5fd', fontSize: '11px', marginBottom: '2px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey={trendMetric === 'revenue' ? 'revenue' : 'meals'}
                    stroke="#0057b8"
                    strokeWidth={2.5}
                    fill="url(#minoAreaFill)"
                    dot={{ r: 4, fill: '#ffffff', stroke: '#0057b8', strokeWidth: 2.5 }}
                    activeDot={{ r: 5.5, fill: '#0057b8', stroke: '#ffffff', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom 7-Day Summary Strip */}
            <div className="px-3.5 py-2.5 rounded-xl bg-[#EFF6FF]/70 border border-[#0057b8]/15 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700">
              <Info className="size-4 text-[#0057b8] shrink-0" />
              <span>
                Tổng doanh thu 7 ngày:{' '}
                <strong className="font-numeric font-semibold text-slate-900">
                  {formatVND(sevenDayTotals.revenue)}
                </strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Tổng suất ăn:{' '}
                <strong className="font-numeric font-semibold text-slate-900">
                  {sevenDayTotals.meals.toLocaleString('vi-VN')} suất
                </strong>
              </span>
            </div>
          </div>

          {/* Right Column: Top 3 Selling Dishes + Canteen Performance */}
          <div className="lg:col-span-5 space-y-4">
            {/* Top Right Card: Top Selling Dishes */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Crown className="size-4 text-[#0057b8]" />
                  <h3 className="text-xs font-semibold text-slate-900">
                    Món bán chạy nhất <span className="font-normal text-slate-400">(7 ngày)</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('dishes')}
                  className="text-xs text-[#0057b8] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem chi tiết</span>
                  <ArrowRight className="size-3" />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {topDishes.slice(0, 3).map((dish: any, idx: number) => (
                  <div
                    key={dish.id}
                    className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="size-6 rounded-lg bg-slate-100 text-slate-600 font-mono text-[11px] font-semibold flex items-center justify-center shrink-0">
                        {dish.rank ?? idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-800 truncate" title={dish.name}>
                          {dish.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-numeric">
                          {Number(dish.totalOrdered || 0).toLocaleString('vi-VN')} suất
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 w-28">
                      <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#0057b8]"
                          style={{ width: `${Math.min(100, Number(dish.percentage || 0))}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-slate-600 tabular-nums w-8 text-right">
                        {dish.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Right Card: Canteen Performance */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center">
                    <Building2 className="size-3.5" />
                  </div>
                  <h3 className="text-xs font-semibold text-slate-900">Hiệu suất theo cơ sở</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('canteens')}
                  className="text-xs text-[#0057b8] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem chi tiết</span>
                  <ArrowRight className="size-3" />
                </button>
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-[minmax(120px,1.4fr)_100px_56px_74px] items-center gap-2 px-2 py-1 text-[11px] text-slate-400">
                  <span>Cơ sở</span>
                  <span className="text-right">Doanh thu</span>
                  <span className="text-right">Suất</span>
                  <span className="text-right">Trạng thái</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {canteensPerformance.map((c: any) => (
                    <div
                      key={c.id}
                      className="grid grid-cols-[minmax(120px,1.4fr)_100px_56px_74px] items-center gap-2 px-2 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="size-3.5 text-[#0057b8] shrink-0" />
                        <span className="font-medium text-slate-800 truncate" title={c.name}>
                          {c.name}
                        </span>
                      </div>
                      <div className="text-right font-mono text-[11px] font-medium text-slate-800 tabular-nums">
                        {formatVND(c.todayRevenue)}
                      </div>
                      <div className="text-right font-mono text-[11px] text-slate-600 tabular-nums">
                        {Number(c.checkinCount || 0) + Number(c.orderCount || 0)}
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className={`size-1.5 rounded-full shrink-0 ${
                            c.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span
                          className={`text-[11px] ${
                            c.isActive ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {c.isActive ? 'Mở' : 'Đóng'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TOP SELLING DISHES (FULL LIST) */}
      {activeTab === 'dishes' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-slate-700">Bảng xếp hạng món bán chạy nhất</h3>
            <button
              type="button"
              onClick={() => onNavigateTab('menu')}
              className="text-xs text-[#0057b8] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Xem thực đơn</span>
              <ArrowRight className="size-3" />
            </button>
          </div>

          <div className="space-y-2">
            {topDishes.map((dish: any, index: number) => {
              const catMeta = getCategoryMeta(dish.category);

              return (
                <div
                  key={dish.id}
                  className="bg-white rounded-xl border border-slate-200/75 hover:border-[#0057b8] hover:shadow-xs px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-slate-400 w-5 shrink-0 tabular-nums">
                      {String(dish.rank ?? index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">
                        {dish.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <span className={`size-1.5 rounded-full shrink-0 ${catMeta.dot}`} />
                        <span>{catMeta.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 sm:w-72">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-slate-700 tabular-nums">
                          {dish.totalOrdered} suất
                        </span>
                        <span className="font-mono text-slate-400 tabular-nums">
                          {dish.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${dish.percentage}%`,
                            backgroundColor: index === 0 ? '#0057b8' : '#cbd5e1',
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs font-medium text-slate-800 tabular-nums min-w-[92px]">
                      {formatVND(dish.revenue)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: TRAFFIC */}
      {activeTab === 'traffic' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center shrink-0">
                <Clock className="size-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Phân bổ khung giờ trong ngày</h3>
            </div>

            <div className="space-y-3">
              {hourlyTraffic.map((slot: any) => (
                <div key={slot.slot} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-1.5 rounded-full shrink-0 ${
                          slot.isPeak ? 'bg-[#0057b8]' : 'bg-slate-300'
                        }`}
                      />
                      <span className="font-mono text-slate-800">{slot.slot}</span>
                      <span className="text-[11px] text-slate-400">{slot.label}</span>
                    </div>
                    <div className="font-mono text-xs text-slate-700 tabular-nums">
                      {slot.count} <span className="text-slate-400">({slot.percentage}%)</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${slot.percentage}%`,
                        backgroundColor: slot.isPeak ? '#0057b8' : '#cbd5e1',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center shrink-0">
                <ChartLineUp className="size-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Lưu lượng theo ngày trong tuần</h3>
            </div>

            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={normalizedWeekdayTraffic}
                  margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="trafficAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0057b8" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#0057b8" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    padding={{ left: 12, right: 12 }}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any) => [`${value} suất`, 'Lượng phục vụ']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#0f172a',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '12px',
                      boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.25)',
                    }}
                    itemStyle={{ color: '#ffffff', fontWeight: 600 }}
                    labelStyle={{ color: '#93c5fd', fontSize: '11px', marginBottom: '2px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="meals"
                    stroke="#0057b8"
                    strokeWidth={2.5}
                    fill="url(#trafficAreaFill)"
                    dot={{ r: 4, fill: '#ffffff', stroke: '#0057b8', strokeWidth: 2.5 }}
                    activeDot={{ r: 5.5, fill: '#0057b8', stroke: '#ffffff', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LOW STOCK ALERTS (FLOATING ROW-CARDS) */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-slate-700">
              Nguyên liệu dưới định mức an toàn
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('inventory')}
              className="text-xs text-[#0057b8] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Mở kho nguyên liệu</span>
              <ArrowRight className="size-3" />
            </button>
          </div>

          {lowStockAlerts.length > 0 ? (
            <div className="overflow-x-auto pb-1">
              <div className="min-w-[600px] space-y-2">
                <div className="grid grid-cols-[minmax(180px,1.4fr)_minmax(160px,1.2fr)_110px_110px_100px] items-center gap-3 px-4 py-1 text-xs font-medium text-slate-400">
                  <span>Nguyên liệu</span>
                  <span>Cơ sở</span>
                  <span className="text-right">Tồn kho</span>
                  <span className="text-right">Tối thiểu</span>
                  <span className="text-right">Thao tác</span>
                </div>

                {lowStockAlerts.map((item: any) => {
                  const currentVal = Number(item.currentStock ?? item.currentQty ?? 0);
                  const minVal = Number(item.minStock ?? item.minQty ?? item.minThreshold ?? 0);

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-slate-200/75 hover:border-[#0057b8] hover:shadow-xs px-4 py-3 grid grid-cols-[minmax(180px,1.4fr)_minmax(160px,1.2fr)_110px_110px_100px] items-center gap-3 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="text-xs font-medium text-slate-800 truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {item.canteen?.name || item.canteenName || 'Toàn chuỗi'}
                      </div>
                      <div className="text-right font-mono text-xs font-medium text-rose-600 tabular-nums">
                        {currentVal.toLocaleString('vi-VN')} {item.unit}
                      </div>
                      <div className="text-right font-mono text-xs text-slate-400 tabular-nums">
                        {minVal.toLocaleString('vi-VN')} {item.unit}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => onNavigateTab('inventory')}
                          className="text-xs text-[#0057b8] hover:underline font-medium cursor-pointer"
                        >
                          Nhập thêm
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 py-14 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>Tất cả nguyên liệu đều ở mức an toàn.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
