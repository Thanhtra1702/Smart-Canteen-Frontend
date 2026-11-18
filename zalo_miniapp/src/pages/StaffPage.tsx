import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { TabKey } from '../components/BottomNavigation';
import { DishImage } from '../components/DishImage';
import {
  ScanIcon as ScanLine,
  SunHorizonIcon as Sunrise,
  ChefHatIcon as ChefHat,
  UsersIcon as Users,
  MagnifyingGlassIcon as Search,
  CameraIcon as Camera,
  CheckCircleIcon as CheckCircle2,
  WarningCircleIcon as AlertCircle,
  ClockIcon as Clock,
  CheckIcon as Check,
  PaperPlaneTiltIcon as Send,
  StarIcon as Star,
  ForkKnifeIcon as Utensils,
  SunIcon as Sun,
  MoonIcon as Moon,
  XIcon as X,
  ArrowClockwiseIcon as RotateCw,
  BuildingsIcon as Building2,
  PlusIcon as Plus,
  PencilSimpleIcon as Edit3,
  ArrowUpRightIcon as ArrowUpRight,
  CreditCardIcon as CreditCard,
  ReceiptIcon as Receipt,
  GearSixIcon as Settings,
  LockIcon as Lock,
  CaretRightIcon as ChevronRight,
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { CanteenConfigModal } from '../components/CanteenConfigModal';
import { KitchenForecastModal } from '../components/KitchenForecastModal';
import jsQR from 'jsqr';

const compressImage = (file: File, maxDim = 800, quality = 0.82): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getCategoryLabel = (cat: string) => {
  switch (cat) {
    case 'MAIN': return 'Món chính';
    case 'VEGETABLE': return 'Rau xào';
    case 'SOUP': return 'Món canh';
    case 'SIDE': return 'Món phụ';
    case 'DESSERT': return 'Tráng miệng';
    case 'DRINK': return 'Đồ uống';
    default: return cat;
  }
};

interface StaffPageProps {
  activeSubTab?: TabKey;
  onNavigateTab: (tab: TabKey) => void;
}

export const StaffPage: React.FC<StaffPageProps> = ({ activeSubTab = 'overview', onNavigateTab: _onNavigateTab }) => {
  const {
    refreshServingQueue,
    checkinQrToken,
    branchFeedbacks,
    refreshBranchFeedbacks,
    resolveFeedback,
    selectedCanteen,
    selectedMealType,
    staffMetrics,
    refreshStaffMetrics,
    hasPermission,
    user,
    showAlert,
  } = useApp();

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [overviewForecast, setOverviewForecast] = useState<any | null>(null);

  const currentView =
    activeSubTab === 'overview'
      ? 'overview'
      : activeSubTab === 'staff_menu'
      ? 'menu'
      : activeSubTab === 'users'
      ? 'users'
      : activeSubTab === 'feedbacks'
      ? 'feedbacks'
      : 'scan';

  // Branch Daily Meal Menu state for Admin Cơ Sở
  const [todayStr] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const [mountNow] = useState(() => Date.now());
  const [selectedMenuDate, setSelectedMenuDate] = useState<string>(todayStr);
  const [selectedMealSlot, setSelectedMealSlot] = useState<'ALL' | 'BREAKFAST' | 'LUNCH' | 'DINNER'>('ALL');
  const [scheduledMenus, setScheduledMenus] = useState<any[]>([]);
  const [branchDishes, setBranchDishes] = useState<any[]>([]);
  const [loadingBranchMenu, setLoadingBranchMenu] = useState<boolean>(false);
  const [photoTargetDish, setPhotoTargetDish] = useState<any | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [showDishModal, setShowDishModal] = useState<boolean>(false);
  const [editingDish, setEditingDish] = useState<any | null>(null);
  const [isSavingDish, setIsSavingDish] = useState<boolean>(false);
  const [dishFormData, setDishFormData] = useState({
    name: '',
    category: 'MAIN',
    extraPrice: 0,
    description: '',
    isAvailable: true,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Generate 7 days for quick date selector
  const weekDays = useMemo(() => {
    const list = [];
    const base = new Date(`${todayStr}T00:00:00+07:00`);
    for (let offset = -1; offset <= 5; offset++) {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      const dayNum = d.getDay();
      const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const dayFullLabels = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      list.push({
        dateStr,
        dayLabel: dayLabels[dayNum],
        dayFullLabel: dayFullLabels[dayNum],
        dayMonth: `${d.getDate()}/${d.getMonth() + 1}`,
        isToday: dateStr === todayStr,
      });
    }
    return list;
  }, [todayStr]);

  const selectedDayInfo = useMemo(() => {
    const found = weekDays.find((w) => w.dateStr === selectedMenuDate);
    if (found) return found;
    const d = new Date(selectedMenuDate);
    const dayFullLabels = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return {
      dateStr: selectedMenuDate,
      dayLabel: 'Ngày',
      dayFullLabel: dayFullLabels[d.getDay()] || 'Ngày chọn',
      dayMonth: `${d.getDate()}/${d.getMonth() + 1}`,
      isToday: selectedMenuDate === todayStr,
    };
  }, [weekDays, selectedMenuDate, todayStr]);

  // Check cut-off status for a specific meal shift on the selected date
  const getSlotCutoffStatus = useCallback((slot: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
    let cutoffStr = '10:30';
    if (slot === 'BREAKFAST') cutoffStr = selectedCanteen?.cutoffBreakfast || '07:00';
    else if (slot === 'LUNCH') cutoffStr = selectedCanteen?.cutoffLunch || '10:30';
    else if (slot === 'DINNER') cutoffStr = selectedCanteen?.cutoffDinner || '16:00';

    const [cutHour, cutMin] = cutoffStr.split(':').map(Number);
    const now = new Date();
    const vnDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const curHour = vnDate.getUTCHours();
    const curMin = vnDate.getUTCMinutes();
    const curSeconds = curHour * 3600 + curMin * 60;
    const cutoffSeconds = (cutHour === 23 && cutMin === 59) ? 86400 : ((cutHour || 0) * 3600 + (cutMin || 0) * 60);

    const isToday = selectedMenuDate === todayStr;
    const isPastDate = selectedMenuDate < todayStr;
    const isPastTodayCutoff = isToday && curSeconds > cutoffSeconds;

    if (isPastDate || isPastTodayCutoff) {
      return {
        label: 'Đã chốt đặt món',
        desc: 'Bếp chốt số lượng nấu',
        isClosed: true,
        cutoffTime: cutoffStr,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      };
    }
    return {
      label: isToday ? 'Đang nhận đơn' : 'Nhận đặt trước',
      desc: isToday ? `Chốt lúc ${cutoffStr}` : 'Lịch tuần tới',
      isClosed: false,
      cutoffTime: cutoffStr,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }, [selectedCanteen, selectedMenuDate, todayStr]);

  // Fetch both scheduled menus for selected date and all dishes of this canteen
  const fetchBranchDailyMenu = useCallback(async () => {
    const cid = selectedCanteen?.id || user?.canteenId;
    if (!cid) return;
    try {
      setLoadingBranchMenu(true);
      const [todayMenuRes, dishesRes] = await Promise.all([
        api.get('/menu/today', { params: { canteenId: cid, date: selectedMenuDate } }).catch(() => ({ data: [] })),
        api.get('/menu/dishes', { params: { canteenId: cid } }).catch(() => ({ data: [] })),
      ]);
      setScheduledMenus(Array.isArray(todayMenuRes.data) ? todayMenuRes.data : []);
      setBranchDishes(Array.isArray(dishesRes.data) ? dishesRes.data : []);
    } catch (err) {
      console.warn('Lỗi tải thực đơn ngày cơ sở:', err);
    } finally {
      setLoadingBranchMenu(false);
    }
  }, [selectedCanteen?.id, user?.canteenId, selectedMenuDate]);

  useEffect(() => {
    if (currentView === 'menu') {
      fetchBranchDailyMenu();
    }
  }, [currentView, fetchBranchDailyMenu]);

  // Dishes grouped by meal slot for the selected date
  const getDishesForSlot = useCallback((slot: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
    const slotMenu = scheduledMenus.find((m: any) => m.mealType === slot);
    if (slotMenu && Array.isArray(slotMenu.items) && slotMenu.items.length > 0) {
      return slotMenu.items.map((it: any) => it.dish).filter(Boolean);
    }
    // If no specific slot menu entry in timetable, display canteen dishes relevant to this category
    return branchDishes;
  }, [scheduledMenus, branchDishes]);

  const dishStats = useMemo(() => {
    const total = branchDishes.length;
    const withPhoto = branchDishes.filter((d) => d.image && d.image.trim().length > 0).length;
    return { total, withPhoto };
  }, [branchDishes]);

  const triggerCameraUpload = (dish: any) => {
    setPhotoTargetDish(dish);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoTargetDish) return;
    try {
      const compressedDataUrl = await compressImage(file, 800, 0.82);
      setPhotoPreviewUrl(compressedDataUrl);
      setShowPhotoModal(true);
    } catch {
      void showAlert('Không thể xử lý ảnh chụp. Vui lòng thử lại!', 'Lỗi');
    }
  };

  const handleSaveDishPhoto = async () => {
    if (!photoTargetDish || !photoPreviewUrl) return;
    try {
      setIsUploadingPhoto(true);
      await api.put(`/menu/dishes/${photoTargetDish.id}`, {
        image: photoPreviewUrl,
      });
      setBranchDishes((prev) =>
        prev.map((d) => (d.id === photoTargetDish.id ? { ...d, image: photoPreviewUrl } : d))
      );
      setScheduledMenus((prev) =>
        prev.map((m) => ({
          ...m,
          items: (m.items || []).map((it: any) =>
            it.dish?.id === photoTargetDish.id
              ? { ...it, dish: { ...it.dish, image: photoPreviewUrl } }
              : it
          ),
        }))
      );
      setShowPhotoModal(false);
      setPhotoTargetDish(null);
      setPhotoPreviewUrl(null);
    } catch (err: any) {
      void showAlert(err.response?.data?.message || 'Lỗi khi lưu ảnh món ăn lên máy chủ!', 'Lỗi');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

    const openCreateDishModal = () => {
    setEditingDish(null);
    setDishFormData({
      name: '',
      category: 'MAIN',
      extraPrice: 0,
      description: '',
      isAvailable: true,
    });
    setShowDishModal(true);
  };

  const openEditDishModal = (dish: any) => {
    setEditingDish(dish);
    setDishFormData({
      name: dish.name || '',
      category: dish.category || 'MAIN',
      extraPrice: Number(dish.extraPrice || 0),
      description: dish.description || '',
      isAvailable: dish.isAvailable ?? true,
    });
    setShowDishModal(true);
  };

  const handleSaveDishForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishFormData.name.trim()) {
      void showAlert('Vui lòng nhập tên món ăn');
      return;
    }
    const cid = selectedCanteen?.id || user?.canteenId;
    if (!cid) {
      void showAlert('Không tìm thấy thông tin cơ sở Canteen', 'Lỗi');
      return;
    }
    try {
      setIsSavingDish(true);
      if (editingDish) {
        const res = await api.put(`/menu/dishes/${editingDish.id}`, dishFormData);
        setBranchDishes((prev) =>
          prev.map((d) => (d.id === editingDish.id ? { ...d, ...res.data } : d))
        );
      } else {
        const res = await api.post('/menu/dishes', { ...dishFormData, canteenId: cid });
        setBranchDishes((prev) => [res.data, ...prev]);
      }
      setShowDishModal(false);
      setEditingDish(null);
    } catch (err: any) {
      void showAlert(err.response?.data?.message || 'Lỗi khi lưu món ăn', 'Lỗi');
    } finally {
      setIsSavingDish(false);
    }
  };

  // Branch Users / Customers state for Admin Cơ Sở
  const [branchUsers, setBranchUsers] = useState<any[]>([]);
  const [loadingBranchUsers, setLoadingBranchUsers] = useState<boolean>(false);
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'USER' | 'PARENT'>('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);

  const fetchBranchUsers = useCallback(async () => {
    try {
      setLoadingBranchUsers(true);
      const res = await api.get('/users');
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setBranchUsers(data);
    } catch (err) {
      console.warn('Lỗi tải danh sách người dùng cơ sở:', err);
    } finally {
      setLoadingBranchUsers(false);
    }
  }, []);

  useEffect(() => {
    if (currentView === 'users') {
      fetchBranchUsers();
    }
  }, [currentView, fetchBranchUsers]);

  const filteredBranchUsers = useMemo(() => {
    return branchUsers.filter((u) => {
      if (u.role === 'SUPER_ADMIN') return false;
      if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false;
      if (userSearchQuery.trim()) {
        const q = userSearchQuery.toLowerCase();
        const studentCode = u.studentLinks?.[0]?.studentCode || u.parentLinks?.[0]?.studentCode || '';
        return (
          u.fullName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          studentCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [branchUsers, userRoleFilter, userSearchQuery]);

  const customerStats = useMemo(() => {
    const students = branchUsers.filter((u) => u.role === 'USER');
    const parents = branchUsers.filter((u) => u.role === 'PARENT');
    const withActiveSub = students.filter((s) => s.subscriptions && s.subscriptions.length > 0);
    return {
      totalStudents: students.length,
      totalParents: parents.length,
      activeSubCount: withActiveSub.length,
    };
  }, [branchUsers]);

  // Overview / Revenue state
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [selectedBarIndex, setSelectedBarIndex] = useState<number>(6); // Default to today (index 6)

  // Scanner state
  const [manualToken, setManualToken] = useState('');
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanFlash, setScanFlash] = useState(false);
  const [todayCanteenOrders, setTodayCanteenOrders] = useState<any[]>([]);
  const [loadingTodayCanteenOrders, setLoadingTodayCanteenOrders] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const lastScannedTokenRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Play pleasant scanner beep confirmation
  const playScannerBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  // Fetch today's orders for quick 1-tap pickup by counter staff
  const fetchTodayCanteenOrders = useCallback(async () => {
    const cid = selectedCanteen?.id || user?.canteenId;
    if (!cid) return;
    try {
      setLoadingTodayCanteenOrders(true);
      const res = await api.get('/orders/canteen', {
        params: { canteenId: cid, date: todayStr },
      });
      setTodayCanteenOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Lỗi tải danh sách đơn hôm nay:', err);
    } finally {
      setLoadingTodayCanteenOrders(false);
    }
  }, [selectedCanteen?.id, user?.canteenId, todayStr]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Trình duyệt không hỗ trợ mở camera trực tiếp. Vui lòng sử dụng tính năng chọn học sinh bên dưới.');
        return;
      }
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints as any);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play().catch((playErr) => console.warn('Video play warning:', playErr));
      }

      // Enable continuous hardware autofocus on mobile sensors if available
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
          if (capabilities?.focusMode?.includes('continuous')) {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as any);
          }
        } catch {}
      }
    } catch (err: any) {
      console.warn('Không thể khởi chạy camera:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Chưa cấp quyền camera. Vui lòng bấm vào biểu tượng ổ khóa 🔒 trên thanh địa chỉ để Cho phép máy ảnh, hoặc dùng danh sách bên dưới.');
      } else {
        setCameraError('Không thể mở camera trên thiết bị này (' + (err.message || 'Bận') + '). Vui lòng sử dụng danh sách phát cơm bên dưới.');
      }
    }
  }, []);

  const handleManualCheckin = async (tokenToUse?: string) => {
    const raw = tokenToUse || manualToken;
    const token = raw.replace(/^#/, '').replace(/\s+/g, '').trim();
    if (!token) return;
    setIsSubmittingToken(true);
    setScanResult(null);

    try {
      const res = await checkinQrToken(token);
      setScanResult(res);
      if (res.success) {
        setManualToken('');
        playScannerBeep();
        refreshServingQueue();
        fetchTodayCanteenOrders();
        // Auto clear result after 6s
        setTimeout(() => setScanResult(null), 6000);
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err?.response?.data?.message || err?.message || 'Lỗi khi kiểm tra mã QR',
      });
    } finally {
      setIsSubmittingToken(false);
    }
  };

  const handleManualCheckinRef = useRef(handleManualCheckin);
  useEffect(() => {
    handleManualCheckinRef.current = handleManualCheckin;
  });

  // Auto-activate camera and load today orders when entering scan view
  useEffect(() => {
    if (currentView === 'scan') {
      setIsCameraActive(true);
      fetchTodayCanteenOrders();
    } else {
      setIsCameraActive(false);
    }
  }, [currentView, fetchTodayCanteenOrders]);

  // CSAT state
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');
  const [replyingFeedbackId, setReplyingFeedbackId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const refreshStaffAllRef = useRef({
    refreshServingQueue,
    refreshBranchFeedbacks,
    refreshStaffMetrics,
  });
  useEffect(() => {
    refreshStaffAllRef.current = {
      refreshServingQueue,
      refreshBranchFeedbacks,
      refreshStaffMetrics,
    };
  });

  // Initialize and refresh on load
  useEffect(() => {
    refreshStaffAllRef.current.refreshServingQueue();
    refreshStaffAllRef.current.refreshBranchFeedbacks();
    refreshStaffAllRef.current.refreshStaffMetrics();
  }, [selectedCanteen?.id]);

  // Load Kitchen Forecast & BOM summary for overview
  useEffect(() => {
    const fetchOverviewForecast = async () => {
      const cid = selectedCanteen?.id || user?.canteenId;
      if (!cid) return;
      try {
        const res = await api.get(`/inventory/forecast/${cid}`, {
          params: { mealType: selectedMealType || 'LUNCH' },
        });
        setOverviewForecast(res.data);
      } catch (err) {
        console.warn('Lỗi tải tóm tắt dự báo bếp:', err);
      }
    };
    fetchOverviewForecast();
  }, [selectedCanteen?.id, user?.canteenId, selectedMealType]);

  // Ultra high-speed QR scanning loop (~16-20 FPS, <80ms detection time)
  useEffect(() => {
    if (isCameraActive) {
      startCamera();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      let barcodeDetector: any = null;
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        } catch {
          barcodeDetector = null;
        }
      }

      let isProcessing = false;

      // 60ms interval (~16 FPS) catches QR codes instantly on entry
      scanIntervalRef.current = setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || isSubmittingToken || isProcessing) return;

        isProcessing = true;
        try {
          let scannedCode = '';

          // 1. Hardware BarcodeDetector API (GPU/ISP native decoding in 5-15ms)
          if (barcodeDetector) {
            try {
              const barcodes = await barcodeDetector.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                scannedCode = barcodes[0].rawValue;
              }
            } catch {
              // Fallback to jsQR
            }
          }

          // 2. High-speed jsQR single-pass fallback
          if (!scannedCode && ctx && video.videoWidth > 0 && video.videoHeight > 0) {
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const minDim = Math.min(vw, vh);

            // Reticle center 72% crop
            const cropSize = Math.round(minDim * 0.72);
            const sx = Math.round((vw - cropSize) / 2);
            const sy = Math.round((vh - cropSize) / 2);
            const targetDim = Math.min(cropSize, 440);

            if (canvas.width !== targetDim || canvas.height !== targetDim) {
              canvas.width = targetDim;
              canvas.height = targetDim;
              ctx.imageSmoothingEnabled = false;
            }

            ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, targetDim, targetDim);
            const imgData = ctx.getImageData(0, 0, targetDim, targetDim);
            
            // Fast mode: dontInvert is 2x faster for standard dark-on-light QR passes
            const qrResult = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (qrResult && qrResult.data) {
              scannedCode = qrResult.data;
            } else {
              // Occasional fallback for inverted/damaged codes
              const fullResult = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: 'attemptBoth',
              });
              if (fullResult && fullResult.data) {
                scannedCode = fullResult.data;
              }
            }
          }

          if (scannedCode) {
            const raw = scannedCode.trim();
            const now = Date.now();
            if (
              raw &&
              (raw !== lastScannedTokenRef.current || now - lastScannedTimeRef.current > 3000)
            ) {
              lastScannedTokenRef.current = raw;
              lastScannedTimeRef.current = now;
              // Immediate sensory confirmation
              setScanFlash(true);
              setTimeout(() => setScanFlash(false), 450);
              playScannerBeep();
              navigator.vibrate?.([60]);
              handleManualCheckinRef.current(raw);
            }
          }
        } catch {
          // Ignore transient frame error
        } finally {
          isProcessing = false;
        }
      }, 60);
    } else {
      stopCamera();
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    }
    return () => {
      stopCamera();
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [isCameraActive, isSubmittingToken, startCamera, stopCamera]);

  // Keep video stream attached whenever camera is active and element is ready
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  const handleSendFeedbackReply = async (feedbackId: string) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    await resolveFeedback(feedbackId, replyText);
    setIsSubmittingReply(false);
    setReplyingFeedbackId(null);
    setReplyText('');
  };

  const filteredFeedbacks = branchFeedbacks.filter((fb) => {
    if (ratingFilter === 'ALL') return true;
    return fb.rating === Number(ratingFilter);
  });

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const dashboard = staffMetrics?.dashboard || {
    totalUsers: 35,
    todayCheckins: 356,
    todayOrders: 161,
    todayRevenue: 8677000,
  };

  const balance = staffMetrics?.balance || {
    totalRevenue: 15028000,
    totalWithdrawn: 57500000,
    availableBalance: 15028000,
    recentWithdrawals: [],
  };

  const timeSeries = staffMetrics?.timeSeries || {
    labels: ['19/10', '20/10', '21/10', '22/10', '23/10', '24/10', '25/10'],
    data: [270000, 240000, 210000, 210000, 180000, 3098000, 7010000],
  };

  const currentRevenue =
    period === 'today'
      ? dashboard.todayRevenue
      : period === 'week'
      ? balance.totalRevenue || 15028000
      : (balance.totalRevenue || 15028000) * 3.2;

  const currentCheckins =
    period === 'today'
      ? dashboard.todayCheckins
      : period === 'week'
      ? dashboard.todayCheckins * 5.4
      : dashboard.todayCheckins * 22;

  const currentOrders =
    period === 'today'
      ? dashboard.todayOrders
      : period === 'week'
      ? dashboard.todayOrders * 5.2
      : dashboard.todayOrders * 21;

  return (
    <div className="px-3.5 pt-3 sm:px-5 sm:pt-4 space-y-3.5 pb-28 bg-[#F7FAFE] min-h-screen">
      {/* VIEW 0: REVENUE & OPERATIONS DASHBOARD (DOANH THU & VẬN HÀNH CƠ SỞ) */}
      {currentView === 'overview' && (
        <div className="space-y-4">
          {/* 1. Header with Canteen Name & Quick Refresh */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4.5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center shrink-0 border border-[#D0E7FF]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    {selectedCanteen?.name || 'THPT FPT Quy Nhơn • Cơ sở 1'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Doanh thu & Chỉ số Vận hành Cơ sở
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  refreshStaffMetrics();
                  refreshServingQueue();
                  refreshBranchFeedbacks();
                }}
                disabled={staffMetrics.loading}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer active:scale-95"
                title="Làm mới số liệu"
              >
                <RotateCw className={`w-3.5 h-3.5 ${staffMetrics.loading ? 'animate-spin text-[#0057b8]' : ''}`} />
              </button>
            </div>

            {/* Quick Canteen & Meal Shift Config Trigger */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95 ${
                  hasPermission('CANTEEN_CONFIG')
                    ? 'bg-[#0057b8] hover:bg-[#003E82] text-white'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                {hasPermission('CANTEEN_CONFIG') ? (
                  <Settings className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>Cấu hình cơ sở & Ca ăn</span>
                {!hasPermission('CANTEEN_CONFIG') && (
                  <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold ml-1">
                    Khóa
                  </span>
                )}
              </button>

              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                <Clock className="w-3 h-3 text-[#0057b8]" />
                <span>Chốt trưa: {selectedCanteen?.cutoffLunch || '10:30'}</span>
              </div>
            </div>

            {/* Segmented Period Switcher */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl">
              {[
                { id: 'today', label: 'Hôm nay' },
                { id: 'week', label: 'Tuần này' },
                { id: 'month', label: 'Tháng này' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id as any)}
                  className={`py-1.5 text-xs font-bold rounded-xl transition cursor-pointer active:scale-95 ${
                    period === p.id
                      ? 'bg-white text-[#0057b8] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Hero Revenue Card */}
          <div className="bg-gradient-to-br from-[#003E82] via-[#004e9c] to-[#0057b8] text-white rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 relative z-10">
              <div className="flex items-start justify-between md:block gap-2">
                <div>
                  <span className="text-[11px] font-medium text-white/80 block">
                    Tổng doanh thu ({period === 'today' ? 'Hôm nay' : period === 'week' ? 'Tuần này' : 'Tháng này'})
                  </span>
                  <div className="text-2xl sm:text-[26px] font-black font-mono tracking-tight text-white mt-0.5 tabular-nums">
                    {formatVND(currentRevenue)}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-white/15 text-white px-2.5 py-0.5 rounded-full border border-white/20 md:mt-2 shrink-0">
                  <ArrowUpRight className="w-3 h-3" />
                  +18.4%
                </span>
              </div>

              {/* Revenue Split (Package Credits vs Direct Wallet) */}
              <div className="grid grid-cols-2 gap-2.5 md:w-[360px] shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-white/15">
                <div className="bg-white/10 rounded-xl p-2.5 sm:p-3 border border-white/15 backdrop-blur-xs">
                  <div className="flex items-center gap-1.5 text-[10.5px] text-white/80">
                    <CreditCard className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Vé tháng (Gói)</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold font-mono text-white mt-1 tabular-nums">
                    {formatVND(currentRevenue * 0.52)}
                  </div>
                  <span className="text-[9.5px] text-white/70">52% doanh thu</span>
                </div>

                <div className="bg-white/10 rounded-xl p-2.5 sm:p-3 border border-white/15 backdrop-blur-xs">
                  <div className="flex items-center gap-1.5 text-[10.5px] text-white/80">
                    <Receipt className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Ví trực tiếp / Lẻ</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold font-mono text-white mt-1 tabular-nums">
                    {formatVND(currentRevenue * 0.48)}
                  </div>
                  <span className="text-[9.5px] text-white/70">48% doanh thu</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Operational KPI Strip (1 hàng tối giản) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs py-3 px-1 grid grid-cols-4 divide-x divide-slate-100">
            {[
              {
                key: 'servings',
                label: 'Suất ăn',
                value: Math.round(currentCheckins).toLocaleString('vi-VN'),
              },
              {
                key: 'orders',
                label: 'Đặt trước',
                value: Math.round(currentOrders).toLocaleString('vi-VN'),
              },
              {
                key: 'students',
                label: 'Học sinh',
                value: Number(dashboard.totalUsers || 0).toLocaleString('vi-VN'),
              },
              {
                key: 'rating',
                label: 'Đánh giá',
                value: '4.8',
                isRating: true,
              },
            ].map(({ key, label, value, isRating }) => (
              <div key={key} className="px-1.5 flex flex-col items-center justify-center text-center min-w-0">
                <div className="text-base sm:text-lg font-black font-mono text-slate-900 tracking-tight tabular-nums leading-tight flex items-center justify-center gap-0.5">
                  <span>{value}</span>
                  {isRating && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />}
                </div>
                <span className="text-[10.5px] sm:text-xs font-medium text-slate-500 mt-0.5 truncate max-w-full">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* 3.5 Dự báo Bếp & Định mức BOM (đưa lên trên để Admin Cơ sở xem ngay) */}
          {(() => {
            const singleOrders = overviewForecast?.totalSingleOrders ?? 133;
            const packageOrders = overviewForecast?.packageServingEstimate ?? 32;
            const bufferPct = overviewForecast?.bufferMarginPercent ?? 12;
            const totalToCook = overviewForecast
              ? Math.round(overviewForecast.totalEstimatedServings * (1 + (overviewForecast.bufferMarginPercent || 0) / 100))
              : 185;
            const shortageCount = overviewForecast?.ingredientsForecast?.filter((i: any) => i.isShortage)?.length ?? 0;
            const mealLabel =
              selectedMealType === 'BREAKFAST' ? 'Ca Sáng' : selectedMealType === 'DINNER' ? 'Ca Tối' : 'Ca Trưa';

            return (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <ChefHat className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 truncate">Dự báo Bếp &amp; Định mức BOM</h4>
                  </div>
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                    {mealLabel}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50/80 px-2.5 py-2.5 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-500 font-medium block">Đặt lẻ</span>
                    <span className="text-base font-black text-slate-900 font-mono tabular-nums">{singleOrders}</span>
                  </div>

                  <div className="bg-slate-50/80 px-2.5 py-2.5 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-500 font-medium block">Vé tháng</span>
                    <span className="text-base font-black text-slate-900 font-mono tabular-nums">{packageOrders}</span>
                  </div>

                  <div className="bg-[#0057b8] text-white px-2.5 py-2.5 rounded-xl text-center shadow-2xs">
                    <span className="text-[10px] text-white/85 font-semibold block">Cần nấu (+{bufferPct}%)</span>
                    <span className="text-base font-black text-white font-mono tabular-nums">{totalToCook}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold min-w-0">
                    {shortageCount > 0 ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span className="text-rose-600 truncate">Thiếu {shortageCount} nguyên liệu</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-emerald-700 truncate">Đủ nguyên liệu nấu ca này</span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowForecastModal(true)}
                    className="py-1.5 px-3 rounded-xl bg-[#0057b8] hover:bg-[#003E82] text-white text-[11px] font-bold transition shadow-xs cursor-pointer flex items-center gap-1 shrink-0 active:scale-95"
                  >
                    <span>Xem BOM</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* 4. Weekly Revenue Trend Line Chart */}
          {(() => {
            const labels: string[] = Array.isArray(timeSeries.labels) ? timeSeries.labels : [];
            const data: number[] = Array.isArray(timeSeries.data)
              ? timeSeries.data.map((v: any) => Number(v || 0))
              : [];
            const count = Math.max(labels.length, data.length, 1);
            const safeIdx = Math.min(selectedBarIndex, count - 1);
            const maxVal = Math.max(...data, 1);
            const avgVal = data.length > 0 ? Math.round(data.reduce((a, b) => a + b, 0) / data.length) : 0;
            const peakIdx = data.length > 0 ? data.indexOf(maxVal) : 0;

            const svgW = count * 100;
            const svgH = 120;
            const padTop = 20;
            const padBottom = 10;
            const plotH = svgH - padTop - padBottom;

            const points = labels.map((lbl, idx) => {
              const val = data[idx] ?? 0;
              const x = (idx + 0.5) * 100;
              const y = padTop + plotH - (val / maxVal) * plotH;
              const xPct = ((idx + 0.5) / count) * 100;
              const yPct = (y / svgH) * 100;
              return { lbl, val, x, y, xPct, yPct, idx };
            });

            const buildSmoothPath = (pts: typeof points) => {
              if (pts.length === 0) return '';
              if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
              return pts.reduce((acc, pt, i, arr) => {
                if (i === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
                const prev = arr[i - 1];
                const cpX = ((prev.x + pt.x) / 2).toFixed(1);
                return `${acc} C ${cpX} ${prev.y.toFixed(1)}, ${cpX} ${pt.y.toFixed(1)}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
              }, '');
            };

            const linePath = buildSmoothPath(points);
            const areaPath =
              points.length > 0
                ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
                : '';

            const formatCompact = (n: number) => {
              if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}tr`;
              if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
              return `${n}`;
            };

            return (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">Doanh thu 7 ngày trong tuần</h4>
                    <p className="text-[10.5px] text-slate-400">Chạm từng ngày để xem chi tiết</p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/80 px-2.5 py-1 rounded-xl shrink-0">
                    <span className="text-[11px] font-bold text-[#0057b8]">
                      {labels[safeIdx] || 'Hôm nay'}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-bold font-mono text-slate-900 tabular-nums">
                      {formatVND(data[safeIdx] || 0)}
                    </span>
                  </div>
                </div>

                {/* Interactive Line & Area Chart */}
                <div className="space-y-1.5">
                  <div className="relative h-32 sm:h-36 w-full select-none">
                    {/* Crisp SVG Grid, Crosshair, Gradient Fill & Line */}
                    <svg
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="revLineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0057b8" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#0057b8" stopOpacity="0.01" />
                        </linearGradient>
                      </defs>

                      {[0, 0.5, 1].map((ratio) => {
                        const yLine = padTop + plotH * ratio;
                        return (
                          <line
                            key={ratio}
                            x1={0}
                            y1={yLine}
                            x2={svgW}
                            y2={yLine}
                            stroke="#E2E8F0"
                            strokeWidth="1"
                            vectorEffect="non-scaling-stroke"
                            strokeDasharray={ratio === 1 ? undefined : '3 3'}
                          />
                        );
                      })}

                      {areaPath && <path d={areaPath} fill="url(#revLineAreaGrad)" />}

                      {linePath && (
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#0057b8"
                          strokeWidth="2.5"
                          vectorEffect="non-scaling-stroke"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </svg>

                    {/* Perfect HTML Interactive Dots, Vertical Guide & Value Pill */}
                    {points.map((pt) => {
                      const isActive = pt.idx === safeIdx;
                      return (
                        <button
                          key={pt.lbl}
                          type="button"
                          onClick={() => setSelectedBarIndex(pt.idx)}
                          style={{ left: `${pt.xPct}%` }}
                          className="absolute inset-y-0 -translate-x-1/2 w-10 cursor-pointer focus:outline-none group"
                          aria-label={`${pt.lbl}: ${formatVND(pt.val)}`}
                        >
                          {isActive && (
                            <span
                              style={{ top: `${pt.yPct}%` }}
                              className="absolute bottom-2 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-blue-300 pointer-events-none"
                            />
                          )}

                          {isActive && (
                            <span
                              style={{ top: `${pt.yPct}%` }}
                              className="absolute -translate-y-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9.5px] font-bold font-mono px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-xs pointer-events-none"
                            >
                              {formatCompact(pt.val)}
                            </span>
                          )}

                          <span
                            style={{ top: `${pt.yPct}%` }}
                            className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all pointer-events-none ${
                              isActive
                                ? 'w-3 h-3 bg-[#0057b8] ring-4 ring-blue-500/20 border-2 border-white shadow-xs'
                                : 'w-2 h-2 bg-white border-2 border-[#0057b8] group-hover:scale-125'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Clickable X-Axis Day Pills */}
                  <div className="grid grid-cols-7 gap-1">
                    {points.map((pt) => {
                      const isActive = pt.idx === safeIdx;
                      return (
                        <button
                          key={pt.lbl}
                          type="button"
                          onClick={() => setSelectedBarIndex(pt.idx)}
                          className={`py-1 rounded-lg text-[10.5px] font-mono transition cursor-pointer ${
                            isActive
                              ? 'bg-[#0057b8] text-white font-bold shadow-2xs'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 font-medium'
                          }`}
                        >
                          {pt.lbl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Concise Summary Footer */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    TB/ngày:{' '}
                    <strong className="font-mono text-slate-800">{formatVND(avgVal)}</strong>
                  </span>
                  <span>
                    Cao nhất ({labels[peakIdx] || '-'}):{' '}
                    <strong className="font-mono text-slate-800">{formatVND(maxVal)}</strong>
                  </span>
                </div>
              </div>
            );
          })()}

          {/* 5. Phân bổ theo ca phục vụ (tối giản) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900">Phân bổ theo ca phục vụ</h4>

            <div className="divide-y divide-slate-100">
              {[
                {
                  key: 'morning',
                  name: 'Ca Sáng',
                  meta: '45 suất • 06:30–08:30',
                  amount: 1125000,
                  status: 'Hoàn tất',
                  statusColor: 'text-emerald-600',
                  iconBg: 'bg-amber-50 text-amber-600',
                  Icon: Sun,
                },
                {
                  key: 'lunch',
                  name: 'Ca Trưa',
                  badge: '75%',
                  meta: '260 suất • Chủ lực',
                  amount: 6500000,
                  status: 'Hoàn tất',
                  statusColor: 'text-emerald-600',
                  iconBg: 'bg-emerald-50 text-emerald-600',
                  Icon: Utensils,
                },
                {
                  key: 'dinner',
                  name: 'Ca Tối',
                  meta: '51 suất • 17:00–19:00',
                  amount: 1052000,
                  status: 'Đang phục vụ',
                  statusColor: 'text-slate-500',
                  iconBg: 'bg-slate-100 text-slate-600',
                  Icon: Moon,
                },
              ].map(({ key, name, badge, meta, amount, status, statusColor, iconBg, Icon }) => (
                <div key={key} className="py-2.5 first:pt-1 last:pb-0.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{name}</span>
                        {badge && (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700">
                            {badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{meta}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-mono text-slate-900 tabular-nums">{formatVND(amount)}</div>
                    <span className={`text-[10px] font-medium ${statusColor}`}>{status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Đối soát & Dòng tiền cơ sở (tối giản) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900">Đối soát &amp; Dòng tiền cơ sở</h4>
              <span className="text-[11px] font-bold text-slate-700 font-mono tabular-nums shrink-0">
                Số dư: {formatVND(balance.availableBalance > 0 ? balance.availableBalance : balance.totalRevenue)}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {(balance.recentWithdrawals && balance.recentWithdrawals.length > 0
                ? balance.recentWithdrawals
                : [
                    {
                      id: 'w-01',
                      amount: 32500000,
                      description: 'Đối soát doanh thu tuần 39 về VietinBank cơ sở',
                      createdAt: '2026-10-17T17:19:12.370Z',
                    },
                    {
                      id: 'w-02',
                      amount: 25000000,
                      description: 'Đối soát doanh thu tuần 38 về VietinBank cơ sở',
                      createdAt: '2026-10-10T17:19:12.370Z',
                    },
                  ]
              ).map((w: any) => (
                <div key={w.id} className="py-2.5 first:pt-1 last:pb-0.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-semibold text-slate-800 truncate">{w.description}</p>
                    <span className="text-[10.5px] text-slate-400 font-mono block">
                      {new Date(w.createdAt).toLocaleDateString('vi-VN')} • VietinBank
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-mono text-emerald-600 tabular-nums">
                      +{formatVND(w.amount)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Đã thanh toán</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: BRANCH MENU & DISHES MANAGEMENT (Thực đơn theo Ngày & Bữa ăn của Cơ sở) */}
      {currentView === 'menu' && (
        <div className="space-y-3.5 pb-8">
          {/* Hidden file input for camera / photo capture */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoFileChange}
            className="hidden"
          />

          {/* 1. Header Card (tối giản, không xuống dòng/trùng thông tin) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">Thực đơn ngày</h4>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0 whitespace-nowrap">
                  {dishStats.total} món
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={fetchBranchDailyMenu}
                  disabled={loadingBranchMenu}
                  className="w-8 h-8 rounded-xl border border-slate-200/80 text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50 transition active:scale-95 flex items-center justify-center shrink-0"
                  title="Làm mới thực đơn ngày"
                  aria-label="Làm mới thực đơn ngày"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loadingBranchMenu ? 'animate-spin text-[#0057b8]' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={openCreateDishModal}
                  className="px-3 py-1.5 rounded-xl bg-[#0057b8] hover:bg-[#003E82] text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Thêm món</span>
                </button>
              </div>
            </div>

            {/* Quick Date Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  {selectedDayInfo.dayFullLabel}, {selectedDayInfo.dayMonth}
                </span>
                {selectedDayInfo.isToday ? (
                  <span className="text-[11px] font-semibold text-emerald-600">Hôm nay</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedMenuDate(todayStr)}
                    className="text-[11px] font-bold text-[#0057b8] hover:underline cursor-pointer whitespace-nowrap"
                  >
                    Về hôm nay
                  </button>
                )}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((d) => {
                  const isSelected = d.dateStr === selectedMenuDate;
                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => setSelectedMenuDate(d.dateStr)}
                      className={`py-1.5 px-1 rounded-xl text-center transition cursor-pointer border active:scale-95 ${
                        isSelected
                          ? 'bg-[#0057b8] text-white border-[#0057b8] shadow-xs'
                          : d.isToday
                          ? 'bg-blue-50/60 border-blue-200/80 text-slate-800'
                          : 'bg-slate-50/80 border-slate-200/70 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <p className={`text-[10px] font-semibold ${isSelected ? 'text-white/85' : 'text-slate-400'}`}>
                        {d.dayLabel}
                      </p>
                      <p className={`text-xs font-bold font-mono tabular-nums ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {d.dayMonth.split('/')[0]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Meal Shift Filter Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl">
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'BREAKFAST', label: 'Bữa sáng' },
                { key: 'LUNCH', label: 'Bữa trưa' },
                { key: 'DINNER', label: 'Bữa chiều' },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSelectedMealSlot(s.key as any)}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-bold text-center cursor-pointer transition whitespace-nowrap active:scale-95 ${
                    selectedMealSlot === s.key
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Loading State */}
          {loadingBranchMenu ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-2.5 shadow-2xs">
              <div className="w-8 h-8 border-3 border-[#0057b8] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Đang tải thực đơn theo ngày của cơ sở...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                {
                  slot: 'BREAKFAST' as const,
                  title: 'Bữa Sáng',
                  timeRange: '06:30–08:30',
                  emptyText: 'Chưa có món ăn cho ca sáng.',
                  iconWrap: 'bg-amber-50 text-amber-600',
                  Icon: Sunrise,
                },
                {
                  slot: 'LUNCH' as const,
                  title: 'Bữa Trưa',
                  timeRange: '11:00–13:00',
                  emptyText: 'Chưa có món ăn cho ca trưa.',
                  iconWrap: 'bg-blue-50 text-[#0057b8]',
                  Icon: Sun,
                },
                {
                  slot: 'DINNER' as const,
                  title: 'Bữa Chiều / Tối',
                  timeRange: '17:00–19:00',
                  emptyText: 'Chưa có món ăn cho ca chiều.',
                  iconWrap: 'bg-indigo-50 text-indigo-600',
                  Icon: Moon,
                },
              ]
                .filter((cfg) => selectedMealSlot === 'ALL' || selectedMealSlot === cfg.slot)
                .map(({ slot, title, timeRange, emptyText, iconWrap, Icon }) => {
                  const status = getSlotCutoffStatus(slot);
                  const dishes = getDishesForSlot(slot);
                  return (
                    <div key={slot} className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                      {/* Shift Header (tối giản) */}
                      <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl ${iconWrap} flex items-center justify-center shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 truncate">{title}</h5>
                            <p className="text-[10.5px] text-slate-500 font-mono truncate">
                              {timeRange} • Chốt {status.cutoffTime}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${status.badgeClass}`}>
                          {status.label}
                        </span>
                      </div>

                      {/* Shift Dishes List (1 hàng gọn mỗi món) */}
                      <div className="px-3.5 divide-y divide-slate-100">
                        {dishes.length === 0 ? (
                          <div className="text-center py-5 text-slate-400 text-xs">{emptyText}</div>
                        ) : (
                          dishes.map((dish: any) => (
                            <div key={dish.id} className="py-2.5 flex items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <DishImage
                                  src={dish.image}
                                  alt={dish.name}
                                  className="w-12 h-12 rounded-xl shrink-0 border border-slate-200/70"
                                  imgClassName="w-full h-full object-cover"
                                />

                                <div className="min-w-0 flex-1">
                                  <h6 className="text-xs font-bold text-slate-900 truncate">{dish.name}</h6>
                                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                    <span>{getCategoryLabel(dish.category)}</span>
                                    {Number(dish.extraPrice) > 0 && (
                                      <span className="font-mono font-semibold text-slate-700">
                                        {' '}• +{new Intl.NumberFormat('vi-VN').format(Number(dish.extraPrice))}đ
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => triggerCameraUpload(dish)}
                                  className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-[#0057b8] border border-slate-200/80 flex items-center justify-center transition cursor-pointer active:scale-95"
                                  title={dish.image ? 'Đổi ảnh thực tế' : 'Chụp ảnh món'}
                                  aria-label={dish.image ? 'Đổi ảnh thực tế' : 'Chụp ảnh món'}
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditDishModal(dish)}
                                  className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 flex items-center justify-center transition cursor-pointer active:scale-95"
                                  title="Sửa món"
                                  aria-label="Sửa món"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 1: QR SCANNER & MANUAL TOKEN INPUT (tối giản) */}
      {currentView === 'scan' && (
        <div className="space-y-3 pb-6">
          {!hasPermission('SERVING_OPERATION') ? (
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 text-center space-y-2 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Chức năng Quét QR bị khóa</h4>
              <p className="text-xs text-amber-800 leading-relaxed max-w-xs mx-auto">
                Tài khoản chưa được cấp quyền <strong>SERVING_OPERATION</strong>. Vui lòng liên hệ Quản trị viên.
              </p>
            </div>
          ) : (
            <>
              {/* Scanner + Manual Input Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ScanLine className="w-4 h-4 text-[#0057b8] shrink-0" />
                    <h4 className="text-xs font-bold text-slate-900 truncate">Quét QR phát suất</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCameraActive((prev) => !prev)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap active:scale-95 ${
                      isCameraActive
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-[#0057b8] text-white hover:bg-[#003E82] shadow-2xs'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isCameraActive ? 'Tắt camera' : 'Bật camera'}</span>
                  </button>
                </div>

                {/* Compact Camera Viewfinder */}
                {isCameraActive && (
                  <div>
                    {cameraError ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-center space-y-2">
                        <p className="text-xs text-amber-900 font-medium">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => startCamera()}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                        >
                          Thử lại
                        </button>
                      </div>
                    ) : (
                      <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800">
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover"
                          autoPlay
                          playsInline
                          muted
                        />

                        {/* Minimal Corner Frame */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="relative w-44 h-44 rounded-xl border border-white/25">
                            <div className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl" />
                            <div className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr" />
                            <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 border-cyan-400 rounded-bl" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-2 border-r-2 border-cyan-400 rounded-br" />
                          </div>
                        </div>

                        {scanFlash && (
                          <div className="absolute inset-0 bg-emerald-500/30 border-2 border-emerald-400 pointer-events-none flex items-center justify-center">
                            <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
                              Đã nhận mã QR
                            </span>
                          </div>
                        )}

                        {isSubmittingToken && (
                          <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white">
                            <div className="bg-slate-900 px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs font-bold">
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Đang kiểm tra...</span>
                            </div>
                          </div>
                        )}

                        <span className="absolute bottom-2 bg-black/65 text-white text-[10px] px-2.5 py-0.5 rounded-full">
                          Đưa mã QR vào khung
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual QR Token Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nhập mã QR hoặc mã đơn..."
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-mono focus:outline-none focus:border-[#0057b8] focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => handleManualCheckin()}
                    disabled={isSubmittingToken || !manualToken.trim()}
                    className="py-2 px-3.5 bg-[#0057b8] hover:bg-[#003E82] text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-45 shrink-0 whitespace-nowrap active:scale-95"
                  >
                    {isSubmittingToken ? 'Đang xử lý...' : 'Xác nhận'}
                  </button>
                </div>

                {/* Compact Scan Result */}
                {scanResult && (
                  <div
                    className={`px-3 py-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                      scanResult.success
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {scanResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{scanResult.message}</p>
                        {scanResult.success && (
                          <p className="text-[10.5px] text-emerald-700">
                            {selectedMealType === 'BREAKFAST' ? 'Ca Sáng' : selectedMealType === 'DINNER' ? 'Ca Tối' : 'Ca Trưa'} • Đã phát khay
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScanResult(null)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                      aria-label="Đóng thông báo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Today's Orders Quick Check-In List */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-bold text-slate-900">
                    Đơn hôm nay{' '}
                    <span className="text-slate-500 font-semibold">
                      ({todayCanteenOrders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED').length} chờ nhận)
                    </span>
                  </h5>
                  <button
                    type="button"
                    onClick={fetchTodayCanteenOrders}
                    disabled={loadingTodayCanteenOrders}
                    className="w-7 h-7 rounded-lg border border-slate-200/80 text-slate-600 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition"
                    title="Làm mới danh sách"
                    aria-label="Làm mới danh sách"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${loadingTodayCanteenOrders ? 'animate-spin text-[#0057b8]' : ''}`} />
                  </button>
                </div>

                {loadingTodayCanteenOrders ? (
                  <div className="py-5 text-center text-xs text-slate-400">Đang tải danh sách đơn...</div>
                ) : todayCanteenOrders.length === 0 ? (
                  <div className="py-5 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                    Chưa có đơn đặt món nào hôm nay.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {todayCanteenOrders.map((ord: any) => {
                      const isCompleted = ord.status === 'COMPLETED' || ord.status === 'SERVED';
                      const dishNames = (ord.items || []).map((it: any) => it.dish?.name || 'Món ăn').join(', ');
                      const shortCode = ord.id.substring(0, 6).toUpperCase();
                      const mealLabel =
                        ord.mealType === 'BREAKFAST' ? 'Sáng' : ord.mealType === 'DINNER' ? 'Chiều' : 'Trưa';

                      return (
                        <div
                          key={ord.id}
                          className={`py-2.5 first:pt-1 last:pb-0.5 flex items-center justify-between gap-2.5 ${
                            isCompleted ? 'opacity-60' : ''
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {ord.user?.fullName || 'Học sinh'}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                #{shortCode} • {mealLabel}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5" title={dishNames}>
                              {dishNames || 'Suất ăn tiêu chuẩn'}
                            </p>
                          </div>

                          <div className="shrink-0">
                            {isCompleted ? (
                              <span className="text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-1 whitespace-nowrap">
                                <Check className="w-3.5 h-3.5" />
                                <span>Đã nhận</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleManualCheckin(ord.id)}
                                disabled={isSubmittingToken}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition cursor-pointer disabled:opacity-50 whitespace-nowrap active:scale-95"
                              >
                                Phát khay
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* VIEW 2: BRANCH USERS / CUSTOMERS MANAGEMENT (tối giản) */}
      {currentView === 'users' && (
        <div className="space-y-3 pb-6">
          {/* Top Control Card (tiêu đề + tìm kiếm + lọc vai trò gọn) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">Người dùng</h4>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0 whitespace-nowrap">
                  {customerStats.activeSubCount} vé tháng
                </span>
              </div>
              <button
                type="button"
                onClick={fetchBranchUsers}
                disabled={loadingBranchUsers}
                className="w-8 h-8 rounded-xl border border-slate-200/80 text-slate-600 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0"
                title="Làm mới danh sách"
                aria-label="Làm mới danh sách"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loadingBranchUsers ? 'animate-spin text-[#0057b8]' : ''}`} />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Tìm tên, SĐT, mã HS..."
                className="w-full pl-8.5 pr-3 h-9 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0057b8] focus:bg-white transition"
              />
            </div>

            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'ALL', label: `Tất cả (${customerStats.totalStudents + customerStats.totalParents})` },
                { id: 'USER', label: `Học sinh (${customerStats.totalStudents})` },
                { id: 'PARENT', label: `Phụ huynh (${customerStats.totalParents})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setUserRoleFilter(tab.id as any)}
                  className={`py-1.5 px-1 text-[11px] rounded-lg transition cursor-pointer text-center whitespace-nowrap active:scale-95 ${
                    userRoleFilter === tab.id
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* User List */}
          {loadingBranchUsers ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 divide-y divide-slate-100 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="py-2.5 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBranchUsers.length === 0 ? (
            <div className="py-10 px-4 text-center bg-white rounded-2xl border border-slate-200/80 text-slate-500 space-y-1 shadow-2xs">
              <Users className="w-7 h-7 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-700">Không tìm thấy tài khoản phù hợp</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              {filteredBranchUsers.map((u: any) => {
                const studentLink = u.studentLinks?.[0];
                const parentLink = u.parentLinks?.[0];
                const activeSub = u.subscriptions?.[0];
                const credits = Number(activeSub?.remainingCredits ?? activeSub?.remainingMeals ?? 0);
                const cleanName = (u.fullName || 'Người dùng').replace(/\s*\([^)]*\)\s*$/, '').trim();

                const roleLabel =
                  u.role === 'USER'
                    ? { text: 'Học sinh', cls: 'bg-emerald-50 text-emerald-700' }
                    : u.role === 'PARENT'
                    ? { text: 'Phụ huynh', cls: 'bg-amber-50 text-amber-700' }
                    : { text: 'Nhân viên', cls: 'bg-slate-100 text-slate-600' };

                const subMeta =
                  u.role === 'USER'
                    ? studentLink?.studentCode || u.phone || 'HS-2026-0098'
                    : u.role === 'PARENT'
                    ? `Con: ${parentLink?.student?.fullName || 'Nguyễn Văn An'}`
                    : u.phone || u.email || '';

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserDetail(u)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2.5 hover:bg-slate-50/80 transition text-left cursor-pointer active:bg-slate-100/70"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8.5 h-8.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {cleanName.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">{cleanName}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-semibold shrink-0 ${roleLabel.cls}`}>
                            {roleLabel.text}
                          </span>
                        </div>
                        {subMeta && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{subMeta}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      {u.role === 'USER' ? (
                        <div>
                          <div className="text-xs font-bold font-mono text-slate-900 tabular-nums">
                            {formatVND(Number(u.wallet?.balance || 0))}
                          </div>
                          {credits > 0 && (
                            <span className="text-[10px] font-medium text-emerald-600 block">
                              {credits} suất
                            </span>
                          )}
                        </div>
                      ) : u.isActive === false ? (
                        <span className="text-[10.5px] font-semibold text-slate-400">Đã khóa</span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* User Detail Centered Modal */}
          {selectedUserDetail && (
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedUserDetail(null);
              }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 space-y-4 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto modal-scrollable touch-pan-y animate-in zoom-in-95 duration-200"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] text-[#0057b8] font-bold text-sm flex items-center justify-center border border-[#D0E7FF]">
                      {selectedUserDetail.fullName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{selectedUserDetail.fullName}</h3>
                      <span className="text-[11px] text-slate-500 font-mono">{selectedUserDetail.email}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUserDetail(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Vai trò:</span>
                    <span className="font-bold text-slate-900">
                      {selectedUserDetail.role === 'USER' ? 'Học sinh bán trú' : selectedUserDetail.role === 'PARENT' ? 'Phụ huynh học sinh' : 'Nhân viên cơ sở'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Số điện thoại:</span>
                    <span className="font-mono font-semibold text-slate-900">{selectedUserDetail.phone || 'Chưa cập nhật'}</span>
                  </div>

                  {selectedUserDetail.role === 'USER' && (
                    <>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Mã định danh HS:</span>
                        <span className="font-mono font-bold text-[#0057b8]">{selectedUserDetail.studentLinks?.[0]?.studentCode || 'HS-2026-0098'}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Số dư ví Canteen:</span>
                        <span className="font-mono font-bold text-slate-900">{formatVND(Number(selectedUserDetail.wallet?.balance || 0))}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Gói ăn vé tháng:</span>
                        <span className="font-semibold text-emerald-700">
                          {selectedUserDetail.subscriptions?.[0]
                            ? `Còn ${selectedUserDetail.subscriptions[0].remainingCredits ?? selectedUserDetail.subscriptions[0].remainingMeals ?? 0} suất ăn`
                            : 'Chưa đăng ký'}
                        </span>
                      </div>
                      {selectedUserDetail.studentLinks?.[0]?.parent && (
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500">Phụ huynh liên kết:</span>
                          <span className="font-medium text-slate-900">
                            {selectedUserDetail.studentLinks[0].parent.fullName} ({selectedUserDetail.studentLinks[0].parent.phone})
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {selectedUserDetail.role === 'PARENT' && selectedUserDetail.parentLinks?.[0]?.student && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Con đang theo học:</span>
                      <span className="font-medium text-slate-900">
                        {selectedUserDetail.parentLinks[0].student.fullName} ({selectedUserDetail.parentLinks[0].studentCode})
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUserDetail(null)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: CSAT FEEDBACK MANAGEMENT */}
      {currentView === 'feedbacks' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Đánh giá CSAT từ học sinh</h4>
                <p className="text-[11px] text-slate-500">Cơ sở: {selectedCanteen?.name}</p>
              </div>
              <button
                onClick={refreshBranchFeedbacks}
                className="text-[11px] text-[#0057b8] font-bold flex items-center gap-1 cursor-pointer hover:underline"
              >
                <RotateCw className="w-3 h-3" />
                <span>Làm mới</span>
              </button>
            </div>

            {/* Rating Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {['ALL', '5', '4', '3', '2', '1'].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingFilter(star)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border shrink-0 active:scale-95 ${
                    ratingFilter === star
                      ? 'bg-[#0057b8] text-white border-[#0057b8] shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  {star === 'ALL' ? 'Tất cả' : `${star} sao`}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback List */}
          <div className="space-y-3">
            {filteredFeedbacks.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs">
                Không có đánh giá nào phù hợp với bộ lọc
              </div>
            ) : (
              filteredFeedbacks.map((fb) => (
                <div key={fb.id} className="bg-white rounded-3xl border border-slate-200/80 p-4.5 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {fb.user?.fullName || 'Học sinh'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({fb.user?.email || 'student@smartcanteen.vn'})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= fb.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                        <span className="text-[11px] font-bold text-slate-700 ml-1">
                          {fb.rating} sao
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(fb.createdAt || mountNow).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  {fb.dish && (
                    <span className="inline-block text-[10px] font-bold bg-[#EFF6FF] text-[#0057b8] border border-[#0057b8]/20 px-2.5 py-0.5 rounded-full">
                      Món ăn: {fb.dish.name}
                    </span>
                  )}

                  {fb.comment && (
                    <p className="text-xs text-slate-700 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 italic leading-relaxed">
                      "{fb.comment}"
                    </p>
                  )}

                  {/* Staff Reply or Reply Button */}
                  {fb.reply || fb.replyText ? (
                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-1 text-xs">
                      <span className="text-[10px] font-bold text-[#0057b8] uppercase tracking-wider block">
                        Phản hồi của Canteen:
                      </span>
                      <p className="text-slate-900 font-medium">{fb.reply || fb.replyText}</p>
                    </div>
                  ) : replyingFeedbackId === fb.id ? (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <textarea
                        rows={2}
                        placeholder="Nhập nội dung phản hồi giải quyết cho học sinh..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full p-3 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:border-[#0057b8] focus:ring-1 focus:ring-[#0057b8] transition"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingFeedbackId(null);
                            setReplyText('');
                          }}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer transition"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendFeedbackReply(fb.id)}
                          disabled={isSubmittingReply || !replyText.trim()}
                          className="px-3.5 py-1.5 bg-[#0057b8] hover:bg-[#003E82] text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs active:scale-95"
                        >
                          <Send className="w-3 h-3" />
                          <span>Gửi phản hồi</span>
                        </button>
                      </div>
                    </div>
                  ) : !hasPermission('FEEDBACK_RESOLVE') ? (
                    <div className="pt-1 flex justify-end">
                      <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Chỉ xem (Chưa cấp quyền phản hồi)</span>
                      </span>
                    </div>
                  ) : (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingFeedbackId(fb.id);
                          setReplyText('');
                        }}
                        className="text-xs font-bold text-[#0057b8] hover:text-[#003E82] bg-[#EFF6FF] hover:bg-blue-100/70 px-3 py-1.5 rounded-xl border border-[#0057b8]/20 transition cursor-pointer shadow-2xs active:scale-95"
                      >
                        Trả lời góp ý
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Canteen & Meal Shift Configuration Modal */}
      <CanteenConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} />

      {/* Kitchen Forecast & BOM Modal */}
      <KitchenForecastModal
        isOpen={showForecastModal}
        onClose={() => setShowForecastModal(false)}
        initialMealSlot={selectedMealType}
      />
      {/* PHOTO PREVIEW & UPLOAD MODAL (Centered) */}
      {showPhotoModal && photoTargetDish && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPhotoModal(false);
          }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl p-4 sm:p-5 space-y-4 max-h-[85vh] overflow-y-auto modal-scrollable touch-pan-y shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100"
          >

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Xem trước ảnh món ăn</h4>
                <p className="text-[11px] text-[#0057b8] truncate max-w-[260px] font-semibold">
                  {photoTargetDish.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-black flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo preview container */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center shadow-inner">
              <DishImage
                src={photoPreviewUrl}
                alt={photoTargetDish.name}
                className="w-full h-full"
                imgClassName="w-full h-full object-cover"
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed text-center">
              Ảnh đã được tự động nén tối ưu hiển thị nhanh 60fps trên ứng dụng của học sinh & phụ huynh.
            </p>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSaveDishPhoto}
                disabled={isUploadingPhoto}
                className="w-full py-2.5 rounded-xl bg-[#0057b8] text-white text-xs font-bold hover:bg-[#003E82] flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 transition active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[2.5px]" />
                <span>{isUploadingPhoto ? 'Đang lưu ảnh lên hệ thống...' : 'Xác nhận & Cập nhật ảnh món'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                    fileInputRef.current.click();
                  }
                }}
                disabled={isUploadingPhoto}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition active:scale-95"
              >
                <Camera className="w-4 h-4 text-slate-500" />
                <span>Chụp lại ảnh khác</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISH CREATE / EDIT MODAL (Centered) */}
      {showDishModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDishModal(false);
          }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl p-4 sm:p-5 space-y-4 max-h-[85vh] overflow-y-auto modal-scrollable touch-pan-y shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200"
          >

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900">
                {editingDish ? 'Chỉnh Sửa Món Ăn' : 'Thêm Món Ăn Mới Vào Cơ Sở'}
              </h4>
              <button
                type="button"
                onClick={() => setShowDishModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-black flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDishForm} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-800">Tên món ăn (*)</label>
                <input
                  type="text"
                  required
                  value={dishFormData.name}
                  onChange={(e) => setDishFormData({ ...dishFormData, name: e.target.value })}
                  placeholder="Ví dụ: Thịt kho trứng cút, Canh cải bẹ xanh..."
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-[#0057b8] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-800">Danh mục món</label>
                  <select
                    value={dishFormData.category}
                    onChange={(e) => setDishFormData({ ...dishFormData, category: e.target.value })}
                    className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-[#0057b8] focus:outline-hidden"
                  >
                    <option value="MAIN">Món chính</option>
                    <option value="VEGETABLE">Rau xào / Luộc</option>
                    <option value="SOUP">Món canh</option>
                    <option value="SIDE">Món phụ</option>
                    <option value="DESSERT">Tráng miệng</option>
                    <option value="DRINK">Đồ uống</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-800">Phụ thu (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={dishFormData.extraPrice}
                    onChange={(e) => setDishFormData({ ...dishFormData, extraPrice: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-[#0057b8] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">Mô tả món ăn (không bắt buộc)</label>
                <textarea
                  rows={2}
                  value={dishFormData.description}
                  onChange={(e) => setDishFormData({ ...dishFormData, description: e.target.value })}
                  placeholder="Thành phần, định lượng hoặc ghi chú dinh dưỡng..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-[#0057b8] focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="dishAvailableCheckbox"
                  checked={dishFormData.isAvailable}
                  onChange={(e) => setDishFormData({ ...dishFormData, isAvailable: e.target.checked })}
                  className="w-4 h-4 text-[#0057b8] rounded border-slate-300 cursor-pointer"
                />
                <label htmlFor="dishAvailableCheckbox" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Mở bán ngay (Đang phục vụ)
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingDish}
                  className="w-full py-3 rounded-xl bg-[#0057b8] text-white text-xs font-bold hover:bg-[#004593] flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[2.5px]" />
                  <span>{isSavingDish ? 'Đang lưu món ăn...' : editingDish ? 'Cập nhật món ăn' : 'Tạo món ăn mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
