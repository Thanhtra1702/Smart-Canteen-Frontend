import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp, type ChildItem } from '../context/AppContext';
import { api } from '../services/api';
import type { TabKey } from '../components/BottomNavigation';
import { DishDetailModal } from '../components/DishDetailModal';
import { FeedbackModal } from '../components/FeedbackModal';
import { useModalScrollLock } from '../hooks/useModalScrollLock';
import {
  Users,
  CreditCard,
  Bell,
  MessageSquareHeart,
  Send,
  Star,
  Utensils,
  PlusCircle,
  X,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Calendar,
  Building2,
  Clock,
  Heart,
  QrCode,
  ArrowLeft,
  Info,
  Lock,
  ShieldCheck,
} from 'lucide-react';

interface ParentPageProps {
  activeSubTab?: TabKey;
  onNavigateTab: (tab: TabKey) => void;
}

export const ParentPage: React.FC<ParentPageProps> = ({ activeSubTab = 'children', onNavigateTab }) => {
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
  } = useApp();

  // Modals state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedDishForDetail, setSelectedDishForDetail] = useState<any | null>(null);
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
    } catch (e) {
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
      alert(err.response?.data?.message || 'Lỗi khi thanh toán yêu cầu');
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const handleRejectRequest = async (reqToReject: any) => {
    if (!window.confirm(`Bạn có chắc chắn muốn từ chối yêu cầu của bé ${reqToReject.student?.fullName || ''}?`)) return;
    try {
      await api.post(`/parent/requests/${reqToReject.id}/reject`);
      await fetchParentRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi từ chối yêu cầu');
    }
  };

  useModalScrollLock(showLinkModal || showTopupModal || showFeedbackModal || !!selectedDishForDetail || !!selectedOrderForDetail);

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

  // Menu state for parent_menu
  const [todayMenuDishes, setTodayMenuDishes] = useState<any[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);

  // Real-time Meal Notification Alert state
  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, boolean>>({});
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
    } catch (e) {
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

  const openTopupModal = () => {
    setTopupStep('SELECT_AMOUNT');
    setCustomTopupAmount('');
    setShowTopupModal(true);
  };

  const effectiveTopupAmount = customTopupAmount ? Math.max(10000, Number(customTopupAmount) || topupAmount) : topupAmount;

  const handleQuickTopupConfirm = async () => {
    if (!selectedChild) return;
    setTopupLoading(true);
    const res = await topupChild(selectedChild.studentId, effectiveTopupAmount);
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
<div className="p-4 space-y-4 pb-28 bg-[#F7FAFE] min-h-screen">
      
      {/* PENDING PAYMENT REQUESTS FROM CON */}
      {pendingRequests.filter((r) => r.status === 'PENDING').length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-400 rounded-3xl p-4 shadow-md space-y-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between border-b border-amber-200/70 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs animate-bounce">
                🔔
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                  Yêu cầu thanh toán từ con ({pendingRequests.filter((r) => r.status === 'PENDING').length})
                </h4>
                <p className="text-[11px] text-amber-800 font-medium">
                  Bé vừa gửi yêu cầu duyệt nạp tiền / mua suất ăn
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {pendingRequests
              .filter((r) => r.status === 'PENDING')
              .map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl p-3.5 border border-amber-200/80 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                        {req.type === 'PACKAGE' ? 'MUA GÓI BÁN TRÚ' : 'NẠP SỐ DƯ VÍ'}
                      </span>
                      <h5 className="text-xs font-bold text-slate-900 mt-1">
                        Bé: <span className="text-[#0057b8]">{req.student?.fullName || 'Con em'}</span>
                      </h5>
                      <p className="text-xs font-black text-[#0057b8] mt-0.5">
                        Số tiền: {Number(req.amount).toLocaleString('vi-VN')} đ
                        {req.type === 'PACKAGE' && req.packageName ? ` (${req.packageName})` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(req.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {req.note && (
                    <div className="p-2 bg-amber-50/70 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 italic">
                      "{req.note}"
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPayingRequest(req)}
                      className="flex-1 py-2 px-3 bg-[#0057b8] hover:bg-[#004593] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Duyệt & Thanh Toán</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectRequest(req)}
                      className="py-2 px-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* REAL-TIME MEAL SERVED NOTIFICATION BANNER */}

      {/* 1. REAL-TIME MEAL SERVED NOTIFICATION BANNER (CLEAN & AIRY) */}
      {activeChild?.latestMealAlert && !dismissedAlerts[activeChild.latestMealAlert.orderId] && (
        <div className="bg-emerald-50/95 border border-emerald-200/90 rounded-3xl p-4.5 shadow-2xs space-y-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="relative mt-0.5 shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    Bữa ăn hoàn tất
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-800">
                    {activeChild.latestMealAlert.servedTime || 'Vừa nhận khay'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                  Bé {activeChild.fullName} đã nhận suất ăn tại Canteen!
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {activeChild.latestMealAlert.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setDismissedAlerts((prev) => ({
                  ...prev,
                  [activeChild.latestMealAlert!.orderId]: true,
                }))
              }
              className="w-7 h-7 rounded-full bg-emerald-100/80 hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition shrink-0 cursor-pointer"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {activeChild.todayOrders && activeChild.todayOrders[0] && (
            <div className="pt-2.5 border-t border-emerald-200/60 flex items-center justify-between text-xs gap-2">
              <span className="text-slate-600 text-[11px] truncate flex items-center gap-1.5 min-w-0">
                <Utensils className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Khay cơm: {activeChild.latestMealAlert.itemsSummary}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedOrderForDetail(activeChild.todayOrders![0])}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shadow-2xs transition cursor-pointer flex items-center gap-1 shrink-0 active:scale-95"
              >
                Chi tiết khay <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. TOP CHILD SELECTOR CARDS (AIRY HORIZONTAL RAIL) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">Hồ sơ con em ({childrenList.length})</h3>
          </div>
          <button
            onClick={() => setShowLinkModal(true)}
            className="text-[11px] font-bold text-[#0057b8] hover:text-[#003E82] bg-[#EFF6FF] hover:bg-blue-100/70 border border-[#0057b8]/20 px-3 py-1 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Thêm con</span>
          </button>
        </div>

        {childrenList.length === 0 ? (
          <div className="p-6 bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl text-center space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white text-slate-400 flex items-center justify-center mx-auto border border-slate-200/80">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Chưa có tài khoản con em nào được liên kết</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Nhập mã học sinh của con để theo dõi bữa ăn và nạp ví</p>
            </div>
            <button
              onClick={() => setShowLinkModal(true)}
              className="py-2 px-4 bg-[#0057b8] hover:bg-[#003E82] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Liên kết con em ngay
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {childrenList.map((child) => {
              const isSelected = activeChild?.studentId === child.studentId;
              const isServed = child.todayOrders?.some(
                (o: any) => o.status === 'SERVED' || o.status === 'COMPLETED'
              );
              const isPreparing = child.todayOrders?.some(
                (o: any) => o.status === 'PREPARING' || o.status === 'CONFIRMED' || o.status === 'PENDING'
              );
              const mealLabel = isServed ? 'Đã nhận cơm' : isPreparing ? 'Đang chuẩn bị' : 'Chưa check-in';

              return (
                <button
                  key={child.studentId}
                  onClick={() => setSelectedChild(child)}
                  className={`flex flex-col gap-2.5 p-3 rounded-2xl border transition-all text-left shrink-0 cursor-pointer min-w-[178px] active:scale-[0.98] ${
                    isSelected
                      ? 'bg-[#EFF6FF]/70 text-slate-900 border-[#0057b8] shadow-xs ring-1 ring-[#0057b8]/30'
                      : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      {child.avatar ? (
                        <img
                          src={child.avatar}
                          alt={child.fullName}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs ${
                            isSelected ? 'bg-[#0057b8] text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {child.fullName.charAt(0)}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          isServed ? 'bg-emerald-500' : isPreparing ? 'bg-amber-400' : 'bg-slate-300'
                        }`}
                      />
                    </div>
                    <div className="truncate flex-1 min-w-0">
                      <p className="text-xs font-bold truncate text-slate-900">{child.fullName}</p>
                      <p className={`text-[10px] font-mono font-medium ${isSelected ? 'text-[#0057b8]' : 'text-slate-400'}`}>
                        {child.linkCode || child.studentId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[11px]">
                    <span className="font-bold text-slate-900 font-mono">
                      {Number(child.balance || 0).toLocaleString('vi-VN')} đ
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                        isServed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isPreparing
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {mealLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* VIEW 1: CHILDREN DETAILS & MEAL TRACKING */}
      {currentView === 'children' && !activeChild && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Chưa liên kết tài khoản con em</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Vui lòng liên kết tài khoản học sinh để theo dõi thực đơn, lịch sử nhận cơm và nạp ví ăn bán trú.
          </p>
          <button
            onClick={() => setShowLinkModal(true)}
            className="py-2.5 px-4 bg-[#0057b8] hover:bg-[#003E82] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition"
          >
            <PlusCircle className="w-4 h-4" />
            Liên kết con em ngay
          </button>
        </div>
      )}

      {currentView === 'children' && activeChild && (
        <>
          {/* Main Child Digital Oversight Card (Refined Gradient) */}
          <div className="bg-gradient-to-br from-[#003E82] via-[#004e9c] to-[#0057b8] text-white rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden">
            {/* Subtle mesh background accents */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-sky-400/15 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  {activeChild.avatar ? (
                    <img
                      src={activeChild.avatar}
                      alt={activeChild.fullName}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-white/30 shadow-xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-white/20 text-white flex items-center justify-center font-black text-xl border border-white/25">
                      {activeChild.fullName.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 bg-emerald-400 w-4 h-4 rounded-full border-2 border-[#003E82]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-white text-base tracking-tight">{activeChild.fullName}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-xs text-white font-bold bg-white/20 px-2 py-0.5 rounded-lg border border-white/25">
                      {activeChild.linkCode || activeChild.studentId}
                    </span>
                    <button
                      onClick={() => handleCopy(activeChild.linkCode || activeChild.studentId)}
                      className="text-white/80 hover:text-white p-1 transition cursor-pointer"
                      title="Sao chép mã học sinh"
                    >
                      {copiedText === (activeChild.linkCode || activeChild.studentId) ? (
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-white/85 flex items-center gap-1 mt-1">
                    <Building2 className="w-3 h-3 text-white/80" />
                    <span>{activeChild.canteenName || selectedCanteen?.name || 'THPT FPT Quy Nhơn • Cơ sở 1'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Balances & Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 relative z-10">
              <div className="bg-white/10 border border-white/15 p-3 rounded-2xl backdrop-blur-xs">
                <span className="text-[11px] text-white/80 font-medium block">Số dư ví học sinh</span>
                <p className="text-xl font-black text-white mt-1 font-mono tracking-tight">
                  {Number(activeChild.balance || 0).toLocaleString('vi-VN')}{' '}
                  <span className="text-xs font-normal text-white/70">đ</span>
                </p>
              </div>
              <div className="bg-white/10 border border-white/15 p-3 rounded-2xl backdrop-blur-xs">
                <span className="text-[11px] text-white/80 font-medium block">Suất ăn tháng</span>
                <p className="text-xl font-black text-white mt-1 font-mono tracking-tight">
                  {activeChild.totalRemainingCredits ?? 28}{' '}
                  <span className="text-xs font-normal text-white/70">suất</span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-0.5 relative z-10">
              <button
                onClick={openTopupModal}
                className="w-full py-2.5 bg-white hover:bg-slate-50 text-[#003E82] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <CreditCard className="w-3.5 h-3.5 text-[#0057b8]" />
                <span>Nạp ví cho con ngay</span>
              </button>
            </div>
          </div>

          {/* Today's Meal Status (FR-PT-02: Trạng thái bữa ăn hôm nay) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center">
                  <Utensils className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 tracking-tight">Trạng thái bữa ăn hôm nay</h4>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 font-mono">
                {new Date().toLocaleDateString('vi-VN')}
              </span>
            </div>

            {activeChild.todayOrders && activeChild.todayOrders.length > 0 ? (
              <div className="space-y-2.5">
                {activeChild.todayOrders.map((order, idx) => {
                  const isServed = order.status === 'SERVED' || order.status === 'COMPLETED';
                  const dishCount = order.items?.length || 3;

                  return (
                    <div
                      key={order.id || idx}
                      onClick={() => setSelectedOrderForDetail(order)}
                      className="p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#0057b8]/40 hover:bg-slate-50/50 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#0057b8]" />
                          <span className="text-xs font-bold text-slate-900">
                            {order.mealType === 'BREAKFAST'
                              ? 'Bữa Sáng'
                              : order.mealType === 'DINNER'
                              ? 'Bữa Tối'
                              : 'Bữa Trưa'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            • {new Date(order.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            isServed
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isServed ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>
                                Đã nhận khay
                                {order.checkins?.[0]?.checkinTime
                                  ? ` (${new Date(order.checkins[0].checkinTime).toLocaleTimeString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })})`
                                  : ''}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>Đang chuẩn bị</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                        <span className="font-medium text-slate-600 text-[11px]">Khay cơm tiêu chuẩn ({dishCount} món dinh dưỡng)</span>
                        <span className="text-[11px] font-bold text-[#0057b8] hover:text-[#003E82] flex items-center gap-0.5">
                          Xem món <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-7 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Clock className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  Con chưa điểm danh nhận khay hôm nay
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Thông báo và chi tiết khay cơm sẽ lập tức hiển thị ngay khi học sinh quét mã QR tại quầy tiếp thực.
                </p>
              </div>
            )}
          </div>

          {/* CARD GÓP Ý & YÊU CẦU ĐẾN CANTEEN TRƯỜNG */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center shrink-0">
                  <MessageSquareHeart className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Góp ý & Yêu cầu Canteen</h4>
                  <p className="text-[10px] text-slate-400">
                    Cơ sở: <strong className="text-slate-600">{activeChild.canteenName || selectedCanteen?.name || 'THPT FPT Quy Nhơn'}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFeedbackModal(true)}
                className="text-[11px] font-bold text-white bg-[#0057b8] hover:bg-[#003E82] px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi góp ý</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 leading-relaxed">
              Phụ huynh có thể đóng góp ý kiến về chất lượng khẩu phần ăn, phản ánh phục vụ hoặc gửi yêu cầu chăm sóc dinh dưỡng riêng cho con trực tiếp đến Bếp Canteen trường.
            </p>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(true)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Gửi đánh giá</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('feedback')}
                className="flex-1 py-2 px-3 rounded-xl bg-[#EFF6FF] hover:bg-blue-100/70 text-[#0057b8] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <MessageSquareHeart className="w-3.5 h-3.5" />
                <span>Lịch sử phản hồi</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: PARENT NUTRITION MENU */}
      {currentView === 'menu' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900">Thực đơn dinh dưỡng của con</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    Trường: <strong className="text-slate-700">{selectedCanteen?.name || activeChild?.canteenName}</strong>
                  </p>
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#EFF6FF] text-[#003E82] border border-[#D0E7FF] shrink-0">
                    <Lock className="w-2.5 h-2.5" />
                    Cố định
                  </span>
                </div>
              </div>
            </div>

            {/* Meal Shift Filter */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
              {(['BREAKFAST', 'LUNCH', 'DINNER'] as const).map((meal) => (
                <button
                  key={meal}
                  onClick={() => setSelectedMealType(meal)}
                  className={`py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
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
                    onClick={() => setSelectedDishForDetail(dish)}
                    className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs hover:border-[#0057b8]/40 transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 overflow-hidden border border-slate-200/80">
                        {dish.image ? (
                          <img
                            src={dish.image}
                            alt={dish.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                            <Utensils className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{dish.name}</h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                            {dish.category === 'MAIN' || dish.category === 'SIDE' ? 'Món mặn' : dish.category === 'SOUP' ? 'Canh' : 'Món ăn'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#0057b8]" />
                          Chạm để xem chi tiết dinh dưỡng
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* PAYING REQUEST MODAL (VIETQR) */}
      {payingRequest && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessingRequest) setPayingRequest(null);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex items-end justify-center"
        >
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain modal-scrollable touch-pan-y animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto" />
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-[#131B2E]">Thanh Toán Yêu Cầu Cho Con</h4>
                <p className="text-[11px] text-slate-500">
                  Duyệt thanh toán cho bé {payingRequest.student?.fullName}
                </p>
              </div>
              <button
                type="button"
                disabled={isProcessingRequest}
                onClick={() => setPayingRequest(null)}
                className="text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Image Box */}
            <div className="bg-[#F7FAFE] p-4 rounded-2xl border border-[#E2E8F0] flex flex-col items-center">
              <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200">
                <img
                  src={`https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact.png?amount=${payingRequest.amount}&addInfo=${encodeURIComponent(
                    `DUYET ${payingRequest.student?.fullName || 'CON'}`
                  )}&accountName=${encodeURIComponent(selectedCanteen?.bankAccountName || selectedCanteen?.name || 'CANTEEN FPT')}`}
                  alt="VietQR"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <p className="text-sm font-black text-[#0057b8] mt-3">
                Số tiền cần trả: {Number(payingRequest.amount).toLocaleString('vi-VN')} đ
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {payingRequest.type === 'PACKAGE' ? `Gói: ${payingRequest.packageName}` : 'Nạp trực tiếp vào ví học sinh'}
              </p>
            </div>

            {requestPaySuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold text-center">
                {requestPaySuccessMsg}
              </div>
            )}

            <button
              type="button"
              disabled={isProcessingRequest}
              onClick={() => handleConfirmPayRequest(payingRequest)}
              className="w-full py-3 rounded-xl bg-[#0057b8] text-white font-bold text-xs cursor-pointer hover:bg-[#004593] disabled:opacity-50 transition shadow-md flex items-center justify-center gap-2"
            >
              {isProcessingRequest ? (
                <span>Đang xác nhận giao dịch...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tôi Đã Chuyển Khoản • Duyệt Cho Con</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* VIEW 3: PARENT WALLET & VIETQR TOPUP */}
      {currentView === 'wallet' && !activeChild && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center mx-auto">
            <CreditCard className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Chưa chọn con em để nạp ví</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Vui lòng liên kết tài khoản con em để sử dụng tính năng nạp ví VietQR chuẩn xác cho học sinh.
          </p>
          <button
            onClick={() => setShowLinkModal(true)}
            className="py-2.5 px-4 bg-[#0057b8] hover:bg-[#003E82] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition"
          >
            <PlusCircle className="w-4 h-4" />
            Liên kết con em ngay
          </button>
        </div>
      )}

      {currentView === 'wallet' && activeChild && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[#003E82] via-[#004e9c] to-[#0057b8] text-white rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-white/80 font-medium">Ví Canteen học sinh</span>
                <h3 className="text-xl font-black text-white mt-0.5">{activeChild.fullName}</h3>
              </div>
              <span className="text-xs font-bold text-white bg-white/20 border border-white/20 px-2.5 py-1 rounded-full font-mono">
                {activeChild.linkCode || activeChild.studentId}
              </span>
            </div>

            <div className="p-3.5 bg-white/10 border border-white/15 rounded-2xl backdrop-blur-xs">
              <span className="text-[11px] text-white/80">Số dư hiện khả dụng</span>
              <p className="text-2xl font-black text-white mt-1 font-mono tracking-tight">
                {Number(activeChild.balance || 0).toLocaleString('vi-VN')}{' '}
                <span className="text-xs font-normal text-white/70">đ</span>
              </p>
            </div>

            <button
              onClick={openTopupModal}
              className="w-full py-2.5 bg-white hover:bg-slate-50 text-[#003E82] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <CreditCard className="w-3.5 h-3.5 text-[#0057b8]" />
              <span>Nạp tiền nhanh qua VietQR chuẩn</span>
            </button>
          </div>

          {/* Quick VietQR Topup CTA Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs text-center space-y-3">
            <div className="w-12 h-12 bg-blue-50 text-[#0057b8] rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Nạp tiền vào ví bằng mã VietQR</h4>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                Chọn số tiền và hệ thống sẽ tự động sinh mã VietQR chuyển khoản chính xác với cú pháp định danh của con.
              </p>
            </div>
            <button
              onClick={openTopupModal}
              className="w-full py-2.5 bg-[#0057b8] hover:bg-[#003E82] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Chọn số tiền & Sinh mã VietQR</span>
            </button>
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

              {/* Sample Chips for 1-Touch Demo */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-semibold block">Mã mẫu thử nghiệm nhanh:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { code: 'HS-2026-0098', name: 'Nguyễn Văn An' },
                    { code: 'HS-2026-0102', name: 'Trần Thị Bích' },
                    { code: 'HS-2026-0115', name: 'Lê Hoàng Long' },
                    { code: 'HS-2026-0120', name: 'Phạm Minh Đức' },
                  ].map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setInputStudentCode(item.code)}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-[#EFF6FF] text-[#0057b8] hover:bg-blue-100/70 border border-[#0057b8]/20 cursor-pointer flex items-center gap-1 transition active:scale-95"
                    >
                      <span className="font-mono">{item.code}</span>
                      <span className="text-slate-500 font-normal">({item.name})</span>
                    </button>
                  ))}
                </div>
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

      {/* MODAL 2: 2-STEP VIETQR TOPUP */}
      {showTopupModal && activeChild && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTopupModal(false);
          }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 space-y-4 relative shadow-2xl overscroll-contain modal-scrollable touch-pan-y max-h-[90vh] overflow-y-auto border border-slate-100">
            <button
              onClick={() => setShowTopupModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* STEP 1: CHỌN SỐ TIỀN */}
            {topupStep === 'SELECT_AMOUNT' ? (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0057b8] text-[10px] font-bold">
                    Bước 1 / 2 • Chọn số tiền
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">Nạp Tiền Vào Ví Của Con</h3>
                  <p className="text-[11px] text-slate-500">
                    Cho học sinh: <span className="font-bold text-slate-800">{activeChild.fullName}</span> ({activeChild.linkCode || activeChild.studentId})
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Số dư hiện tại:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {Number(activeChild.balance || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                {/* Preset Buttons */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-600">Chọn nhanh mức tiền nạp:</label>
                  <div className="grid grid-cols-2 gap-2">
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
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition text-left cursor-pointer flex items-center justify-between active:scale-95 ${
                            isSelected
                              ? 'border-[#0057b8] bg-[#EFF6FF] text-[#0057b8] shadow-2xs ring-1 ring-[#0057b8]/30'
                              : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <span>{(amt / 1000).toLocaleString('vi-VN')}k</span>
                          <span className="text-[11px] font-normal text-slate-500 font-mono">{amt.toLocaleString('vi-VN')} đ</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Amount Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-600">Hoặc nhập số tiền khác:</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="10000"
                      min="10000"
                      value={customTopupAmount}
                      onChange={(e) => setCustomTopupAmount(e.target.value)}
                      placeholder="VD: 150000"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:border-[#0057b8] focus:ring-1 focus:ring-[#0057b8] outline-hidden pr-8 transition"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">đ</span>
                  </div>
                </div>

                {/* Amount preview */}
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">Số tiền sẽ nạp:</span>
                  <span className="text-sm font-black text-[#0057b8] font-mono">
                    {effectiveTopupAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setTopupStep('SHOW_QR')}
                  className="w-full py-2.5 bg-[#0057b8] hover:bg-[#003E82] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  <span>Tiếp tục tạo mã VietQR</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* STEP 2: SINH MÃ & QUÉT VIETQR */
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                    Bước 2 / 2 • Quét mã chuyển khoản
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">Mã VietQR Nạp Ví</h3>
                  <p className="text-[11px] text-slate-500">
                    Mở app ngân hàng quét mã bên dưới để nạp chính xác
                  </p>
                </div>

                {/* VietQR Image Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-center space-y-2.5">
                  <img
                    src={vietQrUrl}
                    alt="VietQR"
                    className="w-44 h-44 mx-auto object-contain rounded-xl shadow-xs bg-white p-2 border border-slate-100"
                  />
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 text-[11px]">Số tiền nạp:</span>
                      <span className="font-bold text-slate-900 font-mono text-sm text-[#0057b8]">
                        {effectiveTopupAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 text-[11px]">Nội dung CK:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-900">{transferContent}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(transferContent)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 transition cursor-pointer"
                          title="Sao chép nội dung CK"
                        >
                          {copiedText === transferContent ? <Check className="w-3.5 h-3.5 text-[#0057b8]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/80 text-[11px]">
                      <span className="text-slate-500">Người thụ hưởng:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedCanteen?.name || 'CANTEEN FPT'}
                      </span>
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
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Đổi mức</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickTopupConfirm}
                    disabled={topupLoading}
                    className="flex-2 py-2.5 bg-[#0057b8] hover:bg-[#003E82] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 active:scale-[0.98]"
                  >
                    {topupLoading ? 'Đang xử lý...' : 'Xác nhận đã chuyển tiền'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DISH DETAIL MODAL (Progressive disclosure for nutrition) */}
      <DishDetailModal
        dish={selectedDishForDetail}
        isOpen={Boolean(selectedDishForDetail)}
        readOnly={true}
        onClose={() => setSelectedDishForDetail(null)}
      />

      {/* ORDER DETAIL BOTTOMSHEET MODAL (Progressive disclosure for today's meal) */}
      {selectedOrderForDetail && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedOrderForDetail(null);
          }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-white rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-250 max-h-[85vh] flex flex-col overscroll-contain modal-scrollable touch-pan-y border-t border-slate-100">
            <div className="pt-3 pb-1 flex justify-center shrink-0">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Chi Tiết Bữa Ăn Của Con</h3>
                <p className="text-[11px] text-slate-500">
                  {selectedOrderForDetail.mealType === 'BREAKFAST'
                    ? 'Bữa Sáng'
                    : selectedOrderForDetail.mealType === 'DINNER'
                    ? 'Bữa Tối'
                    : 'Bữa Trưa'}{' '}
                  • {new Date(selectedOrderForDetail.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date().toLocaleDateString('vi-VN')}
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
