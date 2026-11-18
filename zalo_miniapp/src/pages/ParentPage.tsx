import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { TabKey } from '../components/BottomNavigation';
import { FeedbackModal } from '../components/FeedbackModal';
import { DishImage } from '../components/DishImage';
import { useModalScrollLock } from '../hooks/useModalScrollLock';
import {
  UsersIcon as Users,
  CreditCardIcon as CreditCard,
  ChatCircleDotsIcon as MessageSquareHeart,
  ForkKnifeIcon as Utensils,
  PlusCircleIcon as PlusCircle,
  XIcon as X,
  CheckCircleIcon as CheckCircle2,
  CopyIcon as Copy,
  CheckIcon as Check,
  CaretRightIcon as ChevronRight,
  QrCodeIcon as QrCode,
  InfoIcon as Info,
} from '@phosphor-icons/react';

interface ParentPageProps {
  activeSubTab?: TabKey;
  onNavigateTab: (tab: TabKey) => void;
}

export const ParentPage: React.FC<ParentPageProps> = ({ activeSubTab = 'children', onNavigateTab: _onNavigateTab }) => {
  const {
    refreshChildren,
    childrenList,
    selectedChild,
    setSelectedChild,
    linkChild,
    topupChild,
    selectedCanteen,
    selectedMealType,
    setSelectedMealType,
    showAlert,
    showConfirm,
  } = useApp();

  // Modals state
  const [mountNow] = useState(() => Date.now());
  const [todayDisplayStr] = useState(() => new Date().toLocaleDateString('vi-VN'));
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<any | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [payingRequest, setPayingRequest] = useState<any | null>(null);
  const [isProcessingRequest, setIsProcessingRequest] = useState<boolean>(false);
  const [requestPaySuccessMsg, setRequestPaySuccessMsg] = useState<string | null>(null);

  const fetchParentRequests = useCallback(async () => {
    try {
      const res = await api.get('/parent/requests');
      if (Array.isArray(res.data)) {
        setPendingRequests(res.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchParentRequests();
    const interval = setInterval(fetchParentRequests, 3500);
    return () => clearInterval(interval);
  }, [fetchParentRequests]);

  const handleConfirmPayRequest = async (reqToPay: any) => {
    try {
      setIsProcessingRequest(true);
      const res = await api.post(`/parent/requests/${reqToPay.id}/pay`);
      playServedChime();
      setRequestPaySuccessMsg(res.data?.message || 'Đã duyệt thanh toán thành công cho con!');
      await refreshChildren();
      await fetchParentRequests();
      setTimeout(() => {
        setRequestPaySuccessMsg(null);
        setPayingRequest(null);
      }, 1800);
    } catch (err: any) {
      void showAlert(err.response?.data?.message || 'Lỗi khi thanh toán yêu cầu', 'Lỗi');
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const handleRejectRequest = async (reqToReject: any) => {
    const confirmed = await showConfirm({
      title: 'Từ chối yêu cầu',
      message: `Bạn có chắc chắn muốn từ chối yêu cầu của bé ${reqToReject.student?.fullName || ''}?`,
      confirmText: 'Từ chối',
      cancelText: 'Hủy',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.post(`/parent/requests/${reqToReject.id}/reject`);
      await fetchParentRequests();
    } catch (err: any) {
      void showAlert(err.response?.data?.message || 'Lỗi khi từ chối yêu cầu', 'Lỗi');
    }
  };

  useModalScrollLock(showLinkModal || showTopupModal || showFeedbackModal || !!selectedOrderForDetail || !!payingRequest);

  // Link child form state
  const [inputStudentCode, setInputStudentCode] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkMsg, setLinkMsg] = useState<{ text: string; success: boolean } | null>(null);

  // Topup modal state
  const [topupAmount, setTopupAmount] = useState<number>(100000);
  const [customTopupAmount, setCustomTopupAmount] = useState<string>('');
  const [topupStep, setTopupStep] = useState<'SELECT_AMOUNT' | 'SHOW_QR'>('SELECT_AMOUNT');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [topupSuccessMsg, setTopupSuccessMsg] = useState<string | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);

  // Menu & packages state
  const [todayMenuDishes, setTodayMenuDishes] = useState<any[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [canteenPackages, setCanteenPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Real-time Meal chime tracking
  const prevServedRef = useRef<Record<string, boolean>>({});

  // Audio chime for real-time meal served notification
  const playServedChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio playback silently ignored if autoplay policy restricts
    }
  }, []);

  // Polling: Auto-refresh children data every 3.5s so parent gets immediate notification when meal is dished
  useEffect(() => {
    refreshChildren();
    const interval = setInterval(() => {
      refreshChildren().catch((e) => console.warn('Lỗi tự động cập nhật:', e));
    }, 3500);
    return () => clearInterval(interval);
  }, [refreshChildren]);

  // Trigger audio chime on transition to served
  useEffect(() => {
    childrenList.forEach((child) => {
      const isServedNow = child.todayOrders?.some(
        (o: any) => o.status === 'SERVED' || o.status === 'COMPLETED'
      );
      const wasServed = prevServedRef.current[child.studentId];
      if (isServedNow && wasServed === false) {
        playServedChime();
      }
      prevServedRef.current[child.studentId] = !!isServedNow;
    });
  }, [childrenList, playServedChime]);

  // Sub-tab selection (syncs with activeSubTab prop)
  const currentView = activeSubTab === 'parent_menu' ? 'menu' : activeSubTab === 'parent_wallet' ? 'wallet' : 'children';

  // Load school menu for parent_menu view
  useEffect(() => {
    const fetchMenu = async () => {
      const canteenId = selectedCanteen?.id;
      if (!canteenId) return;
      try {
        setLoadingMenu(true);
        const res = await api.get('/menu/today', {
          params: { canteenId, mealType: selectedMealType },
        });
        if (Array.isArray(res.data)) {
          const mealMenu = res.data.find((m: any) => m.mealType === selectedMealType) || res.data[0];
          setTodayMenuDishes(mealMenu?.items?.map((item: any) => item.dish || item) || []);
        } else {
          setTodayMenuDishes([]);
        }
      } catch (err) {
        console.warn('Lỗi tải thực đơn con:', err);
        // Fallback demo nutrition dishes
        setTodayMenuDishes([
          {
            id: 'd-01',
            name: 'Cơm sườn nướng mật ong sốt BBQ',
            category: 'MAIN',
            description: 'Sườn heo nạc mềm ướp sốt mật ong thơm lừng, cung cấp 28g đạm chuẩn.',
          },
          {
            id: 'd-02',
            name: 'Cá hồi Na Uy sốt chanh leo',
            category: 'MAIN',
            description: 'Giàu Omega-3 và vitamin D giúp học sinh tập trung học tập.',
          },
          {
            id: 'd-03',
            name: 'Canh cải thìa nấu tôm tươi',
            category: 'SOUP',
            description: 'Vị ngọt thanh từ tôm tươi băm nhỏ, thanh nhiệt cơ thể.',
          },
          {
            id: 'd-04',
            name: 'Đậu que xào thịt bò xắt hạt lựu',
            category: 'SIDE',
            description: 'Bổ sung chất xơ hòa tan và sắt từ thịt bò tươi.',
          },
        ]);
      } finally {
        setLoadingMenu(false);
      }
    };

    fetchMenu();
  }, [selectedCanteen?.id, selectedMealType]);

  // Load canteen meal packages so parents know exact package prices when topping up
  useEffect(() => {
    const fetchPackages = async () => {
      const fallbackPackages = [
        {
          id: 'pkg-default-1',
          name: 'Gói Tiêu Chuẩn 60 Suất',
          price: 1680000,
          totalCredits: 60,
          durationDays: 30,
          includesBreakfast: false,
        },
        {
          id: 'pkg-default-2',
          name: 'Gói Toàn Diện 90 Suất',
          price: 2280000,
          totalCredits: 90,
          durationDays: 30,
          includesBreakfast: true,
        },
        {
          id: 'pkg-default-3',
          name: 'Gói 20 Suất Linh Hoạt',
          price: 600000,
          totalCredits: 20,
          durationDays: 45,
          includesBreakfast: false,
        },
      ];
      try {
        setLoadingPackages(true);
        const params: Record<string, string> = {};
        if (selectedCanteen?.id && selectedCanteen.id !== 'ALL') {
          params.canteenId = selectedCanteen.id;
        }
        const res = await api.get('/packages', { params });
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCanteenPackages(res.data);
        } else {
          setCanteenPackages(fallbackPackages);
        }
      } catch (err) {
        console.warn('Lỗi tải gói ăn cơ sở:', err);
        setCanteenPackages(fallbackPackages);
      } finally {
        setLoadingPackages(false);
      }
    };

    fetchPackages();
  }, [selectedCanteen?.id]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleLinkChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputStudentCode.trim()) return;
    setLinkLoading(true);
    setLinkMsg(null);
    const res = await linkChild(inputStudentCode);
    setLinkLoading(false);
    setLinkMsg({ text: res.message, success: res.success });
    if (res.success) {
      setInputStudentCode('');
      setTimeout(() => {
        setLinkMsg(null);
        setShowLinkModal(false);
      }, 1500);
    }
  };

  const openTopupModal = (presetAmount?: number) => {
    setTopupStep('SELECT_AMOUNT');
    setCustomTopupAmount(typeof presetAmount === 'number' && presetAmount > 0 ? String(presetAmount) : '');
    setShowTopupModal(true);
  };

  const effectiveTopupAmount = customTopupAmount ? Math.max(10000, Number(customTopupAmount) || topupAmount) : topupAmount;

  const handleQuickTopupConfirm = async () => {
    const targetChild = selectedChild || childrenList[0];
    if (!targetChild) return;
    setTopupLoading(true);
    const res = await topupChild(targetChild.studentId, effectiveTopupAmount);
    setTopupLoading(false);
    setTopupSuccessMsg(res.message);
    setTimeout(() => {
      setTopupSuccessMsg(null);
      setShowTopupModal(false);
      setTopupStep('SELECT_AMOUNT');
    }, 1500);
  };

  const activeChild = selectedChild || childrenList[0];

  // VietQR config
  const bankBin = selectedCanteen?.bankBin || '970422';
  const bankAccount = selectedCanteen?.bankAccountNumber || '987654321';
  const transferContent = `NAPVI ${activeChild?.linkCode || activeChild?.studentId || 'HS01'}`;
  const vietQrUrl = `https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact.png?amount=${effectiveTopupAmount}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(selectedCanteen?.bankAccountName || selectedCanteen?.name || 'CANTEEN FPT')}`;

  return (
<div className="p-3.5 sm:p-5 space-y-3.5 pb-28 bg-[#F7FAFE] min-h-screen">
      
      {currentView === 'children' && (
        <>
          {/* PENDING PAYMENT REQUESTS */}
          {pendingRequests.filter((r) => r.status === 'PENDING').length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <h4 className="text-xs font-bold text-slate-800">Yêu cầu chờ duyệt</h4>
                </div>
                <span className="text-[11px] font-bold text-[#0057b8] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
                  {pendingRequests.filter((r) => r.status === 'PENDING').length}
                </span>
              </div>

              <div className="space-y-2.5">
                {pendingRequests
                  .filter((r) => r.status === 'PENDING')
                  .map((req) => {
                    const studentName = req.student?.fullName || 'Con em';
                    return (
                      <div
                        key={req.id}
                        className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#0057b8] ring-1 ring-[#0057b8]/10 flex items-center justify-center font-bold text-xs shrink-0">
                              {studentName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-slate-900 truncate">{studentName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md truncate max-w-[140px]">
                                  {req.type === 'PACKAGE' ? req.packageName || 'Gói bán trú' : 'Nạp ví'}
                                </span>
                                <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                                  {new Date(req.createdAt).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <span className="text-sm font-extrabold text-[#0057b8] tabular-nums tracking-tight shrink-0">
                            {Number(req.amount).toLocaleString('vi-VN')}đ
                          </span>
                        </div>

                        {req.note && (
                          <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs text-slate-600 leading-relaxed">
                            “{req.note}”
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(req)}
                            className="h-9 px-3.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-[0.98]"
                          >
                            Từ chối
                          </button>
                          <button
                            type="button"
                            onClick={() => setPayingRequest(req)}
                            className="flex-1 h-9 px-4 bg-[#0057b8] hover:bg-[#004593] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs active:scale-[0.98]"
                          >
                            Duyệt & Thanh toán
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* CHILD SWITCHER BAR */}
          {childrenList.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0">
                {childrenList.map((child) => {
                  const isSelected = activeChild?.studentId === child.studentId;
                  const isServed = child.todayOrders?.some(
                    (o: any) => o.status === 'SERVED' || o.status === 'COMPLETED'
                  );
                  const isPreparing = child.todayOrders?.some(
                    (o: any) => o.status === 'PREPARING' || o.status === 'CONFIRMED' || o.status === 'PENDING'
                  );

                  return (
                    <button
                      key={child.studentId}
                      type="button"
                      onClick={() => setSelectedChild(child)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-[#0057b8] text-white border-[#0057b8] shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isServed ? 'bg-emerald-400' : isPreparing ? 'bg-amber-400' : isSelected ? 'bg-white/60' : 'bg-slate-300'
                        }`}
                      />
                      <span className="truncate max-w-[120px]">{child.fullName}</span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-[#0057b8] bg-white border border-slate-200 hover:bg-[#EFF6FF] transition shrink-0 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>
          )}

          {/* EMPTY STATE WHEN NO LINKED CHILD */}
          {!activeChild ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center space-y-2.5 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center mx-auto">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Chưa liên kết con em</h4>
              <p className="text-xs text-slate-500">
                Nhập mã học sinh để theo dõi bữa ăn và nạp ví.
              </p>
              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="py-2 px-4 bg-[#0057b8] hover:bg-[#003E82] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Liên kết ngay
              </button>
            </div>
          ) : (
            <>
              {/* ACTIVE CHILD SUMMARY CARD */}
              <div className="bg-gradient-to-br from-[#003E82] to-[#0057b8] text-white rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {activeChild.avatar ? (
                      <img
                        src={activeChild.avatar}
                        alt={activeChild.fullName}
                        className="w-11 h-11 rounded-xl object-cover border border-white/25 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-white/15 text-white flex items-center justify-center font-bold text-base border border-white/20 shrink-0">
                        {activeChild.fullName.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-sm truncate">{activeChild.fullName}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-white/80">
                        <span className="font-mono font-semibold">{activeChild.linkCode || activeChild.studentId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeChild.linkCode || activeChild.studentId)}
                          className="text-white/75 hover:text-white cursor-pointer"
                          title="Sao chép mã học sinh"
                        >
                          {copiedText === (activeChild.linkCode || activeChild.studentId) ? (
                            <Check className="w-3 h-3 text-emerald-300" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <span className="text-white/40">•</span>
                        <span className="truncate">{activeChild.canteenName || selectedCanteen?.name || 'THPT FPT Quy Nhơn'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openTopupModal()}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-[#003E82] rounded-xl text-[11px] font-bold transition shrink-0 cursor-pointer"
                  >
                    Nạp ví
                  </button>
                </div>

                <div className="grid grid-cols-2 divide-x divide-white/15 bg-white/10 rounded-xl py-2.5">
                  <div className="px-3">
                    <span className="text-[11px] text-white/75 block">Số dư ví</span>
                    <p className="text-base font-bold text-white font-mono mt-0.5">
                      {Number(activeChild.balance || 0).toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                  <div className="px-3">
                    <span className="text-[11px] text-white/75 block">Suất ăn tháng</span>
                    <p className="text-base font-bold text-white font-mono mt-0.5">
                      {activeChild.totalRemainingCredits ?? 28} suất
                    </p>
                  </div>
                </div>
              </div>

              {/* TODAY'S MEAL STATUS */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">Bữa ăn hôm nay</h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {todayDisplayStr}
                  </span>
                </div>

                {activeChild.todayOrders && activeChild.todayOrders.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {activeChild.todayOrders.map((order, idx) => {
                      const isServed = order.status === 'SERVED' || order.status === 'COMPLETED';
                      const dishCount = order.items?.length || 3;

                      return (
                        <button
                          key={order.id || idx}
                          type="button"
                          onClick={() => setSelectedOrderForDetail(order)}
                          className="w-full py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-left hover:bg-slate-50/70 rounded-lg transition cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900">
                              {order.mealType === 'BREAKFAST'
                                ? 'Bữa Sáng'
                                : order.mealType === 'DINNER'
                                ? 'Bữa Tối'
                                : 'Bữa Trưa'}{' '}
                              <span className="text-[11px] text-slate-400 font-normal">
                                • {dishCount} món •{' '}
                                {new Date(order.createdAt || mountNow).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isServed
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {isServed
                                ? `Đã nhận${
                                    order.checkins?.[0]?.checkinTime
                                      ? ` ${new Date(order.checkins[0].checkinTime).toLocaleTimeString('vi-VN', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}`
                                      : ''
                                  }`
                                : 'Đang chuẩn bị'}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-slate-400">
                    Con chưa nhận bữa nào hôm nay
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* VIEW 2: PARENT NUTRITION MENU */}
      {currentView === 'menu' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs space-y-2.5">
            <h3 className="text-sm font-bold text-slate-900">Thực đơn hôm nay</h3>

            {/* Meal Shift Filter */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              {(['BREAKFAST', 'LUNCH', 'DINNER'] as const).map((meal) => (
                <button
                  key={meal}
                  onClick={() => setSelectedMealType(meal)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    selectedMealType === meal
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {meal === 'BREAKFAST' ? 'Bữa Sáng' : meal === 'LUNCH' ? 'Bữa Trưa' : 'Bữa Tối'}
                </button>
              ))}
            </div>
          </div>

          {/* Dishes List */}
          <div className="space-y-2.5">
            {loadingMenu ? (
              <div className="py-10 text-center text-xs text-slate-400">Đang tải thực đơn hôm nay...</div>
            ) : todayMenuDishes.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200/80 p-6">
                Chưa có dữ liệu thực đơn cho ca ăn này
              </div>
            ) : (
              todayMenuDishes.map((dish) => {
                return (
                  <div
                    key={dish.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex items-center gap-3"
                  >
                    <DishImage
                      src={dish.image}
                      alt={dish.name}
                      className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 border border-slate-200/80"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{dish.name}</h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                          {dish.category === 'MAIN' || dish.category === 'SIDE' ? 'Món mặn' : dish.category === 'SOUP' ? 'Canh' : 'Món ăn'}
                        </span>
                      </div>
                      {dish.description && (
                        <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">
                          {dish.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* PAYING REQUEST MODAL (VIETQR - Centered & Tối giản) */}
      {payingRequest && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessingRequest) setPayingRequest(null);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl p-4 sm:p-5 space-y-3.5 max-h-[85vh] overflow-y-auto overscroll-contain modal-scrollable touch-pan-y shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">Thanh toán yêu cầu</h4>
                <p className="text-[11px] text-slate-500 truncate">
                  {payingRequest.student?.fullName} • {payingRequest.type === 'PACKAGE' ? payingRequest.packageName : 'Nạp ví'}
                </p>
              </div>
              <button
                type="button"
                disabled={isProcessingRequest}
                onClick={() => setPayingRequest(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col items-center">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                <img
                  src={`https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact.png?amount=${payingRequest.amount}&addInfo=${encodeURIComponent(
                    `DUYET ${payingRequest.student?.fullName || 'CON'}`
                  )}&accountName=${encodeURIComponent(selectedCanteen?.bankAccountName || selectedCanteen?.name || 'CANTEEN FPT')}`}
                  alt="VietQR"
                  className="w-44 h-44 object-contain"
                />
              </div>
              <p className="text-base font-black text-[#0057b8] font-mono tabular-nums mt-2.5">
                {Number(payingRequest.amount).toLocaleString('vi-VN')} đ
              </p>
            </div>

            {requestPaySuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold text-center">
                {requestPaySuccessMsg}
              </div>
            )}

            <button
              type="button"
              disabled={isProcessingRequest}
              onClick={() => handleConfirmPayRequest(payingRequest)}
              className="w-full py-2.5 rounded-xl bg-[#0057b8] text-white font-bold text-xs cursor-pointer hover:bg-[#004593] disabled:opacity-50 transition flex items-center justify-center gap-1.5"
            >
              <span>{isProcessingRequest ? 'Đang xác nhận...' : 'Tôi đã chuyển khoản'}</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 3: PARENT WALLET & VIETQR TOPUP (Tối giản) */}
      {currentView === 'wallet' && !activeChild && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center space-y-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center mx-auto">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">Chưa có học sinh liên kết</h4>
            <p className="text-xs text-slate-500">Liên kết tài khoản con em để nạp tiền vào ví.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowLinkModal(true)}
            className="py-2.5 px-4 bg-[#0057b8] hover:bg-[#003E82] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Liên kết học sinh</span>
          </button>
        </div>
      )}

      {currentView === 'wallet' && activeChild && (
        <div className="space-y-3">
          {childrenList.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {childrenList.map((child) => {
                const isSelected = child.studentId === activeChild.studentId;
                return (
                  <button
                    key={child.studentId}
                    type="button"
                    onClick={() => setSelectedChild(child)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-[#0057b8] text-white border-[#0057b8] shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    {child.fullName}
                  </button>
                );
              })}
            </div>
          )}

          <div className="bg-gradient-to-br from-[#003E82] via-[#004e9c] to-[#0057b8] text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[11px] text-white/75 font-medium block">Ví Canteen</span>
                <h3 className="text-base font-bold text-white truncate">{activeChild.fullName}</h3>
              </div>
              <span className="text-[11px] font-bold text-white bg-white/15 px-2.5 py-0.5 rounded-full font-mono shrink-0">
                {activeChild.linkCode || activeChild.studentId}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-white/75 block">Số dư hiện tại</span>
              <p className="text-2xl font-black text-white font-mono tabular-nums tracking-tight mt-0.5">
                {Number(activeChild.balance || 0).toLocaleString('vi-VN')} đ
              </p>
            </div>

            <button
              type="button"
              onClick={() => openTopupModal()}
              className="w-full py-2.5 bg-white hover:bg-slate-50 text-[#003E82] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <QrCode className="w-4 h-4 text-[#0057b8]" />
              <span>Nạp tiền qua VietQR</span>
            </button>
          </div>

          {/* CANTEEN MEAL PACKAGES REFERENCE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900">Gói ăn Canteen</h4>
              <span className="text-[11px] text-slate-400">Tham khảo mức nạp</span>
            </div>

            {loadingPackages ? (
              <div className="space-y-2 py-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-11 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {canteenPackages.map((pkg) => (
                  <div key={pkg.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{pkg.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {pkg.totalCredits || 0} suất • {pkg.durationDays || 30} ngày
                        {pkg.includesBreakfast ? ' • Sáng, Trưa, Tối' : ' • Trưa & Tối'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-[#0057b8] font-mono tabular-nums">
                        {Number(pkg.price || 0).toLocaleString('vi-VN')} đ
                      </span>
                      <button
                        type="button"
                        onClick={() => openTopupModal(Number(pkg.price))}
                        className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] hover:bg-blue-100 text-[#0057b8] text-[11px] font-bold transition cursor-pointer active:scale-95"
                      >
                        Nạp
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: LINK NEW CHILD */}
      {showLinkModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLinkModal(false);
          }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 space-y-4 relative shadow-2xl overscroll-contain modal-scrollable touch-pan-y max-h-[90vh] overflow-y-auto border border-slate-100">
            <button
              onClick={() => setShowLinkModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Liên Kết Tài Khoản Con Em</h3>
              <p className="text-[11px] text-slate-500">
                Nhập mã học sinh <code className="font-mono text-[#0057b8] bg-blue-50 px-1 py-0.5 rounded">HS-XXXXXX</code> hoặc số điện thoại của con
              </p>
            </div>

            <form onSubmit={handleLinkChildSubmit} className="space-y-3.5">
              <div>
                <input
                  type="text"
                  placeholder="Ví dụ: HS-2026-0098"
                  value={inputStudentCode}
                  onChange={(e) => setInputStudentCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0057b8] focus:ring-1 focus:ring-[#0057b8] uppercase transition font-mono"
                />
              </div>

              {linkMsg && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 ${
                    linkMsg.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {linkMsg.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Info className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span>{linkMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={linkLoading || !inputStudentCode.trim()}
                className="w-full py-2.5 bg-[#0057b8] hover:bg-[#003E82] text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-xs active:scale-[0.98]"
              >
                {linkLoading ? 'Đang xác thực...' : 'Liên kết ngay'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: 2-STEP VIETQR TOPUP (Tối giản) */}
      {showTopupModal && activeChild && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTopupModal(false);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-2xl p-4 sm:p-5 space-y-3.5 relative shadow-2xl overscroll-contain modal-scrollable touch-pan-y max-h-[85vh] overflow-y-auto border border-slate-100 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {topupStep === 'SELECT_AMOUNT' ? 'Nạp tiền vào ví' : 'Quét mã VietQR'}
                </h3>
                <p className="text-[11px] text-slate-500 truncate">
                  {activeChild.fullName} ({activeChild.linkCode || activeChild.studentId})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTopupModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
                aria-label="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {topupStep === 'SELECT_AMOUNT' ? (
              <div className="space-y-3.5">
                <div className="px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Số dư hiện tại</span>
                  <span className="font-bold font-mono text-slate-900 tabular-nums">
                    {Number(activeChild.balance || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[50000, 100000, 200000, 500000].map((amt) => {
                    const isSelected = !customTopupAmount && topupAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setTopupAmount(amt);
                          setCustomTopupAmount('');
                        }}
                        className={`py-2 px-1 rounded-xl text-xs font-bold font-mono border transition cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'border-[#0057b8] bg-[#0057b8] text-white shadow-2xs'
                            : 'border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        {(amt / 1000).toLocaleString('vi-VN')}k
                      </button>
                    );
                  })}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="10000"
                    min="10000"
                    value={customTopupAmount}
                    onChange={(e) => setCustomTopupAmount(e.target.value)}
                    placeholder="Hoặc nhập số tiền khác..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal focus:border-[#0057b8] focus:bg-white outline-hidden pr-8 transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    đ
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setTopupStep('SHOW_QR')}
                  className="w-full py-2.5 bg-[#0057b8] hover:bg-[#003E82] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  Tạo mã VietQR ({effectiveTopupAmount.toLocaleString('vi-VN')} đ)
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-center space-y-2.5">
                  <img
                    src={vietQrUrl}
                    alt="VietQR"
                    className="w-44 h-44 mx-auto object-contain rounded-xl bg-white p-2 border border-slate-200/80"
                  />
                  <div className="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100 text-xs text-left">
                    <div className="px-3 py-2 flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Số tiền</span>
                      <span className="font-bold font-mono text-[#0057b8] tabular-nums">
                        {effectiveTopupAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="px-3 py-2 flex items-center justify-between gap-2">
                      <span className="text-slate-500 text-[11px] shrink-0">Nội dung CK</span>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-mono font-bold text-slate-900 truncate">{transferContent}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(transferContent)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 transition cursor-pointer shrink-0"
                          title="Sao chép"
                        >
                          {copiedText === transferContent ? (
                            <Check className="w-3.5 h-3.5 text-[#0057b8]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {topupSuccessMsg && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{topupSuccessMsg}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTopupStep('SELECT_AMOUNT')}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Đổi mức
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickTopupConfirm}
                    disabled={topupLoading}
                    className="flex-2 py-2.5 bg-[#0057b8] hover:bg-[#003E82] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {topupLoading ? 'Đang xử lý...' : 'Đã chuyển khoản'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORDER DETAIL MODAL (Centered) */}
      {selectedOrderForDetail && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedOrderForDetail(null);
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col overscroll-contain modal-scrollable touch-pan-y border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Chi Tiết Bữa Ăn Của Con</h3>
                <p className="text-[11px] text-slate-500">
                  {selectedOrderForDetail.mealType === 'BREAKFAST'
                    ? 'Bữa Sáng'
                    : selectedOrderForDetail.mealType === 'DINNER'
                    ? 'Bữa Tối'
                    : 'Bữa Trưa'}{' '}
                  • {new Date(selectedOrderForDetail.createdAt || mountNow).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {todayDisplayStr}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {/* Status summary */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#0057b8] shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {selectedOrderForDetail.status === 'SERVED' || selectedOrderForDetail.status === 'COMPLETED'
                      ? 'Con đã nhận khay cơm tại quầy tiếp thực'
                      : 'Đơn đang chuẩn bị khay cơm nóng'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Quầy Line 2 (Check-in QR tự động) • Bếp Canteen trường
                  </p>
                </div>
              </div>

              {/* Dish Items */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-[#0057b8]" />
                  <span>Món ăn trong khay cơm</span>
                </h4>
                <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
                  {selectedOrderForDetail.items && selectedOrderForDetail.items.length > 0 ? (
                    selectedOrderForDetail.items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-200/60 last:border-0 text-xs">
                        <span className="font-semibold text-slate-800 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0057b8]" />
                          {item.dish?.name || item.name || 'Suất cơm tiêu chuẩn'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">1 phần</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic">Khay cơm suất ăn chuẩn (Cơm, Món mặn, Canh, Rau xào)</div>
                  )}
                </div>
              </div>

              {/* Complimentary Refill Note */}
              <div className="p-3.5 bg-slate-100/70 rounded-2xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Quyền lợi kèm theo suất ăn:</p>
                <p>• Cơm dẻo / Cơm lứt tiếp thêm không giới hạn 0đ.</p>
                <p>• Canh rau củ hầm xương nóng sốt tự chọn 0đ tại quầy.</p>
              </div>

              {/* Payment details */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">Hình thức thanh toán:</span>
                <span className="font-bold text-slate-800">Gói suất ăn tháng bán trú (Trừ 1 suất)</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white shrink-0 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedOrderForDetail(null);
                  setShowFeedbackModal(true);
                }}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-[#EFF6FF] hover:bg-blue-100/70 text-[#0057b8] border border-[#0057b8]/20 transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <MessageSquareHeart className="w-4 h-4" />
                <span>Gửi nhận xét / Yêu cầu về bữa ăn này</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrderForDetail(null)}
                className="w-full py-2 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL FOR PARENT */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        order={selectedOrderForDetail || activeChild?.todayOrders?.[0]}
      />
    </div>
  );
};
