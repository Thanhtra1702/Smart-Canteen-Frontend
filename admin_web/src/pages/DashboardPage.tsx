import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Utensils,
  Wallet,
  PackageCheck,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
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
        'Không thể tải dữ liệu bảng điều khiển. Vui lòng kiểm tra kết nối mạng hoặc thử lại.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedCanteenId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  if (loading) {
    return (
      <div className="py-32 text-center text-xs sm:text-sm text-muted flex flex-col items-center justify-center gap-3">
        <div className="size-8 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
        <span className="font-medium text-xs text-muted">Đang tổng hợp dữ liệu phân tích vận hành F&B...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-24 text-center max-w-md mx-auto flex flex-col items-center justify-center gap-4">
        <div className="size-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
          <AlertTriangle className="size-7" />
        </div>
        <div className="space-y-1 text-center">
          <h3 className="text-base font-bold text-foreground">Không thể tải dữ liệu Bảng điều khiển</h3>
          <p className="text-xs text-muted max-w-sm mx-auto">{error}</p>
        </div>
        <Button variant="primary" icon={RefreshCw} onClick={fetchDashboard}>
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
  const peakInsight = data?.peakInsight || {};
  const weekdayTraffic = data?.weekdayTraffic || [];
  const weekdayInsight = data?.weekdayInsight || {};
  const sevenDayTrend = data?.sevenDayTrend || [];

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'MAIN':
        return <Badge variant="brand">Món chính</Badge>;
      case 'SIDE':
        return <Badge variant="success">Món phụ</Badge>;
      case 'DRINK':
        return <Badge variant="neutral">Đồ uống</Badge>;
      case 'DESSERT':
        return <Badge variant="warning">Tráng miệng</Badge>;
      default:
        return <Badge variant="neutral">{category || 'Món ăn'}</Badge>;
    }
  };

  const tabItems: { id: DashboardTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Xu hướng 7 ngày & Cơ sở' },
    { id: 'dishes', label: 'Món bán chạy nhất', count: topDishes.length > 0 ? topDishes.length : undefined },
    { id: 'traffic', label: 'Giờ cao điểm & Lưu lượng' },
    { id: 'alerts', label: 'Cảnh báo nguyên liệu', count: lowStockAlerts.length > 0 ? lowStockAlerts.length : undefined },
  ];

  return (
    <div className="space-y-6">

      {/* Error banner with retry if refresh encounters error */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-rose-700 font-medium">
            <AlertTriangle className="size-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchDashboard}>
            Thử lại
          </Button>
        </div>
      )}

      {/* 4 Metric Cards - Modern Clean Enterprise */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Doanh thu hôm nay */}
        <div className="bg-surface rounded-xl border border-border p-5 flex flex-col justify-between shadow-xs transition-shadow hover:shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Doanh thu hôm nay</span>
              <div className="size-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <Wallet className="size-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums text-foreground mt-2 tracking-tight">
              {formatVND(summary.totalRevenueToday)}
            </div>
          </div>
          <div className="text-xs text-muted mt-3 pt-2.5 border-t border-border/80 flex items-center justify-between">
            <span>Tháng này:</span>
            <span className="text-foreground font-semibold tabular-nums">{formatVND(summary.totalRevenueMonth)}</span>
          </div>
        </div>

        {/* Metric 2: Lượt phục vụ */}
        <div className="bg-surface rounded-xl border border-border p-5 flex flex-col justify-between shadow-xs transition-shadow hover:shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Suất ăn phục vụ hôm nay</span>
              <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <Utensils className="size-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums text-foreground mt-2 tracking-tight">
              {Number(summary.totalCheckinsToday || 0) + Number(summary.totalOrdersToday || 0)}{' '}
              <span className="text-xs font-normal text-muted">suất</span>
            </div>
          </div>
          <div className="text-xs text-muted mt-3 pt-2.5 border-t border-border/80 flex items-center justify-between">
            <span>Đặt trước: <strong className="text-foreground font-semibold tabular-nums">{summary.totalOrdersToday || 0}</strong></span>
            <span>Vãng lai: <strong className="text-foreground font-semibold tabular-nums">{summary.totalCheckinsToday || 0}</strong></span>
          </div>
        </div>

        {/* Metric 3: Khung giờ cao điểm */}
        <div
          onClick={() => setActiveTab('traffic')}
          className="bg-surface rounded-xl border border-border p-5 flex flex-col justify-between cursor-pointer hover:border-slate-300 hover:bg-slate-50/50 transition-all group shadow-xs"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Khung giờ cao điểm</span>
              <div className="size-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                <Clock className="size-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground mt-2 tracking-tight font-mono">
              {summary.peakHourSlot || 'Chưa đủ dữ liệu'}
            </div>
          </div>
          <div className="text-xs text-muted mt-3 pt-2.5 border-t border-border/80 flex items-center justify-between">
            <span>Đông nhất: <strong className="text-foreground font-semibold">{summary.busiestDay || 'Chưa đủ dữ liệu'}</strong></span>
            <ArrowRight className="size-3.5 text-muted group-hover:text-primary transition-colors" />
          </div>
        </div>

        {/* Metric 4: Cảnh báo tồn kho */}
        <div
          onClick={() => setActiveTab('alerts')}
          className="bg-surface rounded-xl border border-border p-5 flex flex-col justify-between cursor-pointer hover:border-slate-300 hover:bg-slate-50/50 transition-all group shadow-xs"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Nguyên liệu sắp hết</span>
              <div className={`size-8 rounded-lg flex items-center justify-center border ${
                lowStockAlerts.length > 0
                  ? 'bg-rose-50 text-rose-600 border-rose-100'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}>
                {lowStockAlerts.length > 0 ? (
                  <AlertTriangle className="size-4" />
                ) : (
                  <PackageCheck className="size-4" />
                )}
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums text-foreground mt-2 tracking-tight">
              {summary.lowStockAlertCount || 0}{' '}
              <span className="text-xs font-normal text-muted">mặt hàng</span>
            </div>
          </div>
          <div className="text-xs text-muted mt-3 pt-2.5 border-t border-border/80 flex items-center justify-between">
            <span className={lowStockAlerts.length > 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-medium'}>
              {lowStockAlerts.length > 0 ? 'Dưới định mức an toàn' : 'Tồn kho ổn định'}
            </span>
            <ArrowRight className="size-3.5 text-muted group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* Navigation Layer Tabs */}
      <Tabs items={tabItems} activeTab={activeTab} onChange={(id) => setActiveTab(id as DashboardTab)} />

      {/* TAB 1: 7-DAY TREND & CANTEEN PERFORMANCE */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Trend Chart Card */}
          <div className="bg-surface rounded-xl border border-border p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  <span>Xu hướng doanh thu & Lượt suất ăn 7 ngày qua</span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Theo dõi biến động doanh thu và tổng số suất ăn theo từng ngày
                </p>
              </div>

              {/* Metric Toggle */}
              <div className="flex items-center border border-border rounded-lg bg-slate-50 p-0.5 text-xs shadow-xs self-start sm:self-auto">
                <button
                  onClick={() => setTrendMetric('revenue')}
                  className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer outline-hidden ${
                    trendMetric === 'revenue'
                      ? 'bg-surface text-foreground font-semibold shadow-xs border border-border/70'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Doanh thu (VND)
                </button>
                <button
                  onClick={() => setTrendMetric('meals')}
                  className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer outline-hidden ${
                    trendMetric === 'meals'
                      ? 'bg-surface text-foreground font-semibold shadow-xs border border-border/70'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Số suất ăn
                </button>
              </div>
            </div>

            <div className="h-68 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sevenDayTrend} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="dateStr" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => trendMetric === 'revenue' ? `${v / 1000}k` : `${v}`}
                  />
                  <Tooltip
                    formatter={(value: any) => [
                      trendMetric === 'revenue' ? formatVND(value) : `${value} suất`,
                      trendMetric === 'revenue' ? 'Doanh thu' : 'Số suất ăn'
                    ]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? `${item.dayLabel}, ${item.dateStr}` : label;
                    }}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '10px',
                      color: '#0f172a',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.08)',
                    }}
                  />
                  <Bar
                    dataKey={trendMetric === 'revenue' ? 'revenue' : 'meals'}
                    fill="#0062d2"
                    radius={[5, 5, 0, 0]}
                    name={trendMetric === 'revenue' ? 'Doanh thu' : 'Suất ăn'}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance By Canteen */}
          <div className="bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Hiệu suất hoạt động từng cơ sở Canteen hôm nay
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Đối soát số lượng suất ăn và doanh thu phát sinh theo điểm bán
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('canteens')}
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1.5 transition-colors cursor-pointer outline-hidden"
              >
                <span>Quản lý cơ sở</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-muted uppercase text-[10.5px] font-semibold border-b border-border">
                  <tr>
                    <th className="px-5 py-3">Cơ sở Canteen</th>
                    <th className="px-5 py-3">Địa chỉ</th>
                    <th className="px-5 py-3 text-center">Suất ăn hôm nay</th>
                    <th className="px-5 py-3 text-right">Doanh thu hôm nay</th>
                    <th className="px-5 py-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {canteensPerformance.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 text-muted shrink-0" />
                          <span>{c.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted max-w-xs truncate">{c.address || '—'}</td>
                      <td className="px-5 py-3.5 text-center font-semibold text-foreground tabular-nums">
                        {c.checkinCount + c.orderCount} <span className="font-normal text-muted text-[11px]">suất</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-foreground tabular-nums">
                        {formatVND(c.todayRevenue)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge variant={c.isActive ? 'success' : 'neutral'} dot>
                          {c.isActive ? 'Đang mở' : 'Đóng'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TOP SELLING DISHES */}
      {activeTab === 'dishes' && (
        <div className="space-y-4">
          <div className="bg-surface p-5 sm:p-6 rounded-xl border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Bảng xếp hạng món ăn bán chạy nhất (Top Dishes)
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Phân tích món được yêu thích nhất để dự trù nguyên liệu và lên thực đơn tuần hiệu quả
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('menu')}
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1.5 transition-colors cursor-pointer outline-hidden"
              >
                <span>Xem thực đơn tuần</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {topDishes.map((dish: any, index: number) => (
                <div
                  key={dish.id}
                  className="p-3.5 rounded-xl border border-border hover:bg-slate-50/70 transition-colors bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="size-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-semibold shrink-0 text-foreground tabular-nums border border-border">
                      #{dish.rank}
                    </span>

                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-foreground flex items-center gap-2 truncate">
                        <span>{dish.name}</span>
                        {getCategoryBadge(dish.category)}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {dish.extraPrice > 0 ? `Phụ thu: +${formatVND(dish.extraPrice)}` : 'Suất chuẩn'}
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Progress Bar */}
                  <div className="flex items-center gap-4 shrink-0 sm:w-72">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground tabular-nums">{dish.totalOrdered} suất</span>
                        <span className="text-muted text-[11px] tabular-nums">{dish.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${dish.percentage}%`,
                            backgroundColor: index === 0 ? '#0062d2' : '#94a3b8'
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-right min-w-[85px]">
                      <div className="text-xs font-semibold text-foreground tabular-nums">
                        {formatVND(dish.revenue)}
                      </div>
                      <div className="text-[11px] text-muted">doanh thu ước tính</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actionable Kitchen Insight */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-foreground space-y-1">
              <div className="font-semibold text-foreground">
                Khuyến nghị vận hành bếp:
              </div>
              <p className="leading-relaxed text-foreground-subtle">
                Top 2 món ăn đứng đầu chiếm gần 50% nhu cầu toàn hệ thống. Bếp trưởng nên chốt số lượng sơ chế và định mức BOM từ chiều hôm trước, ưu tiên nhập nguyên liệu tươi vào sáng sớm để tránh hao hụt và trễ giờ ra món.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PEAK HOURS & WEEKDAY TRAFFIC */}
      {activeTab === 'traffic' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel 1: Giờ cao điểm */}
            <div className="bg-surface p-5 sm:p-6 rounded-xl border border-border shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <span>Phân bổ khung giờ phục vụ trong ngày</span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Xác định thời điểm khách tập trung đông nhất để bố trí nhân viên tiếp món
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {hourlyTraffic.map((slot: any) => (
                  <div key={slot.slot} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground font-mono">{slot.slot}</span>
                        <span className="text-muted text-[11px]">({slot.label})</span>
                        {slot.isPeak && (
                          <Badge variant="brand">Cao điểm nhất</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground tabular-nums">{slot.count} lượt</span>
                        <span className="text-muted text-[11px] w-8 text-right tabular-nums">{slot.percentage}%</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${slot.percentage}%`,
                          backgroundColor: slot.isPeak ? '#0062d2' : '#94a3b8'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 border border-border rounded-xl p-3 text-xs text-foreground-subtle">
                <span className="font-semibold text-foreground">Chỉ dẫn quầy gắp: </span>
                {peakInsight.recommendation}
              </div>
            </div>

            {/* Panel 2: Thứ trong tuần đông khách */}
            <div className="bg-surface p-5 sm:p-6 rounded-xl border border-border shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="size-4 text-slate-500" />
                  <span>Lưu lượng khách theo các thứ trong tuần</span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Thống kê các ngày trong tuần để điều chỉnh lượng thực phẩm nhập kho
                </p>
              </div>

              <div className="h-56 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayTraffic} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="shortDay" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
                    <Tooltip
                      formatter={(value: any) => [`${value} suất`, 'Lượng phục vụ']}
                      labelFormatter={(label, payload) => {
                        const item = payload?.[0]?.payload;
                        return item ? `${item.day}` : label;
                      }}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '10px',
                        color: '#0f172a',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.08)',
                      }}
                    />
                    <Bar dataKey="meals" radius={[5, 5, 0, 0]} name="Suất ăn" isAnimationActive={false}>
                      {weekdayTraffic.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.isBusiest ? '#0062d2' : '#cbd5e1'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-50 border border-border rounded-xl p-3 text-xs text-foreground-subtle">
                <span className="font-semibold text-foreground">Chiến lược tồn kho: </span>
                {weekdayInsight.recommendation}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ALERTS (LOW STOCK) */}
      {activeTab === 'alerts' && (
        <div className="bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Danh sách mặt hàng nguyên liệu dưới mức an toàn
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Các nguyên liệu cần tạo phiếu nhập kho khẩn để tránh ảnh hưởng ca bếp tiếp theo
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-xs text-primary hover:underline font-semibold transition-colors cursor-pointer outline-hidden"
            >
              Mở sổ kho quản lý
            </button>
          </div>

          {lowStockAlerts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-muted uppercase text-[10.5px] font-semibold border-b border-border">
                  <tr>
                    <th className="px-5 py-3">Nguyên liệu</th>
                    <th className="px-5 py-3">Cơ sở</th>
                    <th className="px-5 py-3 text-right">Tồn kho hiện tại</th>
                    <th className="px-5 py-3 text-right">Ngưỡng tối thiểu</th>
                    <th className="px-5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {lowStockAlerts.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-foreground">{item.name}</td>
                      <td className="px-5 py-3.5 text-muted">{item.canteen?.name || 'Toàn chuỗi'}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-rose-600 font-mono tabular-nums">
                        {Number(item.currentStock || item.currentQty).toLocaleString()} {item.unit}
                      </td>
                      <td className="px-5 py-3.5 text-right text-muted font-mono tabular-nums">
                        {Number(item.minStock || item.minQty).toLocaleString()} {item.unit}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => onNavigateTab('inventory')}
                          className="text-xs text-primary hover:underline font-semibold transition-colors cursor-pointer outline-hidden"
                        >
                          Nhập thêm
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-14 text-center text-xs text-muted flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>Tất cả nguyên liệu đều ở mức an toàn.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
