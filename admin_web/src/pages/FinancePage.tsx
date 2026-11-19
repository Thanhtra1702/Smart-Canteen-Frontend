import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PlusCircleIcon as PlusCircle,
  XIcon as X,
  FileXlsIcon as FileSpreadsheet,
  EyeIcon as Eye,
  CaretLeftIcon as ChevronLeft,
  CaretRightIcon as ChevronRight,
  CaretUpDownIcon as ChevronsUpDown,
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';

export const FinancePage: React.FC = () => {
  const { selectedCanteenId } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'reconciliations' | 'ledger'>('reconciliations');
  const [loading, setLoading] = useState(false);
  const [canteens, setCanteens] = useState<any[]>([]);

  const [balanceData, setBalanceData] = useState({
    totalRevenue: 0,
    totalWithdrawn: 0,
    availableBalance: 0,
  });

  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ledgerPagination, setLedgerPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });
  const [ledgerPage, setLedgerPage] = useState(1);

  // Sorting state
  const [reconSort, setReconSort] = useState<{ field: 'createdAt' | 'amount'; dir: 'asc' | 'desc' }>({
    field: 'createdAt',
    dir: 'desc',
  });
  const [ledgerSort, setLedgerSort] = useState<{ field: 'createdAt' | 'amount'; dir: 'asc' | 'desc' }>({
    field: 'createdAt',
    dir: 'desc',
  });

  // Modals
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    canteenId: '',
    amount: '',
    description: '',
  });
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [selectedWithdrawalDetail, setSelectedWithdrawalDetail] = useState<any | null>(null);

  const fetchCanteens = useCallback(async () => {
    try {
      const res = await api.get('/canteens').catch(() => api.get('/admin-hq/canteens'));
      const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setCanteens(list);
    } catch (err) {
      console.error('Failed to load canteens', err);
    }
  }, []);

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

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchBalance(), fetchWithdrawals(), fetchLedger()]);
    setLoading(false);
  }, [fetchBalance, fetchWithdrawals, fetchLedger]);

  useEffect(() => {
    fetchCanteens();
    refreshAll();
  }, [fetchCanteens, refreshAll]);

  const formatVND = (num: number) =>
    `${Math.round(num || 0).toLocaleString('vi-VN')} đ`;

  const formatDateTime = (dt: string) => {
    const d = new Date(dt);
    return {
      time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      date: d.toLocaleDateString('vi-VN'),
    };
  };

  const getTxMeta = (type: string) => {
    switch (type) {
      case 'TOPUP':
      case 'TOPUP_BANK':
        return { label: 'Nạp ví VietQR', dot: 'bg-emerald-500' };
      case 'TOPUP_CASH':
        return { label: 'Nạp tiền tại quầy', dot: 'bg-slate-400' };
      case 'PAYMENT':
      case 'ORDER_PAYMENT':
        return { label: 'Thanh toán suất ăn', dot: 'bg-[#0057b8]' };
      case 'PACKAGE_PURCHASE':
        return { label: 'Đăng ký gói tháng', dot: 'bg-[#0057b8]' };
      case 'REFUND':
        return { label: 'Hoàn tiền vào ví', dot: 'bg-amber-500' };
      default:
        return { label: 'Giao dịch ví', dot: 'bg-slate-400' };
    }
  };

  const sortedWithdrawals = useMemo(() => {
    const factor = reconSort.dir === 'asc' ? 1 : -1;
    return [...withdrawals].sort((a, b) => {
      if (reconSort.field === 'amount') {
        return (Number(a.amount || 0) - Number(b.amount || 0)) * factor;
      }
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * factor;
    });
  }, [withdrawals, reconSort]);

  const sortedTransactions = useMemo(() => {
    const factor = ledgerSort.dir === 'asc' ? 1 : -1;
    return [...transactions].sort((a, b) => {
      if (ledgerSort.field === 'amount') {
        return (Math.abs(Number(a.amount || 0)) - Math.abs(Number(b.amount || 0))) * factor;
      }
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * factor;
    });
  }, [transactions, ledgerSort]);

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

      toast.success(`Đã tạo lệnh đối soát ${formatVND(amountNum)} thành công!`);
      setShowWithdrawModal(false);
      setWithdrawForm({ canteenId: '', amount: '', description: '' });
      await refreshAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi tạo lệnh đối soát');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

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
      toast.success('Đã tải xuống file báo cáo tài chính Excel!');
    } catch {
      toast.error('Lỗi khi xuất file báo cáo Excel');
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. Compact 4-Column Divided KPI Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 overflow-hidden">
        <div className="p-4">
          <span className="text-xs text-slate-500 block">Tổng doanh thu</span>
          <div className="mt-1.5 text-xl font-semibold text-slate-900 tabular-nums font-mono">
            {formatVND(balanceData.totalRevenue)}
          </div>
        </div>

        <div className="p-4">
          <span className="text-xs text-slate-500 block">Khả dụng đối soát</span>
          <div className="mt-1.5 text-xl font-semibold text-emerald-600 tabular-nums font-mono">
            {formatVND(balanceData.availableBalance)}
          </div>
        </div>

        <div className="p-4">
          <span className="text-xs text-slate-500 block">Đã giải ngân</span>
          <div className="mt-1.5 text-xl font-semibold text-slate-900 tabular-nums font-mono">
            {formatVND(balanceData.totalWithdrawn)}
          </div>
        </div>

        <div className="p-4">
          <span className="text-xs text-slate-500 block">Giao dịch dòng tiền</span>
          <div className="mt-1.5 text-xl font-semibold text-slate-900 tabular-nums font-mono">
            {ledgerPagination.totalItems}
          </div>
        </div>
      </div>

      {/* 2. Sub-tabs & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('reconciliations')}
            className={`h-8 px-3 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reconciliations'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <span>Lịch sử đối soát</span>
            <span className="text-[10px] text-slate-400 font-numeric">{withdrawals.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`h-8 px-3 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <span>Sổ cái dòng tiền</span>
            <span className="text-[10px] text-slate-400 font-numeric">{ledgerPagination.totalItems}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            icon={<FileSpreadsheet className="size-3.5 text-emerald-600" />}
          >
            Xuất Excel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setWithdrawForm({
                canteenId: selectedCanteenId !== 'ALL' ? selectedCanteenId : canteens[0]?.id || '',
                amount: balanceData.availableBalance > 0 ? String(balanceData.availableBalance) : '',
                description: `Đối soát doanh thu ${new Date().toLocaleDateString('vi-VN', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                })}`,
              });
              setShowWithdrawModal(true);
            }}
            icon={<PlusCircle className="size-3.5" />}
          >
            Yêu cầu đối soát
          </Button>
        </div>
      </div>

      {/* 3. Tab 1: Lịch sử đối soát (Floating Row Cards matching AuditLogsPage) */}
      {activeTab === 'reconciliations' && (
        <div className="space-y-3">
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[680px] space-y-2">
              <div className="grid grid-cols-[minmax(210px,1.3fr)_minmax(200px,1.4fr)_minmax(150px,1fr)_90px] items-center gap-3 px-4 py-1 text-xs font-medium text-slate-400">
                <button
                  type="button"
                  onClick={() =>
                    setReconSort((prev) => ({
                      field: 'createdAt',
                      dir: prev.field === 'createdAt' && prev.dir === 'desc' ? 'asc' : 'desc',
                    }))
                  }
                  className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer text-left"
                >
                  <span>Cơ sở / Thời gian</span>
                  <ChevronsUpDown className="size-3 text-slate-300" />
                </button>
                <span>Nội dung đối soát</span>
                <button
                  type="button"
                  onClick={() =>
                    setReconSort((prev) => ({
                      field: 'amount',
                      dir: prev.field === 'amount' && prev.dir === 'desc' ? 'asc' : 'desc',
                    }))
                  }
                  className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer text-left"
                >
                  <span>Số tiền &amp; Trạng thái</span>
                  <ChevronsUpDown className="size-3 text-slate-300" />
                </button>
                <span className="text-right">Chi tiết</span>
              </div>

              {sortedWithdrawals.map((w, idx) => {
                const { time, date } = formatDateTime(w.createdAt);
                const isPending = w.status === 'PENDING';
                const canteenName = w.canteen?.name || 'Canteen cơ sở';

                return (
                  <div
                    key={w.id || idx}
                    className="group bg-white rounded-xl border border-slate-200/75 hover:border-[#0057b8] hover:shadow-xs px-4 py-3 grid grid-cols-[minmax(210px,1.3fr)_minmax(200px,1.4fr)_minmax(150px,1fr)_90px] items-center gap-3 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate" title={canteenName}>
                        {canteenName}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums mt-0.5 flex items-center gap-1.5">
                        <span className="text-slate-600">{time}</span>
                        <span className="text-slate-400">{date}</span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs text-slate-700 truncate" title={w.description || ''}>
                        {w.description || 'Đối soát doanh thu bán trú'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                        {w.code || `#WS-${String(w.id || '').substring(0, 8).toUpperCase()}`}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-medium font-mono tabular-nums text-slate-900">
                        {formatVND(Number(w.amount))}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span
                          className={`size-1.5 rounded-full shrink-0 ${
                            isPending ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                        <span>{isPending ? 'Chờ xử lý' : 'Đã quyết toán'}</span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedWithdrawalDetail(w)}
                        className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 group-hover:bg-[#0057b8] group-hover:text-white group-hover:border-[#0057b8] text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <Eye className="size-3.5" />
                        <span>Xem</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {sortedWithdrawals.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200/75 py-12 text-center text-xs text-slate-400">
                  {loading ? 'Đang tải dữ liệu đối soát...' : 'Chưa có đợt đối soát nào.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Tab 2: Sổ cái dòng tiền (Floating Row Cards matching AuditLogsPage) */}
      {activeTab === 'ledger' && (
        <div className="space-y-3">
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[680px] space-y-2">
              <div className="grid grid-cols-[minmax(190px,1.2fr)_minmax(160px,1fr)_minmax(190px,1.3fr)_150px] items-center gap-3 px-4 py-1 text-xs font-medium text-slate-400">
                <button
                  type="button"
                  onClick={() =>
                    setLedgerSort((prev) => ({
                      field: 'createdAt',
                      dir: prev.field === 'createdAt' && prev.dir === 'desc' ? 'asc' : 'desc',
                    }))
                  }
                  className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer text-left"
                >
                  <span>Người dùng</span>
                  <ChevronsUpDown className="size-3 text-slate-300" />
                </button>
                <span>Loại giao dịch</span>
                <span>Ghi chú</span>
                <button
                  type="button"
                  onClick={() =>
                    setLedgerSort((prev) => ({
                      field: 'amount',
                      dir: prev.field === 'amount' && prev.dir === 'desc' ? 'asc' : 'desc',
                    }))
                  }
                  className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer justify-end"
                >
                  <span>Số tiền</span>
                  <ChevronsUpDown className="size-3 text-slate-300" />
                </button>
              </div>

              {sortedTransactions.map((tx) => {
                const rawAmount = Number(tx.amount || 0);
                const absAmount = Math.abs(rawAmount);
                const isCredit =
                  rawAmount > 0 &&
                  tx.type !== 'ORDER_PAYMENT' &&
                  tx.type !== 'PAYMENT' &&
                  tx.type !== 'PACKAGE_PURCHASE';
                const userObj = tx.wallet?.user || tx.user;
                const { time, date } = formatDateTime(tx.createdAt);
                const txMeta = getTxMeta(tx.type);

                return (
                  <div
                    key={tx.id}
                    className="group bg-white rounded-xl border border-slate-200/75 hover:border-[#0057b8] hover:shadow-xs px-4 py-3 grid grid-cols-[minmax(190px,1.2fr)_minmax(160px,1fr)_minmax(190px,1.3fr)_150px] items-center gap-3 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">
                        {userObj?.fullName || 'Học sinh'}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums mt-0.5 flex items-center gap-1.5">
                        <span className="text-slate-600">{time}</span>
                        <span className="text-slate-400">{date}</span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`size-1.5 rounded-full shrink-0 ${txMeta.dot}`} />
                        <span className="text-xs text-slate-800 truncate">{txMeta.label}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5 pl-3.5">
                        {userObj?.phone || userObj?.email || 'Ví điện tử'}
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 truncate" title={tx.description || ''}>
                      {tx.description ||
                        (tx.orderId ? `Đơn hàng #${String(tx.orderId).substring(0, 8)}` : 'Giao dịch ví')}
                    </div>

                    <div className="text-right min-w-0">
                      <div
                        className={`text-xs font-medium font-mono tabular-nums ${
                          isCredit ? 'text-emerald-600' : 'text-slate-800'
                        }`}
                      >
                        {isCredit ? `+${formatVND(absAmount)}` : `-${formatVND(absAmount)}`}
                      </div>
                      {tx.balanceAfter !== undefined && (
                        <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                          Còn {formatVND(Number(tx.balanceAfter))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {sortedTransactions.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200/75 py-12 text-center text-xs text-slate-400">
                  {loading ? 'Đang tải sổ cái...' : 'Không có giao dịch nào.'}
                </div>
              )}
            </div>
          </div>

          {ledgerPagination.totalPages > 1 && (
            <div className="pt-0.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                {sortedTransactions.length} / {ledgerPagination.totalItems} giao dịch
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ledgerPage <= 1 || loading}
                  onClick={() => setLedgerPage(ledgerPage - 1)}
                  icon={<ChevronLeft className="size-3.5" />}
                >
                  Trước
                </Button>
                <span className="text-xs font-numeric font-medium px-2 text-slate-700">
                  {ledgerPage} / {ledgerPagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ledgerPage >= ledgerPagination.totalPages || loading}
                  onClick={() => setLedgerPage(ledgerPage + 1)}
                  icon={<ChevronRight className="size-3.5" />}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: LẬP LỆNH ĐỐI SOÁT */}
      {showWithdrawModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowWithdrawModal(false);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-modal p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Yêu cầu đối soát &amp; giải ngân</h3>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                aria-label="Đóng"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <form onSubmit={handleSubmitWithdraw} className="space-y-3.5">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Cơ sở Canteen</label>
                <select
                  value={withdrawForm.canteenId}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, canteenId: e.target.value })}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-[#0057b8] outline-hidden"
                >
                  {canteens.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <span className="text-slate-500">Số dư khả dụng</span>
                <span className="text-sm font-semibold font-mono text-emerald-600 tabular-nums">
                  {formatVND(balanceData.availableBalance)}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-slate-700 block">Số tiền đối soát (đ)</label>
                <input
                  type="number"
                  placeholder="Nhập số tiền..."
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  className="w-full h-9.5 px-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm font-mono font-semibold focus:border-[#0057b8] outline-hidden"
                  required
                />
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Toàn bộ số dư', val: balanceData.availableBalance },
                    { label: '50% số dư', val: Math.floor(balanceData.availableBalance * 0.5) },
                    { label: '10.000.000 đ', val: 10000000 },
                    { label: '20.000.000 đ', val: 20000000 },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setWithdrawForm({ ...withdrawForm, amount: String(preset.val) })}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Nội dung đối soát</label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Đối soát doanh thu tuần 1 tháng 11"
                  value={withdrawForm.description}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, description: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-[#0057b8] outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowWithdrawModal(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingWithdraw}>
                  Xác nhận đối soát
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHI TIẾT PHIẾU ĐỐI SOÁT */}
      {selectedWithdrawalDetail && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedWithdrawalDetail(null);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-modal p-5 space-y-4 text-xs">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Chi tiết phiếu đối soát</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedWithdrawalDetail.canteen?.name || 'Canteen cơ sở'} •{' '}
                  {new Date(selectedWithdrawalDetail.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWithdrawalDetail(null)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Đóng"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-slate-50/40">
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-4">
                <span className="text-slate-500">Mã phiếu</span>
                <span className="font-mono font-medium text-slate-800">
                  {selectedWithdrawalDetail.code ||
                    `#WS-${String(selectedWithdrawalDetail.id || '').substring(0, 8).toUpperCase()}`}
                </span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-4">
                <span className="text-slate-500">Cơ sở thụ hưởng</span>
                <span className="font-medium text-slate-800 text-right">
                  {selectedWithdrawalDetail.canteen?.name || 'Canteen trường'}
                </span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-4">
                <span className="text-slate-500">Số tiền quyết toán</span>
                <span className="text-sm font-semibold font-mono text-emerald-600 tabular-nums">
                  {formatVND(Number(selectedWithdrawalDetail.amount))}
                </span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-4">
                <span className="text-slate-500">Trạng thái</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                  <span
                    className={`size-1.5 rounded-full ${
                      selectedWithdrawalDetail.status === 'PENDING' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                  {selectedWithdrawalDetail.status === 'PENDING' ? 'Chờ xử lý' : 'Đã thanh toán'}
                </span>
              </div>
              <div className="px-3.5 py-2.5 flex items-start justify-between gap-4">
                <span className="text-slate-500 shrink-0">Nội dung</span>
                <span className="text-slate-800 text-right">
                  {selectedWithdrawalDetail.description || 'Đối soát doanh thu bán trú'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedWithdrawalDetail(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
