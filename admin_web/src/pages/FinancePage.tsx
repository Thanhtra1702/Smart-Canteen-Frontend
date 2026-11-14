import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  PlusCircle,
  Building2,
  CheckCircle2,
  Clock,
  Search,
  X,
  CreditCard,
  FileSpreadsheet,
  Receipt,
  User,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/ui/Badge';

export const FinancePage: React.FC = () => {
  const { user, selectedCanteenId } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'reconciliations' | 'ledger'>('reconciliations');
  const [loading, setLoading] = useState(false);
  const [canteens, setCanteens] = useState<any[]>([]);

  // Balance & KPI metrics
  const [balanceData, setBalanceData] = useState<{
    totalRevenue: number;
    totalWithdrawn: number;
    availableBalance: number;
  }>({
    totalRevenue: 0,
    totalWithdrawn: 0,
    availableBalance: 0,
  });

  // Withdrawals / Reconciliations list
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // Transactions ledger list
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ledgerPagination, setLedgerPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });
  const [ledgerPage, setLedgerPage] = useState(1);

  // Modals
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    canteenId: '',
    amount: '',
    description: '',
  });
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);


  // Detail Modal
  const [selectedWithdrawalDetail, setSelectedWithdrawalDetail] = useState<any | null>(null);

  // Fetch canteens for dropdowns
  const fetchCanteens = useCallback(async () => {
    try {
      const res = await api.get('/canteens').catch(() => api.get('/admin-hq/canteens'));
      const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setCanteens(list);
    } catch (err) {
      console.error('Failed to load canteens', err);
    }
  }, []);

  // Fetch Balance & KPIs
  const fetchBalance = useCallback(async () => {
    try {
      const params: any = {};
      if (selectedCanteenId && selectedCanteenId !== 'ALL') {
        params.canteenId = selectedCanteenId;
      }
      const res = await api.get('/reports/balance', { params });
      if (res.data) {
        setBalanceData({
          totalRevenue: Number(res.data.totalRevenue || 0),
          totalWithdrawn: Number(res.data.totalWithdrawn || 0),
          availableBalance: Number(res.data.availableBalance || 0),
        });
      }
    } catch (err) {
      console.error('Failed to load balance', err);
    }
  }, [selectedCanteenId]);

  // Fetch Withdrawals (Reconciliations)
  const fetchWithdrawals = useCallback(async () => {
    try {
      const params: any = {};
      if (selectedCanteenId && selectedCanteenId !== 'ALL') {
        params.canteenId = selectedCanteenId;
      }
      const res = await api.get('/wallet/withdrawals', { params });
      let list = res.data || [];
      if (selectedCanteenId && selectedCanteenId !== 'ALL') {
        list = list.filter(
          (w: any) => w.canteenId === selectedCanteenId || w.canteen?.id === selectedCanteenId
        );
      }
      setWithdrawals(list);
    } catch (err) {
      console.error('Failed to load withdrawals', err);
    }
  }, [selectedCanteenId]);

  // Fetch Ledger Transactions
  const fetchLedger = useCallback(async () => {
    try {
      const params: any = {
        page: ledgerPage,
        limit: 15,
      };
      if (selectedCanteenId && selectedCanteenId !== 'ALL') {
        params.canteenId = selectedCanteenId;
      }
      const res = await api.get('/wallet/all', { params });
      if (res.data?.transactions) {
        setTransactions(res.data.transactions);
        if (res.data.pagination) {
          setLedgerPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load ledger', err);
    }
  }, [selectedCanteenId, ledgerPage]);

  // Combined fetch
  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchBalance(), fetchWithdrawals(), fetchLedger()]);
    setLoading(false);
  }, [fetchBalance, fetchWithdrawals, fetchLedger]);

  useEffect(() => {
    fetchCanteens();
    refreshAll();
  }, [fetchCanteens, refreshAll]);


  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  // Submit Withdrawal Request
  const handleSubmitWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(withdrawForm.amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Vui lòng nhập số tiền đối soát hợp lệ (> 0đ)');
      return;
    }

    const targetCanteenId =
      withdrawForm.canteenId || (selectedCanteenId !== 'ALL' ? selectedCanteenId : canteens[0]?.id);

    if (!targetCanteenId) {
      toast.error('Vui lòng chọn cơ sở Canteen cần đối soát');
      return;
    }

    try {
      setIsSubmittingWithdraw(true);
      await api.post('/reports/withdraw', {
        canteenId: targetCanteenId,
        amount: amountNum,
        description: withdrawForm.description.trim() || 'Đối soát doanh thu Canteen',
      });

      toast.success(`Đã tạo lệnh đối soát & giải ngân ${formatVND(amountNum)} thành công!`);
      setShowWithdrawModal(false);
      setWithdrawForm({ canteenId: '', amount: '', description: '' });
      await refreshAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi tạo lệnh đối soát');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };



  // Export Excel Report
  const handleExportExcel = async () => {
    try {
      toast.info('Đang kết xuất báo cáo tài chính Excel...');
      const res = await api.get('/reports/export', {
        params: {
          report: 'orders',
          format: 'xlsx',
          canteenId: selectedCanteenId !== 'ALL' ? selectedCanteenId : undefined,
        },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Bao_Cao_Doi_Soat_Tai_Chinh_${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Đã tải xuống file báo cáo tài chính Excel thành công!');
    } catch (err) {
      toast.error('Lỗi khi xuất file báo cáo Excel');
    }
  };

  // Helper for Transaction Type Badge
  const renderTxBadge = (type: string) => {
    switch (type) {
      case 'TOPUP_BANK':
        return <Badge variant="success" dot>Nạp VietQR</Badge>;
      case 'TOPUP_CASH':
        return <Badge variant="neutral" dot>Tiền mặt quầy (Cũ)</Badge>;
      case 'ORDER_PAYMENT':
        return <Badge variant="neutral">Suất ăn</Badge>;
      case 'PACKAGE_PURCHASE':
        return <Badge variant="brand">Mua Vé Tháng</Badge>;
      case 'REFUND':
        return <Badge variant="warning">Hoàn tiền</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Quick Action Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="success" dot>Đối soát trực tiếp</Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Lập lệnh đối soát */}
          <button
            type="button"
            onClick={() => {
              setWithdrawForm({
                canteenId: selectedCanteenId !== 'ALL' ? selectedCanteenId : (canteens[0]?.id || ''),
                amount: balanceData.availableBalance > 0 ? String(balanceData.availableBalance) : '',
                description: `Đối soát doanh thu ${new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
              });
              setShowWithdrawModal(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <PlusCircle className="size-3.5" />
            <span>Yêu cầu đối soát</span>
          </button>

          {/* Xuất Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-slate-50 text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Xuất file đối soát Excel"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards Grid (evondevKit Clean Divided Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-xs">
        {/* Metric 1: Tổng doanh thu */}
        <div className="min-w-0 bg-surface p-5 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium">Tổng doanh thu thực tế</span>
            <TrendingUp className="size-4 text-brand" />
          </div>
          <div className="text-2xl font-semibold text-foreground tracking-tight tabular-nums font-mono">
            {formatVND(balanceData.totalRevenue)}
          </div>
          <p className="text-[11px] text-muted">Doanh thu từ đơn đặt & điểm danh quầy</p>
        </div>

        {/* Metric 2: Số dư khả dụng chờ đối soát */}
        <div className="min-w-0 bg-surface p-5 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium text-emerald-800">Số dư khả dụng đối soát</span>
            <Wallet className="size-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-semibold text-emerald-600 tracking-tight tabular-nums font-mono">
            {formatVND(balanceData.availableBalance)}
          </div>
          <p className="text-[11px] text-emerald-700/80 font-medium">Sẵn sàng lập lệnh giải ngân</p>
        </div>

        {/* Metric 3: Tổng tiền đã quyết toán */}
        <div className="min-w-0 bg-surface p-5 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium">Đã giải ngân đối soát</span>
            <ArrowUpRight className="size-4 text-slate-500" />
          </div>
          <div className="text-2xl font-semibold text-foreground tracking-tight tabular-nums font-mono">
            {formatVND(balanceData.totalWithdrawn)}
          </div>
          <p className="text-[11px] text-muted">Qua {withdrawals.length} phiên đối soát thành công</p>
        </div>

        {/* Metric 4: Lưu lượng dòng tiền */}
        <div className="min-w-0 bg-surface p-5 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium">Giao dịch dòng tiền</span>
            <ArrowRightLeft className="size-4 text-slate-500" />
          </div>
          <div className="text-2xl font-semibold text-foreground tracking-tight tabular-nums font-mono">
            {ledgerPagination.totalItems}{' '}
            <span className="text-xs font-normal text-muted font-sans">bản ghi</span>
          </div>
          <p className="text-[11px] text-muted">Gồm nạp ví, suất ăn & vé tháng</p>
        </div>
      </div>

      {/* 3. Sub-tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-border pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('reconciliations')}
          className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'reconciliations'
              ? 'border-brand text-brand'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <Receipt className="size-4" />
          <span>Lịch sử đối soát & Quyết toán ({withdrawals.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'ledger'
              ? 'border-brand text-brand'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <ArrowRightLeft className="size-4" />
          <span>Sổ cái giao dịch dòng tiền ({ledgerPagination.totalItems})</span>
        </button>
      </div>

      {/* 4. Tab 1: Lịch sử đối soát (Reconciliations Table) */}
      {activeTab === 'reconciliations' && (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Danh sách các đợt đối soát & giải ngân điểm bán
            </span>
            <span className="text-xs text-muted">
              Đơn vị tiền tệ: VNĐ
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-hover text-muted uppercase text-[11px] font-medium border-b border-border">
                <tr>
                  <th className="px-5 py-3.5">Mã đối soát</th>
                  <th className="px-5 py-3.5">Thời gian lập</th>
                  <th className="px-5 py-3.5">Cơ sở Canteen</th>
                  <th className="px-5 py-3.5 text-right">Số tiền giải ngân</th>
                  <th className="px-5 py-3.5">Nội dung đối soát</th>
                  <th className="px-5 py-3.5 text-center">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {withdrawals.map((w, idx) => (
                  <tr key={w.id || idx} className="hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-3.5 font-mono text-[11px] font-semibold text-foreground">
                      #WS-{w.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3.5 text-muted font-mono text-[11px]">
                      {new Date(w.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-muted shrink-0" />
                        <span>{w.canteen?.name || 'Canteen cơ sở'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-emerald-600 font-mono tabular-nums text-sm">
                      {formatVND(Number(w.amount))}
                    </td>
                    <td className="px-5 py-3.5 text-muted max-w-xs truncate">
                      {w.description || 'Đối soát doanh thu bán trú'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant="success" dot>
                        Đã quyết toán
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedWithdrawalDetail(w)}
                        className="px-2.5 py-1 rounded-lg border border-border hover:bg-secondary text-foreground text-[11px] font-medium transition cursor-pointer"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {withdrawals.length === 0 && (
            <div className="py-14 text-center text-xs text-muted">
              {loading ? 'Đang tải dữ liệu đối soát...' : 'Chưa có đợt đối soát giải ngân nào được tạo.'}
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Sổ cái dòng tiền (Transactions Ledger Table) */}
      {activeTab === 'ledger' && (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs space-y-0">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">
              Nhật ký giao dịch dòng tiền toàn hệ thống
            </span>
            <span className="text-xs text-muted">
              Trang {ledgerPagination.currentPage} / {Math.max(1, ledgerPagination.totalPages)} • Tổng {ledgerPagination.totalItems} giao dịch
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-hover text-muted uppercase text-[11px] font-medium border-b border-border">
                <tr>
                  <th className="px-5 py-3.5">Mã GD</th>
                  <th className="px-5 py-3.5">Thời gian</th>
                  <th className="px-5 py-3.5">Người dùng / Học sinh</th>
                  <th className="px-5 py-3.5">Loại giao dịch</th>
                  <th className="px-5 py-3.5 text-right">Biến động</th>
                  <th className="px-5 py-3.5 text-right">Số dư sau GD</th>
                  <th className="px-5 py-3.5">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => {
                  const isPositive =
                    tx.type === 'TOPUP_BANK' || tx.type === 'TOPUP_CASH' || tx.type === 'REFUND';
                  const userObj = tx.wallet?.user;

                  return (
                    <tr key={tx.id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-5 py-3.5 font-mono text-[11px] font-medium text-muted">
                        #{tx.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="px-5 py-3.5 text-muted font-mono text-[11px]">
                        {new Date(tx.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground">
                          {userObj?.fullName || 'Học sinh'}
                        </div>
                        <div className="text-[10.5px] text-muted">
                          {userObj?.phone || userObj?.email || 'N/A'}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {renderTxBadge(tx.type)}
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-mono font-semibold tabular-nums ${
                          isPositive ? 'text-emerald-600' : 'text-foreground'
                        }`}
                      >
                        {isPositive ? `+${formatVND(Number(tx.amount))}` : `-${formatVND(Number(tx.amount))}`}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-muted tabular-nums">
                        {tx.balanceAfter !== undefined ? formatVND(Number(tx.balanceAfter)) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-muted max-w-xs truncate">
                        {tx.description || tx.orderId ? `Đơn hàng #${tx.orderId?.substring(0, 8)}` : 'Giao dịch ví'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {transactions.length === 0 && (
            <div className="py-14 text-center text-xs text-muted">
              {loading ? 'Đang nạp sổ cái giao dịch...' : 'Không có giao dịch nào trong khoảng thời gian này.'}
            </div>
          )}

          {/* Pagination Controls */}
          {ledgerPagination.totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between text-xs">
              <button
                type="button"
                disabled={ledgerPage <= 1}
                onClick={() => setLedgerPage(ledgerPage - 1)}
                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-secondary transition flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="size-4" />
                <span>Trang trước</span>
              </button>
              <span className="text-muted font-medium">
                Trang {ledgerPage} / {ledgerPagination.totalPages}
              </span>
              <button
                type="button"
                disabled={ledgerPage >= ledgerPagination.totalPages}
                onClick={() => setLedgerPage(ledgerPage + 1)}
                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-secondary transition flex items-center gap-1 cursor-pointer"
              >
                <span>Trang sau</span>
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: LẬP LỆNH ĐỐI SOÁT & GIẢI NGÂN */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface rounded-2xl border border-border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Receipt className="size-5 text-brand" />
                <h3 className="text-base font-semibold text-foreground">
                  Lập Lệnh Đối Soát & Giải Ngân
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="text-muted hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitWithdraw} className="space-y-4 text-xs">
              {/* Select Canteen */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Cơ sở Canteen quyết toán:</label>
                <select
                  value={withdrawForm.canteenId}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, canteenId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-border-strong rounded-xl text-foreground text-xs focus:border-focus outline-hidden"
                >
                  {canteens.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Available Balance Box */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-emerald-700">Số dư khả dụng hiện tại:</p>
                  <p className="text-base font-bold font-mono text-emerald-800">
                    {formatVND(balanceData.availableBalance)}
                  </p>
                </div>
                <Badge variant="success">Sẵn sàng</Badge>
              </div>

              {/* Amount Input */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Số tiền đối soát (VNĐ):</label>
                <input
                  type="number"
                  placeholder="Nhập số tiền..."
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-border-strong rounded-xl text-foreground text-sm font-semibold focus:border-focus outline-hidden"
                  required
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Toàn bộ số dư', val: balanceData.availableBalance },
                  { label: '50% số dư', val: Math.floor(balanceData.availableBalance * 0.5) },
                  { label: '10.000.000đ', val: 10000000 },
                  { label: '20.000.000đ', val: 20000000 },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setWithdrawForm({ ...withdrawForm, amount: String(preset.val) })}
                    className="px-2.5 py-1 rounded-lg border border-border hover:bg-secondary text-foreground text-[11px] font-medium transition cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Description Input */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Nội dung đối soát / Kỳ quyết toán:</label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Đối soát doanh thu tuần 42 Canteen CS1"
                  value={withdrawForm.description}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, description: e.target.value })}
                  className="w-full p-2.5 bg-surface border border-border-strong rounded-xl text-foreground text-xs focus:border-focus outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-secondary text-foreground font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWithdraw}
                  className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmittingWithdraw ? 'Đang xử lý...' : 'Xác nhận đối soát'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL 3: CHI TIẾT PHIẾU ĐỐI SOÁT */}
      {selectedWithdrawalDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface rounded-2xl border border-border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Receipt className="size-5 text-brand" />
                <h3 className="text-base font-semibold text-foreground">
                  Chứng Từ Đối Soát & Quyết Toán
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWithdrawalDetail(null)}
                className="text-muted hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-surface-hover border border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted">Mã chứng từ:</span>
                  <span className="font-mono font-bold text-foreground">
                    #WS-{selectedWithdrawalDetail.id?.substring(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Thời gian xác thực:</span>
                  <span className="font-mono text-foreground">
                    {new Date(selectedWithdrawalDetail.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Cơ sở thụ hưởng:</span>
                  <span className="font-semibold text-foreground">
                    {selectedWithdrawalDetail.canteen?.name || 'Canteen trường'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted">Số tiền quyết toán:</span>
                  <span className="text-base font-bold font-mono text-emerald-600">
                    {formatVND(Number(selectedWithdrawalDetail.amount))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Trạng thái hạch toán:</span>
                  <Badge variant="success" dot>Đã thanh toán ngân hàng</Badge>
                </div>
              </div>

              <div>
                <span className="text-muted">Nội dung ghi chú:</span>
                <p className="text-foreground font-medium mt-0.5 p-2.5 rounded-xl bg-surface-hover border border-border">
                  {selectedWithdrawalDetail.description || 'Đối soát doanh thu bán trú'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedWithdrawalDetail(null)}
                className="px-4 py-2 rounded-xl bg-brand text-white font-semibold text-xs cursor-pointer hover:bg-brand-hover shadow-xs"
              >
                Đóng chứng từ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
