import React, { useState, useEffect, useCallback } from 'react';
import { useApp, playSuccessBeep } from '../context/AppContext';
import { api } from '../services/api';
import {
  CreditCardIcon as CreditCard,
  EyeIcon as Eye,
  EyeSlashIcon as EyeOff,
  SparkleIcon as Sparkles,
  QrCodeIcon as QrCode,
  ArrowUpRightIcon as ArrowUpRight,
  CheckIcon as Check,
  CopyIcon as Copy,
  InfoIcon as Info,
  ClockCounterClockwiseIcon as History,
  XIcon as X,
  CaretDownIcon as ChevronDown,
  StorefrontIcon as Store,
  ForkKnifeIcon as Utensils,
  ArrowDownLeftIcon as ArrowDownLeft,
} from '@phosphor-icons/react';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

export const WalletPage: React.FC = () => {
  const { user, wallet, refreshUserData, selectedCanteen, canteens, setSelectedCanteenId, showAlert } = useApp();

  const [walletTab, setWalletTab] = useState<number>(0); // 0: Gói Ăn & Vé Tháng, 1: Nạp Tiền Số Dư
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [selectedAmount, setSelectedAmount] = useState<number>(100000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);
  const [vietQrLoaded, setVietQrLoaded] = useState<boolean>(false);

  const fetchMyRequests = async (isInitial = false) => {
    try {
      if (isInitial) setLoadingRequests(true);
      const res = await api.get('/parent/requests');
      if (Array.isArray(res.data)) {
        setMyRequests(res.data);
      }
    } catch {
      // ignore
    } finally {
      if (isInitial) setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchMyRequests(true);
    const interval = setInterval(() => fetchMyRequests(false), 4000);
    return () => clearInterval(interval);
  }, []);
  const [showVietQrModal, setShowVietQrModal] = useState<boolean>(false);

  useEffect(() => {
    if (showVietQrModal) setVietQrLoaded(false);
  }, [showVietQrModal, selectedAmount, customAmount]);
  const [showPolicyModal, setShowPolicyModal] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Branch-specific package states
  const [branchPackages, setBranchPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(false);
  const [showPackages, setShowPackages] = useState<boolean>(false);
  const [showAllRequests, setShowAllRequests] = useState<boolean>(false);
  const [showAllTransactions, setShowAllTransactions] = useState<boolean>(false);
  const [subscribingPkg, setSubscribingPkg] = useState<any | null>(null);
  const [viewingPkg, setViewingPkg] = useState<any | null>(null);
  const [subscribeMethod, setSubscribeMethod] = useState<'WALLET' | 'VIETQR'>('WALLET');
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [subSuccessMsg, setSubSuccessMsg] = useState<string | null>(null);

  useModalScrollLock(showVietQrModal || showPolicyModal || !!subscribingPkg || !!viewingPkg);

  const presets = [50000, 100000, 200000, 500000];

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const balance = Number(wallet?.balance ?? 0);
  const remainingMeals = Number(wallet?.remainingMeals ?? 0);
  const remainingBreakfast = Number(wallet?.remainingBreakfastMeals ?? 0);
  const hasActivePass = Boolean(wallet?.hasActiveSubscription || remainingMeals > 0 || remainingBreakfast > 0);

  // Fetch branch-specific packages whenever the active canteen changes
  const fetchPackages = useCallback(async () => {
    try {
      setLoadingPackages(true);
      const params: any = {};
      if (selectedCanteen?.id && selectedCanteen.id !== 'ALL') {
        params.canteenId = selectedCanteen.id;
      }
      const res = await api.get('/packages', { params });
      if (Array.isArray(res.data) && res.data.length > 0) {
        setBranchPackages(res.data);
      } else {
        // Fallback default packages matching current branch
        setBranchPackages([
          {
            id: 'pkg-default-1',
            name: 'Gói Tiêu Chuẩn 60 Suất',
            subtitle: 'Trưa & Tối • Cơm canh miễn phí',
            description: `60 suất trưa và tối trong tháng tại ${selectedCanteen?.name || 'cơ sở'}. Tặng kèm canh cơm thêm miễn phí.`,
            price: 1680000,
            totalCredits: 60,
            durationDays: 30,
            includesBreakfast: false,
            canteen: selectedCanteen,
          },
          {
            id: 'pkg-default-2',
            name: 'Gói Toàn Diện 90 Suất',
            subtitle: 'Cả 3 ca Sáng - Trưa - Tối',
            description: `90 suất ăn cả ngày (sáng, trưa, tối) tiện lợi và đầy đủ dinh dưỡng tại ${selectedCanteen?.name || 'cơ sở'}.`,
            price: 2280000,
            totalCredits: 90,
            durationDays: 30,
            includesBreakfast: true,
            canteen: selectedCanteen,
          },
          {
            id: 'pkg-default-3',
            name: 'Gói 20 Suất Linh Hoạt',
            subtitle: 'Tự do đổi bữa • Hạn 45 ngày',
            description: `20 suất ăn trưa thời hạn 45 ngày. Tự động trừ suất khi quét mã QR nhận khay tại quầy.`,
            price: 600000,
            totalCredits: 20,
            durationDays: 45,
            includesBreakfast: false,
            canteen: selectedCanteen,
          },
        ]);
      }
    } catch (err) {
      console.warn('Lỗi lấy danh sách gói ăn cơ sở:', err);
    } finally {
      setLoadingPackages(false);
    }
  }, [selectedCanteen]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleConfirmSubscribe = async () => {
    if (!subscribingPkg) return;
    try {
      setIsSubscribing(true);
      if (subscribeMethod === 'WALLET') {
        const res = await api.post('/packages/subscribe', {
          packageId: subscribingPkg.id,
          paymentMethod: 'WALLET',
        });
        playSuccessBeep();
        setSubSuccessMsg(res.data?.message || 'Đăng ký gói ăn thành công!');
        await refreshUserData();
        setTimeout(() => {
          setSubSuccessMsg(null);
          setSubscribingPkg(null);
        }, 1800);
      } else {
        // VIETQR: Open VietQR modal prefilled with package price and info
        setSelectedAmount(Number(subscribingPkg.price));
        setCustomAmount('');
        setSubscribingPkg(null);
        setShowVietQrModal(true);
      }
    } catch (err: any) {
      void showAlert(err.response?.data?.message || 'Lỗi khi đăng ký gói ăn', 'Lỗi');
    } finally {
      setIsSubscribing(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const bankBin = selectedCanteen?.bankBin || '970422';
  const accountNo = selectedCanteen?.bankAccountNumber || '0987654321';
  const accountName = selectedCanteen?.bankAccountName || selectedCanteen?.name || 'CANTEEN FPT';
  const userIdentifier = user?.studentCode || user?.phone || user?.id || 'HS-FPT';
  const transferContent = `NAPVI ${userIdentifier}`;

  const currentAmount = customAmount ? Number(customAmount) || selectedAmount : selectedAmount;
  const vietQrUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${currentAmount}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(accountName)}`;

  const defaultTransactions = [
    {
      id: 't1',
      title: 'Dùng 1 suất Vé Tháng Bán Trú',
      subtitle: `${selectedCanteen?.name || 'Bếp FPT'} • Còn ${remainingMeals} suất`,
      time: '11:25 - Hôm nay',
      amount: 0,
      badge: 'Vé Tháng',
      type: 'meal',
    },
    {
      id: 't2',
      title: 'Nạp tiền Ví qua VietQR',
      subtitle: 'Phụ huynh nạp hạn mức',
      time: '20:10 - Hôm qua',
      amount: 100000,
      badge: 'Thành công',
      type: 'topup',
    },
    {
      id: 't3',
      title: 'Combo cơm chiều tự chọn',
      subtitle: selectedCanteen?.name || 'Bếp FPT',
      time: '17:45 - 13/10',
      amount: -30000,
      badge: 'Trừ ví',
      type: 'pay',
    },
  ];
  const formatTxTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  const walletTransactions = (wallet as any)?.transactions;
  const rawTransactions =
    Array.isArray(walletTransactions) && walletTransactions.length > 0
      ? walletTransactions
      : defaultTransactions;
  const transactions = rawTransactions.map((tx: any) => {
    const rawType = String(tx.type || '').toLowerCase();
    const amount = Number(tx.amount ?? 0);
    const kind =
      rawType === 'meal'
        ? 'meal'
        : rawType === 'topup' || rawType === 'refund' || amount > 0
        ? 'topup'
        : 'pay';

    return {
      ...tx,
      amount,
      type: kind,
      title:
        tx.title ||
        tx.description ||
        (kind === 'topup'
          ? 'Nạp tiền ví Canteen'
          : kind === 'meal'
          ? 'Dùng 1 suất Vé Tháng'
          : 'Thanh toán Canteen'),
      time: tx.time || formatTxTime(tx.createdAt),
    };
  });
  const visibleRequests = showAllRequests ? myRequests : myRequests.slice(0, 3);
  const visibleTransactions = showAllTransactions ? transactions : transactions.slice(0, 3);

  return (
    <div className="px-3.5 pt-3 sm:px-5 sm:pt-4 pb-28 space-y-3.5 bg-[#F7FAFE] min-h-screen">
      {/* 1. DIGITAL STUDENT CARD (Minimal & Focused) */}
      <div className="relative rounded-3xl p-4 sm:p-5 text-white overflow-hidden shadow-[0_8px_24px_rgba(0,62,130,0.18)] bg-gradient-to-br from-[#003366] via-[#004e9c] to-[#0057b8]">
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        {/* Top Bar: Title & Pass Badge */}
        <div className="flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-white/90" />
            <span className="text-xs font-bold tracking-wide text-white/90">Ví Canteen</span>
          </div>

          <span
            className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shrink-0 ${
              hasActivePass
                ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-300/30'
                : 'bg-white/15 text-white/90'
            }`}
          >
            <Utensils className="w-3 h-3" />
            {hasActivePass ? `Còn ${remainingMeals} suất` : 'Ví chuẩn'}
          </span>
        </div>

        {/* Balance */}
        <div className="my-3.5 flex items-center gap-2.5 relative z-10">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono tabular-nums">
            {showBalance ? formatVND(balance) : '••••••••đ'}
          </p>
          <button
            type="button"
            onClick={() => setShowBalance(!showBalance)}
            className="text-white/70 hover:text-white cursor-pointer active:scale-95 transition p-1"
            aria-label="Ẩn/hiện số dư"
          >
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        {/* Card Footer */}
        <div className="pt-2.5 border-t border-white/15 flex items-center justify-between gap-2 text-xs relative z-10">
          <p className="font-semibold text-white/90 text-[11px] truncate min-w-0">
            {user?.fullName || 'Học sinh FPT'}
            {user?.studentCode ? ` • ${user.studentCode}` : ''}
          </p>

          <button
            type="button"
            onClick={() => {
              setSelectedAmount(100000);
              setCustomAmount('');
              setShowVietQrModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-white text-[#003E82] font-bold text-[11px] shadow-xs hover:bg-slate-50 active:scale-95 transition cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <QrCode className="w-3.5 h-3.5 text-[#003E82]" />
            <span>Nạp nhanh</span>
          </button>
        </div>
      </div>

      {/* 2. CANTEEN LOCATION & POLICY (1-line Compact) */}
      <div className="flex items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 min-w-0 flex-1">
          <Store className="w-3.5 h-3.5 text-[#0057b8] shrink-0" />
          {canteens.length > 1 ? (
            <div className="relative inline-flex items-center min-w-0 max-w-full">
              <select
                value={selectedCanteen?.id || ''}
                onChange={(e) => setSelectedCanteenId(e.target.value)}
                className="appearance-none font-bold text-slate-800 bg-transparent pr-4 text-xs outline-none cursor-pointer truncate max-w-full"
              >
                {canteens.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 pointer-events-none" />
            </div>
          ) : (
            <span className="font-bold text-slate-800 truncate">
              {selectedCanteen?.name || 'THPT FPT Quy Nhơn'}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowPolicyModal(true)}
          className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Quy định</span>
        </button>
      </div>

      {/* 3. SEGMENTED TAB SWITCHER */}
      <div className="bg-slate-200/70 p-1 rounded-xl flex items-center gap-1">
        <button
          type="button"
          onClick={() => setWalletTab(0)}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            walletTab === 0
              ? 'bg-white text-[#0057b8] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" weight={walletTab === 0 ? 'fill' : 'regular'} />
          <span>Gói Tháng</span>
        </button>

        <button
          type="button"
          onClick={() => setWalletTab(1)}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            walletTab === 1
              ? 'bg-white text-[#0057b8] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" weight={walletTab === 1 ? 'fill' : 'regular'} />
          <span>Nạp Tiền</span>
        </button>
      </div>

      {/* 4. TAB CONTENTS */}
      {walletTab === 0 ? (
        /* ================= TAB 0: GÓI THÁNG ================= */
        <div className="space-y-3">
          {/* Active Pass Status (Minimal 2-line Card) */}
          {hasActivePass && (
            <div className="bg-white rounded-2xl p-3.5 border border-blue-100 shadow-2xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {wallet?.packageName || 'Vé Tháng Bán Trú'}
                </h4>
                <span className="text-xs font-bold font-mono text-slate-900 shrink-0">
                  {remainingMeals} suất{remainingBreakfast > 0 ? ` (+${remainingBreakfast} sáng)` : ''}
                </span>
              </div>

              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#0057b8] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(12, (remainingMeals / 30) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Collapsible Available Packages Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPackages((prev) => !prev)}
              aria-expanded={showPackages}
              className="w-full p-3.5 flex items-center justify-between gap-2.5 text-left hover:bg-slate-50/70 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0057b8] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    Gói ăn đăng ký ({branchPackages.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    Tiết kiệm đến 25%
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 shrink-0">
                <span>{showPackages ? 'Thu gọn' : 'Xem gói'}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${showPackages ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {showPackages && (
              <div className="p-3 border-t border-slate-100 bg-slate-50/40">
                {loadingPackages && branchPackages.length === 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-pulse">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-white rounded-xl p-3 border border-slate-200/70 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="w-36 h-3.5 bg-slate-200 rounded" />
                          <div className="w-20 h-4 bg-slate-200 rounded" />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="w-40 h-2.5 bg-slate-100 rounded" />
                          <div className="w-16 h-7 bg-slate-200 rounded-xl" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : branchPackages.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-3">Chưa có gói ăn khả dụng.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {branchPackages.map((pkg) => {
                    const totalCredits = pkg.totalCredits || pkg.totalMeals || 60;
                    const perMeal = totalCredits > 0 ? Math.round(Number(pkg.price) / totalCredits) : 0;

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setViewingPkg(pkg)}
                        className="bg-white rounded-xl p-3 border border-slate-200/80 hover:border-[#0057b8]/60 transition-all cursor-pointer active:scale-99 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">{pkg.name}</h4>
                            {pkg.includesBreakfast && (
                              <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                                3 ca
                              </span>
                            )}
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono shrink-0 tabular-nums">
                            {formatVND(pkg.price)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-slate-500 truncate min-w-0">
                            {totalCredits} suất • {pkg.durationDays || 30} ngày • ~{formatVND(perMeal)}/suất
                          </p>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubscribingPkg(pkg);
                              setSubscribeMethod(balance >= Number(pkg.price) ? 'WALLET' : 'VIETQR');
                            }}
                            className="bg-[#0057b8] text-white text-[11px] font-bold px-3.5 py-1.5 rounded-xl hover:bg-[#004593] shadow-xs active:scale-95 transition cursor-pointer shrink-0"
                          >
                            Đăng ký
                          </button>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= TAB 1: NẠP TIỀN SỐ DƯ ================= */
        <div className="space-y-3">
          {/* Quick Amount Presets */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2.5">
            <span className="text-xs font-bold text-slate-800 block">Chọn số tiền nạp</span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {presets.map((amt) => {
                const isSelected = selectedAmount === amt && !customAmount;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(amt);
                      setCustomAmount('');
                    }}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition cursor-pointer active:scale-95 font-mono tabular-nums ${
                      isSelected
                        ? 'border-[#0057b8] bg-blue-50/70 text-[#0057b8] shadow-2xs ring-1 ring-[#0057b8]'
                        : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {formatVND(amt)}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <input
                type="number"
                placeholder="Nhập số tiền khác (VD: 150000)"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0057b8] focus:bg-white transition pr-12 font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                VNĐ
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowVietQrModal(true)}
              className="w-full py-2.5 rounded-xl bg-[#0057b8] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:bg-[#004593] active:scale-98 transition cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Nạp qua VietQR • {formatVND(currentAmount)}</span>
            </button>
          </div>
        </div>
      )}

      {/* YÊU CẦU NHỜ BỐ MẸ ĐÃ GỬI (GỌN) */}
      {loadingRequests && myRequests.length === 0 ? (
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2.5 animate-pulse">
          <div className="w-28 h-3 bg-slate-200 rounded" />
          {[1, 2].map((i) => (
            <div key={i} className="py-1.5 flex items-center justify-between gap-2">
              <div className="space-y-1.5 flex-1">
                <div className="w-32 h-3 bg-slate-200 rounded" />
                <div className="w-44 h-2.5 bg-slate-100 rounded" />
              </div>
              <div className="w-20 h-5 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : myRequests.length > 0 ? (
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800">Yêu cầu đã gửi ({myRequests.length})</span>
            {myRequests.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllRequests((prev) => !prev)}
                className="flex items-center gap-0.5 text-[11px] font-bold text-[#0057b8] hover:underline cursor-pointer shrink-0"
              >
                <span>{showAllRequests ? 'Thu gọn' : 'Xem tất cả'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllRequests ? 'rotate-180' : ''}`}
                />
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {visibleRequests.map((req) => (
              <div key={req.id} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {req.type === 'PACKAGE' ? req.packageName || 'Gói cơm tháng' : 'Nạp ví Canteen'}
                  </p>
                  <p className="text-[10.5px] text-slate-400 truncate">
                    {new Date(req.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    {req.note ? ` • ${req.note}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-slate-900 tabular-nums">
                    {formatVND(req.amount)}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      req.status === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700'
                        : req.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {req.status === 'PAID' ? 'Đã duyệt' : req.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 5. COMPACT TRANSACTION FEED */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-[#0057b8]" />
            <span className="text-xs font-bold text-slate-800">Giao dịch gần đây</span>
          </div>

          {transactions.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllTransactions((prev) => !prev)}
              className="flex items-center gap-0.5 text-[11px] font-bold text-[#0057b8] hover:underline cursor-pointer shrink-0"
            >
              <span>{showAllTransactions ? 'Thu gọn' : `Xem tất cả (${transactions.length})`}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllTransactions ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {visibleTransactions.map((tx: any) => (
            <div key={tx.id} className="py-2 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    tx.type === 'topup'
                      ? 'bg-emerald-50 text-emerald-600'
                      : tx.type === 'meal'
                      ? 'bg-blue-50 text-[#0057b8]'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tx.type === 'topup' ? (
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  ) : tx.type === 'meal' ? (
                    <Utensils className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{tx.title}</p>
                  <p className="text-[10px] text-slate-400 truncate">{tx.time}</p>
                </div>
              </div>

              <span
                className={`text-xs font-bold font-mono shrink-0 tabular-nums ${
                  tx.type === 'topup'
                    ? 'text-emerald-600'
                    : 'text-slate-900'
                }`}
              >
                {tx.type === 'meal'
                  ? '-1 suất'
                  : tx.amount > 0
                  ? `+${formatVND(tx.amount)}`
                  : formatVND(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* SUBSCRIPTION CONFIRMATION MODAL */}
      {subscribingPkg && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSubscribingPkg(null);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl p-4 sm:p-5 space-y-3.5 max-h-[85vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-150 overscroll-contain modal-scrollable touch-pan-y">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900">Đăng ký gói ăn</h4>
              <button
                type="button"
                onClick={() => setSubscribingPkg(null)}
                className="text-slate-400 hover:text-black cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Package Summary Box */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-xs font-bold text-slate-900 truncate">{subscribingPkg.name}</h5>
                <span className="text-sm font-bold text-slate-900 shrink-0 font-mono tabular-nums">
                  {formatVND(subscribingPkg.price)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {subscribingPkg.totalCredits || 60} suất • {subscribingPkg.durationDays || 30} ngày •{' '}
                {subscribingPkg.canteen?.name || selectedCanteen?.name}
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-900 block">Thanh toán bằng</span>

              <button
                type="button"
                onClick={() => setSubscribeMethod('WALLET')}
                className={`w-full px-3 py-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition text-left ${
                  subscribeMethod === 'WALLET'
                    ? 'border-[#0057b8] bg-blue-50/50 ring-1 ring-[#0057b8]/30'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">Ví Canteen</span>
                  <span
                    className={`text-xs font-bold font-mono tabular-nums ${
                      balance < Number(subscribingPkg.price) ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {formatVND(balance)}
                  </span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
                    subscribeMethod === 'WALLET' ? 'border-[#0057b8] bg-[#0057b8]' : 'border-slate-300'
                  }`}
                >
                  {subscribeMethod === 'WALLET' && <Check className="w-2.5 h-2.5 text-white" weight="bold" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSubscribeMethod('VIETQR')}
                className={`w-full px-3 py-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition text-left ${
                  subscribeMethod === 'VIETQR'
                    ? 'border-[#0057b8] bg-blue-50/50 ring-1 ring-[#0057b8]/30'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">VietQR Ngân Hàng</span>
                  <span className="text-[11px] font-semibold text-amber-700">Quét QR</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
                    subscribeMethod === 'VIETQR' ? 'border-[#0057b8] bg-[#0057b8]' : 'border-slate-300'
                  }`}
                >
                  {subscribeMethod === 'VIETQR' && <Check className="w-2.5 h-2.5 text-white" weight="bold" />}
                </div>
              </button>
            </div>

            {subSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold text-center">
                {subSuccessMsg}
              </div>
            )}

            <button
              type="button"
              disabled={isSubscribing || (subscribeMethod === 'WALLET' && balance < Number(subscribingPkg.price))}
              onClick={handleConfirmSubscribe}
              className="w-full py-3 rounded-xl bg-[#0057b8] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:bg-[#004593] active:scale-98 transition disabled:opacity-50 cursor-pointer"
            >
              {isSubscribing ? 'Đang xử lý...' : `Xác nhận (${formatVND(subscribingPkg.price)})`}
            </button>
          </div>
        </div>
      )}

      {/* VIETQR MODAL */}
      {showVietQrModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowVietQrModal(false);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl p-4 sm:p-5 space-y-3.5 max-h-[85vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-150 overscroll-contain modal-scrollable touch-pan-y">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900">Nạp tiền VietQR</h4>
              <button
                type="button"
                onClick={() => setShowVietQrModal(false)}
                className="text-slate-400 hover:text-black cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col items-center">
              <div className="bg-white p-2.5 rounded-2xl shadow-xs border border-slate-200 relative w-48 h-48 flex items-center justify-center">
                {!vietQrLoaded && (
                  <div className="absolute inset-2.5 rounded-xl bg-slate-100 animate-pulse flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-[#0057b8] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10.5px] font-medium text-slate-500">Đang tải mã QR...</span>
                  </div>
                )}
                <img
                  src={vietQrUrl}
                  alt="VietQR"
                  onLoad={() => setVietQrLoaded(true)}
                  onError={() => setVietQrLoaded(true)}
                  className={`w-44 h-44 object-contain transition-opacity duration-200 ${
                    vietQrLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </div>
              <p className="text-sm font-bold text-slate-900 mt-2.5 font-mono tabular-nums">
                {formatVND(currentAmount)}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-400">Số tài khoản</p>
                  <p className="font-mono font-bold text-slate-900">{accountNo}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(accountNo, 'acc')}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-[10px] text-slate-700 flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  {copiedKey === 'acc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'acc' ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-400">Nội dung chuyển khoản</p>
                  <p className="font-mono font-bold text-slate-900">{transferContent}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(transferContent, 'content')}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-[10px] text-slate-700 flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  {copiedKey === 'content' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'content' ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowVietQrModal(false);
                refreshUserData();
              }}
              className="w-full py-3 rounded-xl bg-[#0057b8] text-white font-bold text-xs cursor-pointer hover:bg-[#004593] active:scale-98 transition shadow-xs"
            >
              Đã chuyển khoản
            </button>
          </div>
        </div>
      )}

      {/* POLICY MODAL */}
      {showPolicyModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPolicyModal(false);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xl animate-in zoom-in-95 duration-150 overscroll-contain modal-scrollable touch-pan-y max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-900">Quy định gói ăn</h4>
              <button
                type="button"
                onClick={() => setShowPolicyModal(false)}
                className="text-slate-400 hover:text-black cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc pl-4">
              <li>Áp dụng từ Thứ 2 – Thứ 6 tại cơ sở Canteen đã chọn.</li>
              <li>Tự động trừ 1 lượt khi quét QR nhận suất tại quầy.</li>
              <li>Nghỉ học có phép được bảo lưu tối đa 3 ngày/tháng.</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowPolicyModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer active:scale-98 transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* PACKAGE DETAIL MODAL */}
      {viewingPkg && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingPkg(null);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto overscroll-contain modal-scrollable touch-pan-y">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-base font-black text-slate-900">{viewingPkg.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {viewingPkg.totalCredits || 60} suất • {viewingPkg.durationDays || 30} ngày
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingPkg(null)}
                className="p-1 rounded-full text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Giá gói</span>
              <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                {formatVND(viewingPkg.price)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 space-y-1.5 leading-relaxed">
              <p>{viewingPkg.description || 'Trừ lượt tự động khi quét QR tại quầy.'}</p>
              <p className="text-slate-700 font-medium">• Miễn phí cơm trắng &amp; canh nóng tại quầy.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                const pkgToSub = viewingPkg;
                setViewingPkg(null);
                setSubscribingPkg(pkgToSub);
                setSubscribeMethod(balance >= Number(pkgToSub.price) ? 'WALLET' : 'VIETQR');
              }}
              className="w-full py-3 rounded-xl bg-[#0057b8] text-white font-bold text-xs hover:bg-[#004593] shadow-xs transition cursor-pointer active:scale-98"
            >
              Đăng ký ({formatVND(viewingPkg.price)})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};