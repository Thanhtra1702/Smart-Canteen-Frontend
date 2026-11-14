import React, { useState, useEffect } from 'react';
import { useApp, playSuccessBeep } from '../context/AppContext';
import { api } from '../services/api';
import {
  CreditCard,
  Eye,
  EyeOff,
  Sparkles,
  QrCode,
  ArrowUpRight,
  ShieldCheck,
  Check,
  Copy,
  Info,
  Clock,
  History,
  Send,
  Users,
  Bell,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronDown,
  Wifi,
  Store,
  Building2,
  Utensils,
  Calendar,
  ArrowDownLeft,
  Share2,
} from 'lucide-react';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

export const WalletPage: React.FC = () => {
  const { user, wallet, refreshUserData, selectedCanteen, canteens, setSelectedCanteenId } = useApp();

  const [walletTab, setWalletTab] = useState<number>(0); // 0: Gói Ăn & Vé Tháng, 1: Nạp Tiền Số Dư
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [selectedAmount, setSelectedAmount] = useState<number>(100000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [parentRequestNote, setParentRequestNote] = useState<string>('');
  const [isSendingParentRequest, setIsSendingParentRequest] = useState<boolean>(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  const fetchMyRequests = async () => {
    try {
      const res = await api.get('/parent/requests');
      if (Array.isArray(res.data)) {
        setMyRequests(res.data);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchMyRequests();
    const interval = setInterval(fetchMyRequests, 4000);
    return () => clearInterval(interval);
  }, []);
  const [showVietQrModal, setShowVietQrModal] = useState<boolean>(false);
  const [showPolicyModal, setShowPolicyModal] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Branch-specific package states
  const [branchPackages, setBranchPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(false);
  const [subscribingPkg, setSubscribingPkg] = useState<any | null>(null);
  const [viewingPkg, setViewingPkg] = useState<any | null>(null);
  const [subscribeMethod, setSubscribeMethod] = useState<'WALLET' | 'VIETQR'>('WALLET');
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [subSuccessMsg, setSubSuccessMsg] = useState<string | null>(null);
  const [isConfirmingTopup, setIsConfirmingTopup] = useState<boolean>(false);
  const [topupSuccessBanner, setTopupSuccessBanner] = useState<string | null>(null);

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
  const fetchPackages = async () => {
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
  };

  useEffect(() => {
    fetchPackages();
  }, [selectedCanteen?.id]);

  const handleSendParentTopupRequest = async () => {
    try {
      setIsSendingParentRequest(true);
      await api.post('/parent/requests', {
        type: 'TOPUP',
        amount: currentAmount,
        note: parentRequestNote.trim() || 'Bố mẹ nạp tiền cơm vào ví giúp con nhé',
      });
      playSuccessBeep();
      setTopupSuccessBanner(`✓ Đã gửi yêu cầu nạp ${formatVND(currentAmount)} tới Phụ huynh thành công!`);
      setParentRequestNote('');
      fetchMyRequests();
      setTimeout(() => setTopupSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi khi gửi yêu cầu tới Phụ huynh');
    } finally {
      setIsSendingParentRequest(false);
    }
  };

  const handleSendParentPackageRequest = async () => {
    if (!subscribingPkg) return;
    try {
      setIsSubscribing(true);
      await api.post('/parent/requests', {
        type: 'PACKAGE',
        amount: Number(subscribingPkg.price),
        packageId: subscribingPkg.id,
        packageName: subscribingPkg.name,
        note: parentRequestNote.trim() || `Bố mẹ mua giúp con ${subscribingPkg.name} nhé`,
      });
      playSuccessBeep();
      setSubSuccessMsg(`✓ Đã gửi yêu cầu mua gói tới Phụ huynh thành công!`);
      setParentRequestNote('');
      fetchMyRequests();
      setTimeout(() => {
        setSubSuccessMsg(null);
        setSubscribingPkg(null);
      }, 2000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi khi gửi yêu cầu tới Phụ huynh');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleConfirmTransfer = async () => {
    try {
      setIsConfirmingTopup(true);
      await api.post('/wallet/topup-confirm', { amount: currentAmount });
      playSuccessBeep();
      await refreshUserData();
      setShowVietQrModal(false);
      setTopupSuccessBanner(`Nạp thành công ${formatVND(currentAmount)} vào ví Canteen!`);
      setTimeout(() => setTopupSuccessBanner(null), 3500);
    } catch (err: any) {
      console.error('Lỗi nạp tiền', err);
      await refreshUserData();
      setShowVietQrModal(false);
    } finally {
      setIsConfirmingTopup(false);
    }
  };

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
      alert(err.response?.data?.message || 'Lỗi khi đăng ký gói ăn');
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

  const transactions = [
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

  return (
    <div className="p-4 space-y-4 pb-28 bg-[#F8FAFC] min-h-screen">
      {/* 1. DIGITAL STUDENT CARD (Clean, uncluttered, focused) */}
      <div className="relative rounded-3xl p-5 text-white overflow-hidden shadow-[0_8px_24px_rgba(0,62,130,0.18)] bg-gradient-to-br from-[#003366] via-[#004e9c] to-[#0057b8]">
        {/* Soft Ambient Background Highlights */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-black/20 blur-xl pointer-events-none" />

        {/* Top Bar: Identity & Pass Status */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white/15 backdrop-blur-xs flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-white/90">
              SMART CANTEEN
            </span>
          </div>

          <span
            className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1 ${
              hasActivePass
                ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
                : 'bg-white/15 text-white/90'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hasActivePass ? 'bg-emerald-400 animate-pulse' : 'bg-white/60'
              }`}
            />
            {hasActivePass ? 'Vé Tháng Đang Dùng' : 'Ví Chuẩn'}
          </span>
        </div>

        {/* Primary Metric: Balance & Meal Credits */}
        <div className="mt-4 mb-4 relative z-10">
          <div className="flex items-center gap-1.5 text-white/75 text-[11px] font-medium">
            <span>Số dư ví</span>
            <button
              type="button"
              onClick={() => setShowBalance(!showBalance)}
              className="text-white/70 hover:text-white cursor-pointer active:scale-95 transition"
              aria-label="Toggle balance visibility"
            >
              {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-baseline justify-between gap-3 mt-0.5">
            <p className="text-3xl font-extrabold tracking-tight font-mono">
              {showBalance ? formatVND(balance) : '••••••••đ'}
            </p>

            {hasActivePass && (
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/20 backdrop-blur-xs text-white px-2.5 py-1 rounded-xl">
                  <Utensils className="w-3 h-3 text-white/90" />
                  <span>Còn {remainingMeals} suất</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card Footer: Student Info & 1-Tap Quick Action */}
        <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs relative z-10">
          <div className="min-w-0 pr-2">
            <p className="font-bold text-white text-xs truncate">
              {user?.fullName || 'Học sinh FPT'}
            </p>
            <p className="text-[10px] text-white/70 font-mono">
              {user?.studentCode || user?.phone || 'HS-FPT'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedAmount(100000);
              setCustomAmount('');
              setShowVietQrModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-white text-[#003E82] font-bold text-xs shadow-xs hover:bg-slate-50 active:scale-95 transition cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <QrCode className="w-3.5 h-3.5 text-[#003E82]" />
            <span>Nạp nhanh</span>
          </button>
        </div>
      </div>

      {/* 2. CANTEEN LOCATION CHIP & POLICY (Subtle & Compact) */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 min-w-0">
          <Store className="w-3.5 h-3.5 text-[#0057b8] shrink-0" />
          <span className="text-[11px] text-slate-400 font-medium shrink-0">Cơ sở:</span>
          {canteens.length > 1 ? (
            <div className="relative inline-flex items-center">
              <select
                value={selectedCanteen?.id || ''}
                onChange={(e) => setSelectedCanteenId(e.target.value)}
                className="appearance-none font-bold text-slate-800 bg-transparent pr-4 text-xs outline-none cursor-pointer truncate max-w-[170px]"
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
          className="text-[11px] font-semibold text-[#0057b8] hover:underline flex items-center gap-0.5 cursor-pointer active:scale-95"
        >
          <Info className="w-3 h-3" />
          <span>Quy định</span>
        </button>
      </div>

      {/* 3. CLEAN SEGMENTED TAB SWITCHER */}
      <div className="bg-slate-200/60 p-1 rounded-2xl flex items-center gap-1">
        <button
          type="button"
          onClick={() => setWalletTab(0)}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 ${
            walletTab === 0
              ? 'bg-white text-[#0057b8] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gói Ăn & Vé Tháng</span>
        </button>

        <button
          type="button"
          onClick={() => setWalletTab(1)}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 ${
            walletTab === 1
              ? 'bg-white text-[#0057b8] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Nạp Tiền Số Dư</span>
        </button>
      </div>

      {/* 4. TAB CONTENTS */}
      {walletTab === 0 ? (
        /* ================= TAB 0: GÓI ĂN & VÉ THÁNG ================= */
        <div className="space-y-3.5">
          {/* Active Pass Status (Clean White Card, not another heavy blue banner!) */}
          {hasActivePass && (
            <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#0057b8] bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wide">
                  Gói Ăn Đang Dùng
                </span>
                <span className="text-xs font-bold font-mono text-slate-800">
                  Còn {remainingMeals} suất {remainingBreakfast > 0 ? `(+${remainingBreakfast} sáng)` : ''}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <h4 className="text-xs font-bold text-slate-900">
                  {wallet?.packageName || 'Vé Tháng Bán Trú Chuẩn'}
                </h4>
                <span className="text-[11px] text-slate-400">
                  Áp dụng: {selectedCanteen?.name || 'Cơ sở hiện tại'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#0057b8] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(12, (remainingMeals / 20) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Package Selection Header */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-900">
              Chọn Gói Ăn Phù Hợp ({branchPackages.length})
            </h3>
            <span className="text-[11px] text-slate-400">Tiết kiệm đến 25%</span>
          </div>

          {/* Streamlined Package Cards */}
          <div className="space-y-2.5">
            {branchPackages.map((pkg) => {
              const totalCredits = pkg.totalCredits || pkg.totalMeals || 60;
              const perMeal = totalCredits > 0 ? Math.round(Number(pkg.price) / totalCredits) : 0;

              return (
                <div
                  key={pkg.id}
                  onClick={() => setViewingPkg(pkg)}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:border-[#0057b8]/60 transition-all cursor-pointer group active:scale-98"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{pkg.name}</h4>
                        {pkg.includesBreakfast && (
                          <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                            Cả 3 ca
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {pkg.subtitle || pkg.description}
                      </p>

                      <div className="flex items-center gap-2 mt-2 text-[10.5px]">
                        <span className="font-bold text-[#0057b8]">~{formatVND(perMeal)}/suất</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500">{totalCredits} suất</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500">Hạn {pkg.durationDays || 30} ngày</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0" onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs font-extrabold text-[#0057b8] font-mono">
                        {formatVND(pkg.price)}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSubscribingPkg(pkg);
                          setSubscribeMethod(balance >= Number(pkg.price) ? 'WALLET' : 'VIETQR');
                        }}
                        className="mt-2 bg-[#0057b8] text-white text-[11px] font-bold px-3 py-1.5 rounded-xl hover:bg-[#004593] shadow-xs active:scale-95 transition cursor-pointer"
                      >
                        Đăng ký
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= TAB 1: NẠP TIỀN SỐ DƯ ================= */
        <div className="space-y-3.5">
          {/* Quick Amount Presets */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
            <span className="text-xs font-bold text-slate-800">Chọn số tiền cần nạp</span>

            <div className="grid grid-cols-2 gap-2">
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
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition cursor-pointer active:scale-95 font-mono ${
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

            {/* Custom Amount */}
            <div className="pt-1">
              <span className="text-[11px] text-slate-500 font-medium">Hoặc nhập số tiền khác:</span>
              <div className="relative mt-1">
                <input
                  type="number"
                  placeholder="Ví dụ: 150000"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0057b8] focus:bg-white transition pr-10 font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  VNĐ
                </span>
              </div>
            </div>
          </div>

          {/* Instant VietQR Card (Clean single-option card without bulky radio lists) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0057b8] flex items-center justify-center border border-blue-100">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Chuyển khoản VietQR tức thì</h4>
                  <p className="text-[10.5px] text-slate-400">Tự động cộng số dư trong 3 giây</p>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-[9.5px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
                Tự động
              </span>
            </div>

            {/* Direct CTA */}
            <button
              type="button"
              onClick={() => setShowVietQrModal(true)}
              className="w-full py-3 rounded-xl bg-[#0057b8] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:bg-[#004593] active:scale-98 transition cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Tạo Mã VietQR • {formatVND(currentAmount)}</span>
            </button>

            <p className="text-center text-[10.5px] text-slate-400">
              Quét qua mọi App ngân hàng (Vietcombank, MB, Techcombank, ...) & MoMo
            </p>
          </div>
        </div>
      )}

      {/* YÊU CẦU NHỜ BỐ MẸ ĐÃ GỬI (NẾU CÓ) */}
      {myRequests.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Yêu Cầu Nhờ Bố Mẹ Đã Gửi</span>
            <span className="text-[11px] text-slate-400 font-medium">{myRequests.length} yêu cầu</span>
          </div>

          <div className="divide-y divide-slate-100">
            {myRequests.slice(0, 3).map((req) => (
              <div key={req.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {req.type === 'PACKAGE' ? `Gói: ${req.packageName || 'Gói cơm'}` : 'Nạp số dư ví Canteen'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {req.note || 'Không có lời nhắn'} • {new Date(req.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold font-mono text-[#0057b8]">{formatVND(req.amount)}</p>
                  <span
                    className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                      req.status === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : req.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {req.status === 'PAID'
                      ? '✓ Bố mẹ đã duyệt'
                      : req.status === 'REJECTED'
                      ? '✕ Đã từ chối'
                      : '⏳ Chờ duyệt'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. LIGHT TRANSACTION FEED (Minimalist & Clean) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-[#0057b8]" />
            <span className="text-xs font-bold text-slate-800">Lịch Sử Giao Dịch Gần Đây</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 cursor-pointer hover:text-slate-600">
            Xem thêm
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {transactions.map((tx) => (
            <div key={tx.id} className="py-2.5 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
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
                  <p className="text-xs font-bold text-slate-800 truncate">{tx.title}</p>
                  <p className="text-[10px] text-slate-400 truncate">{tx.subtitle} • {tx.time}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p
                  className={`text-xs font-bold font-mono ${
                    tx.type === 'topup'
                      ? 'text-emerald-600'
                      : tx.type === 'meal'
                      ? 'text-[#0057b8]'
                      : 'text-slate-900'
                  }`}
                >
                  {tx.type === 'meal'
                    ? '-1 suất'
                    : tx.amount > 0
                    ? `+${formatVND(tx.amount)}`
                    : formatVND(tx.amount)}
                </p>
                <span className="text-[9.5px] text-slate-400">{tx.badge}</span>
              </div>
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
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-end justify-center"
        >
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 space-y-4 animate-in fade-in-0 slide-in-from-bottom overscroll-contain modal-scrollable touch-pan-y">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto" />
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900">Đăng Ký Gói Suất Ăn</h4>
                <p className="text-[11px] text-slate-500">Xác nhận gói ăn và cơ sở áp dụng</p>
              </div>
              <button
                type="button"
                onClick={() => setSubscribingPkg(null)}
                className="text-slate-400 hover:text-black cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Package Summary Box */}
            <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h5 className="text-xs font-bold text-slate-900">{subscribingPkg.name}</h5>
                  <p className="text-[11px] text-[#0057b8] font-semibold mt-0.5 flex items-center gap-1">
                    <Store className="w-3 h-3 shrink-0" />
                    <span>Cơ sở: {subscribingPkg.canteen?.name || selectedCanteen?.name}</span>
                  </p>
                </div>
                <span className="text-sm font-black text-[#0057b8] shrink-0 font-mono">
                  {formatVND(subscribingPkg.price)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Utensils className="w-3.5 h-3.5 text-[#0057b8]" />
                  <span>{subscribingPkg.totalCredits || 60} suất ăn</span>
                </div>
                <div className="flex items-center justify-end gap-1.5 text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-[#0057b8]" />
                  <span>Hạn dùng {subscribingPkg.durationDays || 30} ngày</span>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900">Phương thức thanh toán:</span>

              {/* Wallet Deduct Option */}
              <label
                onClick={() => setSubscribeMethod('WALLET')}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                  subscribeMethod === 'WALLET'
                    ? 'border-[#0057b8] bg-blue-50/50 ring-1 ring-[#0057b8]'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-[#0057b8]" />
                    <span className="text-xs font-bold text-slate-900">Trừ từ Số Dư Ví</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Số dư hiện có: <strong className="font-mono text-slate-800">{formatVND(balance)}</strong>
                    {balance < Number(subscribingPkg.price) && (
                      <span className="text-rose-500 font-bold ml-1">(Chưa đủ số dư)</span>
                    )}
                  </p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    subscribeMethod === 'WALLET' ? 'border-[#0057b8] bg-[#0057b8]' : 'border-slate-300'
                  }`}
                >
                  {subscribeMethod === 'WALLET' && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                </div>
              </label>

              {/* VietQR Option */}
              <label
                onClick={() => setSubscribeMethod('VIETQR')}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                  subscribeMethod === 'VIETQR'
                    ? 'border-[#0057b8] bg-blue-50/50 ring-1 ring-[#0057b8]'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-[#0057b8]" />
                    <span className="text-xs font-bold text-slate-900">Thanh toán qua VietQR</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Quét mã QR để chuyển khoản trực tiếp kích hoạt gói
                  </p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    subscribeMethod === 'VIETQR' ? 'border-[#0057b8] bg-[#0057b8]' : 'border-slate-300'
                  }`}
                >
                  {subscribeMethod === 'VIETQR' && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                </div>
              </label>
            </div>

            {subSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold text-center">
                {subSuccessMsg}
              </div>
            )}

            <button
              type="button"
              disabled={isSubscribing || (subscribeMethod === 'WALLET' && balance < Number(subscribingPkg.price))}
              onClick={handleConfirmSubscribe}
              className="w-full py-3 rounded-2xl bg-[#0057b8] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:bg-[#004593] active:scale-98 transition disabled:opacity-50 cursor-pointer"
            >
              {isSubscribing ? (
                <span>Đang xử lý kích hoạt...</span>
              ) : (
                <span>Xác Nhận Kích Hoạt ({formatVND(subscribingPkg.price)})</span>
              )}
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
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-end justify-center"
        >
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain modal-scrollable touch-pan-y">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto" />
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900">Quét Mã VietQR Nạp Tiền</h4>
                <p className="text-[11px] text-slate-500">Mã nạp tự động cộng số dư tức thì</p>
              </div>
              <button
                type="button"
                onClick={() => setShowVietQrModal(false)}
                className="text-slate-400 hover:text-black cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Image Box */}
            <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200/80 flex flex-col items-center">
              <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200">
                <img
                  src={vietQrUrl}
                  alt="VietQR"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <p className="text-xs font-black text-[#0057b8] mt-3 font-mono">
                Số tiền: {formatVND(currentAmount)}
              </p>
            </div>

            {/* Account Details with Copy Buttons */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-400">Số tài khoản Canteen:</p>
                  <p className="font-mono font-bold text-slate-900">{accountNo}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(accountNo, 'acc')}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-[10px] text-[#0057b8] flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  {copiedKey === 'acc' ? <Check className="w-3 h-3 text-[#0057b8]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'acc' ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-400">Nội dung chuyển khoản (bắt buộc):</p>
                  <p className="font-mono font-bold text-[#0057b8]">{transferContent}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(transferContent, 'content')}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-[10px] text-[#0057b8] flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  {copiedKey === 'content' ? <Check className="w-3 h-3 text-[#0057b8]" /> : <Copy className="w-3 h-3" />}
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
              {isConfirmingTopup ? 'Đang xác nhận giao dịch...' : 'Tôi Đã Hoàn Tất Chuyển Khoản'}
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
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-end justify-center"
        >
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 space-y-3.5 overscroll-contain modal-scrollable touch-pan-y max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-900">Quy Định Gói Ăn Bán Trú</h4>
              <button
                type="button"
                onClick={() => setShowPolicyModal(false)}
                className="text-slate-400 hover:text-black cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
              <p><strong>1. Vé Tháng Bán Trú:</strong> Áp dụng cho các ngày học chính khóa từ Thứ 2 đến Thứ 6 tại cơ sở Canteen đăng ký. Được đổi món hàng ngày theo thực đơn trường.</p>
              <p><strong>2. Phân tách theo cơ sở:</strong> Gói suất ăn mua tại cơ sở nào chỉ được trừ lượt tại quầy của chính cơ sở đó.</p>
              <p><strong>3. Gói Suất Ăn Linh Hoạt:</strong> Hạn dùng 45 ngày kể từ ngày mua. Tự động trừ suất khi quét mã QR tại quầy gắp món.</p>
              <p><strong>4. Bảo lưu suất ăn:</strong> Học sinh có phép nghỉ học hợp lệ được bảo lưu tối đa 3 ngày/tháng sang kỳ sau.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPolicyModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer active:scale-98 transition"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* PACKAGE DETAIL MODAL (PROGRESSIVE DISCLOSURE) */}
      {viewingPkg && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingPkg(null);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-end justify-center p-0 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-250 max-h-[85vh] overflow-y-auto overscroll-contain modal-scrollable touch-pan-y">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto" />
            <div className="flex items-start justify-between">
              <div>
                <span className="bg-blue-50 text-[#0057b8] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {viewingPkg.includesBreakfast ? 'GÓI TOÀN DIỆN CẢ 3 CA' : 'GÓI TIÊU CHUẨN BÁN TRÚ'}
                </span>
                <h4 className="text-base font-black text-slate-900 mt-1">
                  {viewingPkg.name}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-[#0057b8]" />
                  <span>Áp dụng tại: {selectedCanteen?.name || 'Cơ sở hiện tại'}</span>
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

            {/* Price & Summary */}
            <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-medium">Giá trọn gói</p>
                <p className="text-lg font-black text-[#0057b8] font-mono">{formatVND(viewingPkg.price)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-medium">Thời hạn sử dụng</p>
                <p className="text-xs font-bold text-slate-800">
                  {viewingPkg.durationDays || 30} ngày ({viewingPkg.totalCredits || 60} suất)
                </p>
              </div>
            </div>

            {/* Description & Terms */}
            <div className="space-y-2 text-xs">
              <h5 className="font-bold text-slate-800">Quyền lợi & Quy định chi tiết:</h5>
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 space-y-2 leading-relaxed">
                <p>{viewingPkg.description || 'Gói suất ăn bán trú học đường tiện lợi, tự động trừ lượt khi đưa mã QR quét tại quầy canteen.'}</p>
                <p className="text-[#0057b8] font-semibold">• Tặng kèm cơm trắng, cơm gạo lứt & canh nóng tự múc 0đ không giới hạn.</p>
                <p className="text-slate-500">• Suất ăn áp dụng chính xác theo cơ sở đã đăng ký, được bảo lưu theo quy chế nhà trường.</p>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => {
                const pkgToSub = viewingPkg;
                setViewingPkg(null);
                setSubscribingPkg(pkgToSub);
                setSubscribeMethod(balance >= Number(pkgToSub.price) ? 'WALLET' : 'VIETQR');
              }}
              className="w-full py-3 rounded-2xl bg-[#0057b8] text-white font-bold text-xs hover:bg-[#004593] shadow-xs transition cursor-pointer active:scale-98"
            >
              Tiến hành Đăng ký ({formatVND(viewingPkg.price)})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};