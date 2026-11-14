import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { TabKey } from '../components/BottomNavigation';
import {
  ScanLine,
  Calendar,
  Sunrise,
  Sunset,
  Soup,
  ChefHat,
  Users,
  Search,
  Sparkles,
  MessageSquareHeart,
  QrCode,
  Camera,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Check,
  Send,
  Star,
  User,
  Utensils,
  Sun,
  Moon,
  Volume2,
  X,
  Play,
  RotateCw,
  Building2,
  UtensilsCrossed,
  Plus,
  Edit3,
  Image as ImageIcon,
  ArrowUpRight,
  CreditCard,
  Receipt,
  Layers,
  TrendingUp,
  Settings,
  Lock,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
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

export const StaffPage: React.FC<StaffPageProps> = ({ activeSubTab = 'overview', onNavigateTab }) => {
  const {
    servingQueue,
    refreshServingQueue,
    checkinQrToken,
    handleServingAction,
    branchFeedbacks,
    refreshBranchFeedbacks,
    resolveFeedback,
    selectedCanteen,
    selectedMealType,
    staffMetrics,
    refreshStaffMetrics,
    hasPermission,
    user,
  } = useApp();

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [overviewForecast, setOverviewForecast] = useState<any | null>(null);
  const [loadingOverviewForecast, setLoadingOverviewForecast] = useState(false);

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
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }), []);
  const [selectedMenuDate, setSelectedMenuDate] = useState<string>(todayStr);
  const [selectedMealSlot, setSelectedMealSlot] = useState<'ALL' | 'BREAKFAST' | 'LUNCH' | 'DINNER'>('ALL');
  const [scheduledMenus, setScheduledMenus] = useState<any[]>([]);
  const [branchDishes, setBranchDishes] = useState<any[]>([]);
  const [loadingBranchMenu, setLoadingBranchMenu] = useState<boolean>(false);
  const [dishCategoryFilter, setDishCategoryFilter] = useState<string>('ALL');
  const [dishSearchQuery, setDishSearchQuery] = useState<string>('');
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
    const base = new Date();
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

  const hasSpecificSlotMenu = useCallback((slot: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
    const slotMenu = scheduledMenus.find((m: any) => m.mealType === slot);
    return !!(slotMenu && Array.isArray(slotMenu.items) && slotMenu.items.length > 0);
  }, [scheduledMenus]);

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
    } catch (err) {
      alert('Không thể xử lý ảnh chụp. Vui lòng thử lại!');
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
      alert(err.response?.data?.message || 'Lỗi khi lưu ảnh món ăn lên máy chủ!');
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
      alert('Vui lòng nhập tên món ăn');
      return;
    }
    const cid = selectedCanteen?.id || user?.canteenId;
    if (!cid) {
      alert('Không tìm thấy thông tin cơ sở Canteen');
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
      alert(err.response?.data?.message || 'Lỗi khi lưu món ăn');
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
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);

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

  // Serving action loading
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Check BarcodeDetector availability
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      setHasBarcodeDetector(true);
    }
  }, []);

  // Initialize and refresh on load
  useEffect(() => {
    refreshServingQueue();
    refreshBranchFeedbacks();
    refreshStaffMetrics();
  }, [selectedCanteen?.id]);

  // Load Kitchen Forecast & BOM summary for overview
  useEffect(() => {
    const fetchOverviewForecast = async () => {
      const cid = selectedCanteen?.id || user?.canteenId;
      if (!cid) return;
      try {
        setLoadingOverviewForecast(true);
        const res = await api.get(`/inventory/forecast/${cid}`, {
          params: { mealType: selectedMealType || 'LUNCH' },
        });
        setOverviewForecast(res.data);
      } catch (err) {
        console.warn('Lỗi tải tóm tắt dự báo bếp:', err);
      } finally {
        setLoadingOverviewForecast(false);
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
              handleManualCheckin(raw);
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
  }, [isCameraActive, isSubmittingToken]);

  // Keep video stream attached whenever camera is active and element is ready
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  const startCamera = async () => {
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
  };

    const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleZmpScan = async () => {
    try {
      const zmp = (window as any).zmp || (window as any).ZMP;
      if (zmp && typeof zmp.scanQRCode === 'function') {
        const result = await zmp.scanQRCode();
        const code = result?.content || result;
        if (code && typeof code === 'string') {
          handleManualCheckin(code);
        }
      } else {
        setIsCameraActive((prev) => !prev);
      }
    } catch (zmpErr) {
      console.warn('Lỗi gọi scan qua Zalo SDK, chuyển sang camera trình duyệt:', zmpErr);
      setIsCameraActive(true);
    }
  };

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

  const handleServing = async (
    action: 'START_SERVING' | 'COMPLETE_SERVING' | 'UNDO_COMPLETED',
    checkinId: string
  ) => {
    setActionLoadingId(checkinId);
    await handleServingAction(action, checkinId);
    setActionLoadingId(null);
  };

  const handleSendFeedbackReply = async (feedbackId: string) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    await resolveFeedback(feedbackId, replyText);
    setIsSubmittingReply(false);
    setReplyingFeedbackId(null);
    setReplyText('');
  };

  const currentServing = servingQueue?.currentServing;
  const waitingQueue = servingQueue?.waitingQueue || [];
  const completedQueue = servingQueue?.completedQueue || [];
  const stats = servingQueue?.stats || {
    totalCheckins: 14,
    waitingCount: waitingQueue.length,
    servingCount: currentServing ? 1 : 0,
    completedCount: completedQueue.length,
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
    <div className="p-4 space-y-4 pb-28 bg-[#F7FAFE] min-h-screen">
      {/* Top Staff Status Bar - Only for operational sub-tabs (scan, serving, feedbacks) */}
      {currentView !== 'overview' && (
        <div className="bg-gradient-to-br from-[#003E82] via-[#004e9c] to-[#0057b8] text-white rounded-3xl p-5 shadow-sm space-y-3.5 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-white" />
              <h3 className="text-xs font-bold text-white tracking-tight">Quầy Canteen & Gắp Món</h3>
            </div>
            <span className="text-[11px] font-bold text-white bg-white/20 border border-white/25 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Đang phục vụ</span>
            </span>
          </div>

          {/* 3 Stats Counters */}
          <div className="grid grid-cols-3 gap-2 text-center relative z-10">
            <div className="bg-white/10 border border-white/15 p-3 rounded-2xl backdrop-blur-xs">
              <span className="text-[10px] text-white/80 block font-medium">Đang chờ</span>
              <span className="text-lg font-black text-white font-mono tracking-tight">{stats.waitingCount}</span>
            </div>
            <div className="bg-white/10 border border-white/15 p-3 rounded-2xl backdrop-blur-xs">
              <span className="text-[10px] text-white/80 block font-medium">Đang gắp</span>
              <span className="text-lg font-black text-white font-mono tracking-tight">{stats.servingCount}</span>
            </div>
            <div className="bg-white/10 border border-white/15 p-3 rounded-2xl backdrop-blur-xs">
              <span className="text-[10px] text-white/80 block font-medium">Đã nhận</span>
              <span className="text-lg font-black text-white font-mono tracking-tight">{stats.completedCount}</span>
            </div>
          </div>
        </div>
      )}

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
          <div className="bg-gradient-to-br from-[#003E82] via-[#004e9c] to-[#0057b8] text-white rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[11px] font-medium text-white/80 block">
                  Tổng Doanh Thu ({period === 'today' ? 'Hôm nay' : period === 'week' ? 'Tuần này' : 'Tháng này'})
                </span>
                <div className="text-2xl font-black font-mono tracking-tight text-white mt-1">
                  {formatVND(currentRevenue)}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-white/20 text-white px-2.5 py-1 rounded-full border border-white/25">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +18.4%
              </span>
            </div>

            {/* Revenue Split (Package Credits vs Direct Wallet) */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/20 relative z-10">
              <div className="bg-white/10 rounded-2xl p-3 border border-white/15 backdrop-blur-xs">
                <div className="flex items-center gap-1.5 text-[10.5px] text-white/80">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Vé tháng (Gói)</span>
                </div>
                <div className="text-xs font-bold font-mono text-white mt-1">
                  {formatVND(currentRevenue * 0.52)}
                </div>
                <span className="text-[9.5px] text-white/70">52% doanh thu</span>
              </div>

              <div className="bg-white/10 rounded-2xl p-3 border border-white/15 backdrop-blur-xs">
                <div className="flex items-center gap-1.5 text-[10.5px] text-white/80">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Ví trực tiếp / Lẻ</span>
                </div>
                <div className="text-xs font-bold font-mono text-white mt-1">
                  {formatVND(currentRevenue * 0.48)}
                </div>
                <span className="text-[9.5px] text-white/70">48% doanh thu</span>
              </div>
            </div>
          </div>

          {/* 3. Operational KPI 2x2 Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* KPI 1: Suất ăn phục vụ */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Suất phục vụ</span>
                <div className="w-8 h-8 rounded-2xl bg-sky-50 text-[#0057b8] flex items-center justify-center">
                  <Utensils className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black font-mono text-slate-900 tracking-tight">
                {Math.round(currentCheckins)} <span className="text-xs font-normal text-slate-400">suất</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                <span>94% công suất ca</span>
              </div>
            </div>

            {/* KPI 2: Đơn đặt trước */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Đơn đặt trước</span>
                <div className="w-8 h-8 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black font-mono text-slate-900 tracking-tight">
                {Math.round(currentOrders)} <span className="text-xs font-normal text-slate-400">đơn</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <span>100% chuẩn bị trước</span>
              </div>
            </div>

            {/* KPI 3: Học sinh tại cơ sở */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Học sinh đăng ký</span>
                <div className="w-8 h-8 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black font-mono text-slate-900 tracking-tight">
                {dashboard.totalUsers} <span className="text-xs font-normal text-slate-400">HS</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <span>Thuộc cơ sở hiện tại</span>
              </div>
            </div>

            {/* KPI 4: Điểm CSAT */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Đánh giá CSAT</span>
                <div className="w-8 h-8 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Star className="w-4 h-4 fill-amber-400" />
                </div>
              </div>
              <div className="text-xl font-black font-mono text-slate-900 tracking-tight">
                4.8 <span className="text-xs font-normal text-slate-400">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                <span>96% hài lòng chất lượng</span>
              </div>
            </div>
          </div>

          {/* 4. Weekly Revenue Trend Bar Chart */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Doanh thu 7 ngày trong tuần</h4>
                <p className="text-[10px] text-slate-400">Chạm vào từng cột để xem chi tiết ngày</p>
              </div>
              <span className="text-[10px] font-bold text-[#0057b8] bg-[#EFF6FF] border border-[#0057b8]/20 px-2 py-0.5 rounded-lg font-mono">
                {timeSeries.labels?.[selectedBarIndex] || 'Hôm nay'}:{' '}
                {formatVND(timeSeries.data?.[selectedBarIndex] || 0)}
              </span>
            </div>

            {/* Bar Chart Visualization */}
            <div className="pt-2">
              <div className="h-28 flex items-end justify-between gap-2 px-1">
                {timeSeries.labels.map((lbl: string, idx: number) => {
                  const val = timeSeries.data[idx] || 0;
                  const maxVal = Math.max(...timeSeries.data, 1);
                  const heightPercent = Math.max(12, Math.round((val / maxVal) * 100));
                  const isToday = idx === 6;
                  const isSelected = selectedBarIndex === idx;

                  return (
                    <div
                      key={lbl}
                      onClick={() => setSelectedBarIndex(idx)}
                      className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer group"
                    >
                      <div className="w-full flex items-end justify-center h-20">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[28px] rounded-t-xl transition-all duration-300 ${
                            isSelected
                              ? 'bg-[#0057b8] shadow-xs'
                              : isToday
                              ? 'bg-[#0057b8] hover:bg-[#003E82]'
                              : 'bg-slate-200 hover:bg-slate-300'
                          }`}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-mono ${
                          isSelected || isToday ? 'font-bold text-[#0057b8]' : 'text-slate-400'
                        }`}
                      >
                        {lbl}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 5. Phân bổ theo 3 Ca Ăn (Sáng - Trưa - Tối) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4.5 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900">Phân bổ theo ca phục vụ</h4>

            <div className="space-y-2.5">
              {/* Ca Sáng */}
              <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">Ca Sáng</span>
                      <span className="text-[10px] text-slate-400 font-mono">(06:30 – 08:30)</span>
                    </div>
                    <span className="text-[11px] text-slate-500">45 suất • Bánh mì ốp la, Phở gà</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold font-mono text-slate-900">{formatVND(1125000)}</div>
                  <span className="text-[10px] text-emerald-600 font-medium">Hoàn tất</span>
                </div>
              </div>

              {/* Ca Trưa */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">Ca Trưa</span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded-md">
                        Chủ lực 75%
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">260 suất • Cơm sườn bì chả, Canh chua</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold font-mono text-slate-900">{formatVND(6500000)}</div>
                  <span className="text-[10px] text-emerald-600 font-medium">Hoàn tất</span>
                </div>
              </div>

              {/* Ca Tối */}
              <div className="p-3.5 rounded-2xl bg-sky-50/50 border border-sky-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-sky-500/10 text-[#0057b8] flex items-center justify-center font-bold text-xs">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">Ca Tối</span>
                      <span className="text-[10px] text-slate-400 font-mono">(17:00 – 19:00)</span>
                    </div>
                    <span className="text-[11px] text-slate-500">51 suất • Cơm bò xào, Canh rong biển</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold font-mono text-slate-900">{formatVND(1052000)}</div>
                  <span className="text-[10px] text-sky-600 font-medium">Đang phục vụ</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Đối Soát & Dòng Tiền Về Cơ Sở */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900">Đối soát & Dòng tiền cơ sở</h4>
              <span className="text-[10.5px] font-bold text-slate-500 font-mono">
                Số dư: {formatVND(balance.availableBalance > 0 ? balance.availableBalance : balance.totalRevenue)}
              </span>
            </div>

            <div className="space-y-2">
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
                <div
                  key={w.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 line-clamp-1">{w.description}</p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(w.createdAt).toLocaleDateString('vi-VN')} • VietinBank Cơ sở 1
                    </span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-xs font-bold font-mono text-emerald-600">+{formatVND(w.amount)}</div>
                    <span className="text-[9.5px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium">
                      Đã thanh toán
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10.5px] text-slate-400 italic text-center pt-1">
              Doanh thu được đối soát tự động hàng tuần chuyển về tài khoản ngân hàng của cơ sở.
            </p>
          </div>

          {/* 6.5 DỰ BÁO BẾP & ĐỊNH MỨC NGUYÊN LIỆU BOM THEO CA ĂN */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4.5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-900">Dự báo Bếp & Định mức BOM ca ăn</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#EFF6FF] text-[#0057b8]">
                      {selectedMealType === 'BREAKFAST' ? 'Ca Sáng' : selectedMealType === 'DINNER' ? 'Ca Tối' : 'Ca Trưa'}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 font-medium truncate">
                    Tính toán theo số lượng học sinh & phụ huynh đặt trước
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowForecastModal(true)}
                className="text-xs font-bold text-[#0057b8] hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer"
              >
                Chi tiết &gt;
              </button>
            </div>

            {/* Quick 3 metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#F7FAFE] p-3 rounded-2xl border border-slate-100 text-center space-y-0.5">
                <span className="text-[10px] text-slate-500 font-medium block">Suất đặt lẻ</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  {overviewForecast?.totalSingleOrders ?? 133}
                </span>
                <span className="text-[9px] text-slate-400 block">qua App</span>
              </div>

              <div className="bg-[#F7FAFE] p-3 rounded-2xl border border-slate-100 text-center space-y-0.5">
                <span className="text-[10px] text-slate-500 font-medium block">Vé tháng</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  {overviewForecast?.packageServingEstimate ?? 32}
                </span>
                <span className="text-[9px] text-slate-400 block">bán trú</span>
              </div>

              <div className="bg-[#0057b8] text-white p-3 rounded-2xl text-center space-y-0.5 shadow-2xs">
                <span className="text-[10px] text-white/90 font-bold block">Bếp cần nấu</span>
                <span className="text-base font-black text-white font-mono">
                  {overviewForecast
                    ? Math.round(overviewForecast.totalEstimatedServings * (1 + (overviewForecast.bufferMarginPercent || 0) / 100))
                    : 185}
                </span>
                <span className="text-[9px] text-white/80 block">
                  +{overviewForecast?.bufferMarginPercent ?? 12}% dôi dư
                </span>
              </div>
            </div>

            {/* Stock alert pill + View BOM Action */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                {(overviewForecast?.ingredientsForecast?.filter((i: any) => i.isShortage)?.length ?? 0) > 0 ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="text-rose-600 font-bold">
                      Thiếu {overviewForecast.ingredientsForecast.filter((i: any) => i.isShortage).length} nguyên liệu kho
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-emerald-700">Tồn kho đủ định mức nấu ca này</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowForecastModal(true)}
                className="py-1.5 px-3 rounded-xl bg-[#0057b8] hover:bg-[#003E82] text-white text-[11px] font-bold transition shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <span>Xem định mức BOM</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 7. Quick Operations Shortcuts with RBAC Lock Badges */}
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => onNavigateTab('scan')}
              className="p-2.5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#0057b8]/40 text-center shadow-2xs transition cursor-pointer flex flex-col items-center justify-center gap-1.5 group relative active:scale-95"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0057b8] group-hover:scale-105 transition flex items-center justify-center">
                <ScanLine className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-900">Quét QR</span>
              {!hasPermission('SERVING_OPERATION') && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px]">
                  <Lock className="w-2 h-2" />
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="p-2.5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#0057b8]/40 text-center shadow-2xs transition cursor-pointer flex flex-col items-center justify-center gap-1.5 group relative active:scale-95"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0057b8] group-hover:scale-105 transition flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-900">Người dùng</span>
            </button>

            <button
              type="button"
              onClick={() => setShowForecastModal(true)}
              className="p-2.5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#0057b8]/40 text-center shadow-2xs transition cursor-pointer flex flex-col items-center justify-center gap-1.5 group relative active:scale-95"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-900">Dự báo BOM</span>
              {!(hasPermission('INVENTORY_MANAGEMENT') || hasPermission('CANTEEN_CONFIG')) && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px]">
                  <Lock className="w-2 h-2" />
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('feedbacks')}
              className="p-2.5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#0057b8]/40 text-center shadow-2xs transition cursor-pointer flex flex-col items-center justify-center gap-1.5 group relative active:scale-95"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0057b8] group-hover:scale-105 transition flex items-center justify-center">
                <MessageSquareHeart className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-900">Xem CSAT</span>
              {!hasPermission('FEEDBACK_RESOLVE') && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px]">
                  <Lock className="w-2 h-2" />
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="p-2.5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#0057b8]/40 text-center shadow-2xs transition cursor-pointer flex flex-col items-center justify-center gap-1.5 group relative active:scale-95"
            >
              <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#0057b8] group-hover:scale-105 transition flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-900">Cấu hình</span>
              {!hasPermission('CANTEEN_CONFIG') && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px]">
                  <Lock className="w-2 h-2" />
                </span>
              )}
            </button>
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

          {/* 1. Header Card with Branch Name & Live Stats */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4.5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900">Thực Đơn Theo Ngày</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#0057b8] border border-[#0057b8]/20 font-bold">
                    {dishStats.total} món cơ sở
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[220px]">
                  {selectedCanteen?.name || 'Cơ sở hiện tại'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchBranchDailyMenu}
                  disabled={loadingBranchMenu}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50 transition active:scale-95"
                  title="Làm mới thực đơn ngày"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loadingBranchMenu ? 'animate-spin text-[#0057b8]' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={openCreateDishModal}
                  className="px-3 py-2 rounded-xl bg-[#0057b8] hover:bg-[#003E82] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm món</span>
                </button>
              </div>
            </div>

            {/* Quick Date Selector (Horizontal 7-day strip) */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-[#0057b8]" />
                  <span>{selectedDayInfo.dayFullLabel}, {selectedDayInfo.dayMonth}</span>
                  {selectedDayInfo.isToday && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      Hôm nay
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedMenuDate(todayStr)}
                    className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition active:scale-95 ${
                      selectedMenuDate === todayStr
                        ? 'bg-[#0057b8] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Hôm nay
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((d) => {
                  const isSelected = d.dateStr === selectedMenuDate;
                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => setSelectedMenuDate(d.dateStr)}
                      className={`p-2 rounded-xl text-center transition cursor-pointer border active:scale-95 ${
                        isSelected
                          ? 'bg-[#0057b8] text-white border-[#0057b8] shadow-xs'
                          : d.isToday
                          ? 'bg-blue-50/70 border-blue-200 text-slate-800'
                          : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <p className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                        {d.dayLabel}
                      </p>
                      <p className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {d.dayMonth.split('/')[0]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Meal Shift Filter Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl text-xs">
              {[
                { key: 'ALL', label: 'Tất cả ca' },
                { key: 'BREAKFAST', label: 'Bữa Sáng' },
                { key: 'LUNCH', label: 'Bữa Trưa' },
                { key: 'DINNER', label: 'Bữa Chiều' },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSelectedMealSlot(s.key as any)}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-bold text-center cursor-pointer transition active:scale-95 ${
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
            <div className="space-y-4">
              {/* MEAL SHIFT 1: BỮA SÁNG */}
              {(selectedMealSlot === 'ALL' || selectedMealSlot === 'BREAKFAST') && (() => {
                const status = getSlotCutoffStatus('BREAKFAST');
                const dishes = getDishesForSlot('BREAKFAST');
                const isCustomMenu = hasSpecificSlotMenu('BREAKFAST');
                return (
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
                    {/* Shift Header Banner */}
                    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-2xs">
                          <Sunrise className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-xs font-bold text-slate-900">Bữa Sáng</h5>
                            <span className="text-[10px] text-slate-500 font-mono">(06:30 - 08:30)</span>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {isCustomMenu ? 'Thực đơn đã lên lịch' : 'Danh mục món ăn cơ sở'} • Chốt {status.cutoffTime}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block ${status.badgeClass}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Shift Dishes List */}
                    <div className="p-3.5 divide-y divide-slate-100 space-y-3">
                      {dishes.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          Chưa có món ăn nào trong thực đơn ca sáng này.
                        </div>
                      ) : (
                        dishes.map((dish: any) => (
                          <div key={dish.id} className="pt-3 first:pt-0 flex items-start gap-3">
                            {/* Dish Real Photo Thumbnail */}
                            <div className="relative w-18 h-18 rounded-2xl overflow-hidden shrink-0 border border-slate-200/80 bg-slate-100 group shadow-2xs">
                              {dish.image ? (
                                <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center text-slate-400">
                                  <ImageIcon className="w-5 h-5 text-slate-300" />
                                  <span className="text-[8px] font-semibold text-slate-400 mt-0.5">Chưa có ảnh</span>
                                </div>
                              )}

                              {dish.image && (
                                <span className="absolute top-1 left-1 bg-emerald-600/90 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full shadow-2xs">
                                  Ảnh thật
                                </span>
                              )}

                              {/* Camera icon button */}
                              <button
                                type="button"
                                onClick={() => triggerCameraUpload(dish)}
                                className="absolute bottom-1 right-1 p-1 rounded-lg bg-black/60 text-white hover:bg-black/80 transition cursor-pointer shadow-xs active:scale-95"
                                title="Chụp ảnh thực tế món ăn"
                              >
                                <Camera className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Dish Info & Actions */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1.5">
                                <h6 className="text-xs font-bold text-slate-900 truncate">{dish.name}</h6>
                                <span className="text-[10.5px] font-bold text-[#0057b8] shrink-0 font-mono">
                                  {Number(dish.extraPrice) > 0 ? `+${new Intl.NumberFormat('vi-VN').format(Number(dish.extraPrice))}đ` : 'Suất chuẩn'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-700">
                                  {getCategoryLabel(dish.category)}
                                </span>
                                {dish.description && (
                                  <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                    {dish.description}
                                  </span>
                                )}
                              </div>

                              {/* Camera Action Buttons */}
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => triggerCameraUpload(dish)}
                                  className="px-2.5 py-1 rounded-xl bg-blue-50 text-[#0057b8] border border-blue-200 text-[10.5px] font-bold flex items-center gap-1 hover:bg-blue-100 cursor-pointer transition shadow-2xs active:scale-95"
                                >
                                  <Camera className="w-3 h-3" />
                                  <span>{dish.image ? 'Đổi ảnh thực tế' : 'Chụp ảnh món'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditDishModal(dish)}
                                  className="px-2.5 py-1 rounded-xl border border-slate-200 text-slate-700 text-[10.5px] font-medium flex items-center gap-1 hover:bg-slate-50 cursor-pointer transition active:scale-95"
                                >
                                  <Edit3 className="w-3 h-3 text-slate-500" />
                                  <span>Sửa</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* MEAL SHIFT 2: BỮA TRƯA */}
              {(selectedMealSlot === 'ALL' || selectedMealSlot === 'LUNCH') && (() => {
                const status = getSlotCutoffStatus('LUNCH');
                const dishes = getDishesForSlot('LUNCH');
                const isCustomMenu = hasSpecificSlotMenu('LUNCH');
                return (
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
                    {/* Shift Header Banner */}
                    <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/5 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-[#0057b8] text-white flex items-center justify-center font-bold shadow-2xs">
                          <Sun className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-xs font-bold text-slate-900">Bữa Trưa</h5>
                            <span className="text-[10px] text-slate-500 font-mono">(11:00 - 13:00)</span>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {isCustomMenu ? 'Thực đơn đã lên lịch' : 'Danh mục món ăn cơ sở'} • Chốt {status.cutoffTime}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block ${status.badgeClass}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Shift Dishes List */}
                    <div className="p-3.5 divide-y divide-slate-100 space-y-3">
                      {dishes.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          Chưa có món ăn nào trong thực đơn ca trưa này.
                        </div>
                      ) : (
                        dishes.map((dish: any) => (
                          <div key={dish.id} className="pt-3 first:pt-0 flex items-start gap-3">
                            {/* Dish Real Photo Thumbnail */}
                            <div className="relative w-18 h-18 rounded-2xl overflow-hidden shrink-0 border border-slate-200/80 bg-slate-100 group shadow-2xs">
                              {dish.image ? (
                                <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center text-slate-400">
                                  <ImageIcon className="w-5 h-5 text-slate-300" />
                                  <span className="text-[8px] font-semibold text-slate-400 mt-0.5">Chưa có ảnh</span>
                                </div>
                              )}

                              {dish.image && (
                                <span className="absolute top-1 left-1 bg-emerald-600/90 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full shadow-2xs">
                                  Ảnh thật
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => triggerCameraUpload(dish)}
                                className="absolute bottom-1 right-1 p-1 rounded-lg bg-black/60 text-white hover:bg-black/80 transition cursor-pointer shadow-xs active:scale-95"
                                title="Chụp ảnh thực tế món ăn"
                              >
                                <Camera className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Dish Info & Actions */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1.5">
                                <h6 className="text-xs font-bold text-slate-900 truncate">{dish.name}</h6>
                                <span className="text-[10.5px] font-bold text-[#0057b8] shrink-0 font-mono">
                                  {Number(dish.extraPrice) > 0 ? `+${new Intl.NumberFormat('vi-VN').format(Number(dish.extraPrice))}đ` : 'Suất chuẩn'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-700">
                                  {getCategoryLabel(dish.category)}
                                </span>
                                {dish.description && (
                                  <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                    {dish.description}
                                  </span>
                                )}
                              </div>

                              {/* Camera Action Buttons */}
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => triggerCameraUpload(dish)}
                                  className="px-2.5 py-1 rounded-xl bg-blue-50 text-[#0057b8] border border-blue-200 text-[10.5px] font-bold flex items-center gap-1 hover:bg-blue-100 cursor-pointer transition shadow-2xs active:scale-95"
                                >
                                  <Camera className="w-3 h-3" />
                                  <span>{dish.image ? 'Đổi ảnh thực tế' : 'Chụp ảnh món'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditDishModal(dish)}
                                  className="px-2.5 py-1 rounded-xl border border-slate-200 text-slate-700 text-[10.5px] font-medium flex items-center gap-1 hover:bg-slate-50 cursor-pointer transition active:scale-95"
                                >
                                  <Edit3 className="w-3 h-3 text-slate-500" />
                                  <span>Sửa</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* MEAL SHIFT 3: BỮA CHIỀU / TỐI */}
              {(selectedMealSlot === 'ALL' || selectedMealSlot === 'DINNER') && (() => {
                const status = getSlotCutoffStatus('DINNER');
                const dishes = getDishesForSlot('DINNER');
                const isCustomMenu = hasSpecificSlotMenu('DINNER');
                return (
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
                    {/* Shift Header Banner */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/5 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-2xs">
                          <Moon className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-xs font-bold text-slate-900">Bữa Chiều / Tối</h5>
                            <span className="text-[10px] text-slate-500 font-mono">(17:00 - 19:00)</span>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {isCustomMenu ? 'Thực đơn đã lên lịch' : 'Danh mục món ăn cơ sở'} • Chốt {status.cutoffTime}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block ${status.badgeClass}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Shift Dishes List */}
                    <div className="p-3.5 divide-y divide-slate-100 space-y-3">
                      {dishes.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          Chưa có món ăn nào trong thực đơn ca chiều này.
                        </div>
                      ) : (
                        dishes.map((dish: any) => (
                          <div key={dish.id} className="pt-3 first:pt-0 flex items-start gap-3">
                            {/* Dish Real Photo Thumbnail */}
                            <div className="relative w-18 h-18 rounded-2xl overflow-hidden shrink-0 border border-slate-200/80 bg-slate-100 group shadow-2xs">
                              {dish.image ? (
                                <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center text-slate-400">
                                  <ImageIcon className="w-5 h-5 text-slate-300" />
                                  <span className="text-[8px] font-semibold text-slate-400 mt-0.5">Chưa có ảnh</span>
                                </div>
                              )}

                              {dish.image && (
                                <span className="absolute top-1 left-1 bg-emerald-600/90 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full shadow-2xs">
                                  Ảnh thật
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => triggerCameraUpload(dish)}
                                className="absolute bottom-1 right-1 p-1 rounded-lg bg-black/60 text-white hover:bg-black/80 transition cursor-pointer shadow-xs active:scale-95"
                                title="Chụp ảnh thực tế món ăn"
                              >
                                <Camera className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Dish Info & Actions */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1.5">
                                <h6 className="text-xs font-bold text-slate-900 truncate">{dish.name}</h6>
                                <span className="text-[10.5px] font-bold text-[#0057b8] shrink-0 font-mono">
                                  {Number(dish.extraPrice) > 0 ? `+${new Intl.NumberFormat('vi-VN').format(Number(dish.extraPrice))}đ` : 'Suất chuẩn'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-700">
                                  {getCategoryLabel(dish.category)}
                                </span>
                                {dish.description && (
                                  <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                    {dish.description}
                                  </span>
                                )}
                              </div>

                              {/* Camera Action Buttons */}
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => triggerCameraUpload(dish)}
                                  className="px-2.5 py-1 rounded-xl bg-blue-50 text-[#0057b8] border border-blue-200 text-[10.5px] font-bold flex items-center gap-1 hover:bg-blue-100 cursor-pointer transition shadow-2xs active:scale-95"
                                >
                                  <Camera className="w-3 h-3" />
                                  <span>{dish.image ? 'Đổi ảnh thực tế' : 'Chụp ảnh món'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditDishModal(dish)}
                                  className="px-2.5 py-1 rounded-xl border border-slate-200 text-slate-700 text-[10.5px] font-medium flex items-center gap-1 hover:bg-slate-50 cursor-pointer transition active:scale-95"
                                >
                                  <Edit3 className="w-3 h-3 text-slate-500" />
                                  <span>Sửa</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* VIEW 1: QR SCANNER & MANUAL TOKEN INPUT */}
      {currentView === 'scan' && (
        <div className="space-y-4">
          {!hasPermission('SERVING_OPERATION') ? (
            <div className="bg-amber-50 border border-amber-200/80 rounded-3xl p-6 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">Chức năng Quét QR bị khóa</h4>
                <p className="text-xs text-amber-800 leading-relaxed max-w-sm mx-auto">
                  Tài khoản của bạn chưa được cấp quyền <strong>Vận hành quầy gắp & Check-in (SERVING_OPERATION)</strong> trên Web Admin. Vui lòng liên hệ Quản trị viên để được cấp quyền.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4.5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center">
                    <ScanLine className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Quét QR nhận cơm học sinh</h4>
                </div>
              <button
                onClick={() => setIsCameraActive((prev) => !prev)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ${
                  isCameraActive
                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                    : 'bg-[#EFF6FF] text-[#0057b8] border border-[#0057b8]/20 hover:bg-sky-100'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                {isCameraActive ? 'Tắt camera' : 'Bật camera'}
              </button>
            </div>

            {/* Camera Viewfinder with laser & visual feedback */}
            {isCameraActive && (
              <div className="space-y-2">
                {cameraError ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-amber-900 font-medium leading-relaxed">
                      {cameraError}
                    </p>
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
                    >
                      Thử bật lại camera
                    </button>
                  </div>
                ) : (
                  <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border-2 border-slate-700 shadow-inner">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                      muted
                    />

                    {/* Laser Scanner Sweep Animation */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center">
                      <div className="relative w-52 h-52 border-2 border-cyan-400/60 rounded-2xl">
                        {/* 4 Corner Markers */}
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-cyan-400 rounded-tl-sm" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-cyan-400 rounded-tr-sm" />
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-cyan-400 rounded-bl-sm" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-cyan-400 rounded-br-sm" />

                        {/* Animated Laser Sweep Line */}
                        <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_12px_#22d3ee] animate-bounce" />
                      </div>
                    </div>

                    {/* Scan Success Green Flash */}
                    {scanFlash && (
                      <div className="absolute inset-0 bg-emerald-500/35 border-4 border-emerald-400 pointer-events-none animate-pulse flex items-center justify-center">
                        <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Đã nhận diện mã QR!</span>
                        </div>
                      </div>
                    )}

                    {/* Active Scanning Badge */}
                    <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md text-emerald-400 text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Camera đang tìm mã QR...</span>
                    </div>

                    {/* Submitting Loading Badge */}
                    {isSubmittingToken && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
                        <div className="bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-xl flex items-center gap-2 shadow-xl">
                          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-bold">Đang kiểm tra mã...</span>
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-2 bg-black/70 backdrop-blur-xs text-white text-[10px] px-3 py-1 rounded-full border border-white/10">
                      Đưa mã QR trên máy học sinh vào khung ngắm
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual QR Token Input (For fast browser/computer demo) */}
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>Nhập mã QR Token thủ công (Thuận tiện khi demo trên máy tính):</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Dán mã QR Token hoặc mã HS..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-medium focus:outline-none focus:border-[#0057b8] focus:ring-1 focus:ring-[#0057b8] transition"
                />
                <button
                  type="button"
                  onClick={() => handleManualCheckin()}
                  disabled={isSubmittingToken || !manualToken.trim()}
                  className="py-2.5 px-4 bg-[#0057b8] hover:bg-[#003E82] text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 shrink-0 shadow-xs active:scale-95"
                >
                  {isSubmittingToken ? 'Đang kiểm tra...' : 'Xác nhận'}
                </button>
              </div>
            </div>

            {/* Scan Result Feedback Card */}
            {scanResult && (
              <div
                className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                  scanResult.success
                    ? 'bg-[#EFF6FF] border-[#0057b8]/30 text-slate-900 ring-1 ring-[#0057b8]/20'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {scanResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-[#0057b8] shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span className="text-xs font-bold">{scanResult.message}</span>
                  </div>
                  <button onClick={() => setScanResult(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {scanResult.success && (
                  <div className="text-xs space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-900">
                      Đã xác nhận suất ăn thành công cho học sinh!
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-600">
                      <span>Ca ăn: {selectedMealType}</span>
                      <span>•</span>
                      <span>Trạng thái: Đã phát khay</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick 1-Tap Check-In: Danh sách suất ăn hôm nay */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-emerald-600" />
                  <h5 className="text-xs font-bold text-slate-800">
                    Đơn nhận cơm hôm nay ({todayCanteenOrders.filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED').length} chờ nhận)
                  </h5>
                </div>
                <button
                  type="button"
                  onClick={fetchTodayCanteenOrders}
                  disabled={loadingTodayCanteenOrders}
                  className="text-[11px] text-[#0057b8] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RotateCw className={`w-3 h-3 ${loadingTodayCanteenOrders ? 'animate-spin' : ''}`} />
                  <span>Làm mới</span>
                </button>
              </div>

              {loadingTodayCanteenOrders ? (
                <div className="py-6 text-center text-xs text-slate-400">Đang tải danh sách đơn...</div>
              ) : todayCanteenOrders.length === 0 ? (
                <div className="py-4 px-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-center text-xs text-slate-500">
                  Chưa có đơn đặt món nào cho hôm nay tại cơ sở này.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {todayCanteenOrders.map((ord: any) => {
                    const isCompleted = ord.status === 'COMPLETED' || ord.status === 'SERVED';
                    const dishNames = (ord.items || []).map((it: any) => it.dish?.name || 'Món ăn').join(', ');
                    const shortCode = ord.id.substring(0, 6).toUpperCase();
                    const mealLabel = ord.mealType === 'BREAKFAST' ? 'Sáng' : ord.mealType === 'DINNER' ? 'Chiều' : 'Trưa';

                    return (
                      <div
                        key={ord.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition ${
                          isCompleted
                            ? 'bg-slate-50/70 border-slate-200/80 opacity-60'
                            : 'bg-white border-slate-200/80 shadow-2xs hover:border-[#0057b8]/40'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {ord.user?.fullName || 'Học sinh'}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#EFF6FF] text-[#0057b8] font-bold rounded-md">
                              #{shortCode}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-md">
                              {mealLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate" title={dishNames}>
                            {dishNames || 'Combo suất ăn tiêu chuẩn'}
                          </p>
                        </div>

                        <div className="shrink-0">
                          {isCompleted ? (
                            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-xl">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Đã nhận cơm</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleManualCheckin(ord.id)}
                              disabled={isSubmittingToken}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs active:scale-95"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Phát khay</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Quick jump to Serving Queue */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4.5 shadow-2xs flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Quản lý hàng đợi gắp món</h4>
              <p className="text-[11px] text-slate-500">
                Hiện có {waitingQueue.length} khách đang đợi gắp món
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('users')}
              className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            >
              <span>Xem người dùng</span>
              <Users className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: BRANCH USERS / CUSTOMERS MANAGEMENT (Học sinh & Phụ huynh cơ sở) */}
      {currentView === 'users' && (
        <div className="space-y-3.5 pb-6">
          {/* Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900">Tài khoản & Học sinh</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                    {filteredBranchUsers.length} người dùng
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cơ sở: <strong className="text-slate-800 font-semibold">{selectedCanteen?.name || 'Cơ sở hiện tại'}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={fetchBranchUsers}
                disabled={loadingBranchUsers}
                className="p-2 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer active:scale-95"
                title="Làm mới danh sách"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loadingBranchUsers ? 'animate-spin text-[#0057b8]' : ''}`} />
              </button>
            </div>

            {/* Metric Chips */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-center">
              <div className="bg-slate-50 p-2.5 rounded-2xl">
                <span className="text-[10px] text-slate-500 block">Học sinh</span>
                <span className="text-xs font-bold font-mono text-slate-900">{customerStats.totalStudents}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-2xl">
                <span className="text-[10px] text-slate-500 block">Phụ huynh</span>
                <span className="text-xs font-bold font-mono text-slate-900">{customerStats.totalParents}</span>
              </div>
              <div className="bg-emerald-50/60 p-2.5 rounded-2xl border border-emerald-100">
                <span className="text-[10px] text-emerald-700 block">Vé tháng</span>
                <span className="text-xs font-bold font-mono text-emerald-800">{customerStats.activeSubCount}</span>
              </div>
            </div>
          </div>

          {/* Search Input & Role Filter Tabs */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, email, SĐT, mã HS..."
                className="w-full pl-10 pr-3.5 h-10 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0057b8] focus:ring-1 focus:ring-[#0057b8] transition shadow-2xs"
              />
            </div>

            {/* Segmented Filter */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-medium">
              {[
                { id: 'ALL', label: `Tất cả (${customerStats.totalStudents + customerStats.totalParents})` },
                { id: 'USER', label: `Học sinh (${customerStats.totalStudents})` },
                { id: 'PARENT', label: `Phụ huynh (${customerStats.totalParents})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setUserRoleFilter(tab.id as any)}
                  className={`py-1.5 text-[11px] rounded-xl transition cursor-pointer text-center active:scale-95 ${
                    userRoleFilter === tab.id
                      ? 'bg-white text-[#0057b8] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* User List */}
          {loadingBranchUsers ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3.5 bg-white border border-slate-200/80 rounded-2xl space-y-2 animate-pulse shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                      <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBranchUsers.length === 0 ? (
            <div className="py-12 px-4 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-500 space-y-1 shadow-2xs">
              <Users className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-700">Không tìm thấy tài khoản phù hợp</p>
              <p className="text-[11px] text-slate-400">Thử tìm bằng từ khóa khác hoặc chuyển sang tab khác.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBranchUsers.map((u: any) => {
                const studentLink = u.studentLinks?.[0];
                const parentLink = u.parentLinks?.[0];
                const activeSub = u.subscriptions?.[0];

                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUserDetail(u)}
                    className="p-3.5 bg-white border border-slate-200/80 rounded-2xl hover:border-[#0057b8]/30 transition-all shadow-2xs space-y-2 cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                          {u.fullName?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 truncate">{u.fullName}</span>
                            {u.role === 'USER' ? (
                              <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 text-[9.5px] font-semibold border border-emerald-200">
                                Học sinh
                              </span>
                            ) : u.role === 'PARENT' ? (
                              <span className="px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 text-[9.5px] font-semibold border border-amber-200">
                                Phụ huynh
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-[#0057b8] text-[9.5px] font-semibold border border-blue-200">
                                Nhân viên
                              </span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-slate-500 font-mono truncate mt-0.5">
                            {u.phone || u.email}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Wallet / Subscription or Status */}
                      <div className="text-right shrink-0">
                        {u.role === 'USER' ? (
                          <div>
                            <div className="text-xs font-bold font-mono text-slate-900">
                              {formatVND(Number(u.wallet?.balance || 0))}
                            </div>
                            {activeSub ? (
                              <span className="text-[10px] text-emerald-700 font-semibold inline-flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" /> Còn {activeSub.remainingCredits} suất
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Chưa có gói</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 font-medium">
                            {u.isActive ? (
                              <span className="text-emerald-600 font-semibold">● Hoạt động</span>
                            ) : (
                              <span className="text-slate-400">● Đã khóa</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata Sub-row */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500">
                      {u.role === 'USER' && (
                        <>
                          <div className="flex items-center gap-1 font-mono text-slate-700">
                            <QrCode className="w-3 h-3 text-[#0057b8]" />
                            <span>{studentLink?.studentCode || 'HS-2026-0098'}</span>
                          </div>
                          {studentLink?.parent ? (
                            <span className="truncate max-w-[170px]">PH: {studentLink.parent.fullName}</span>
                          ) : (
                            <span className="text-slate-400">Chưa liên kết phụ huynh</span>
                          )}
                        </>
                      )}

                      {u.role === 'PARENT' && (
                        <>
                          <span>
                            Con: <strong className="text-slate-800">{parentLink?.student?.fullName || 'Nguyễn Văn An'}</strong>
                          </span>
                          <span className="font-mono text-slate-600">({parentLink?.studentCode || 'HS-2026-0098'})</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* User Detail Bottom Sheet Modal */}
          {selectedUserDetail && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs p-0 animate-in fade-in duration-200">
              <div className="bg-white rounded-t-3xl max-w-md w-full p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto modal-scrollable touch-pan-y">
                <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1" />
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
                          {selectedUserDetail.subscriptions?.[0] ? `Còn ${selectedUserDetail.subscriptions[0].remainingCredits} suất ăn` : 'Chưa đăng ký'}
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
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
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
                      {new Date(fb.createdAt || Date.now()).toLocaleDateString('vi-VN')}
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
      {/* PHOTO PREVIEW & UPLOAD BOTTOM SHEET MODAL */}
      {showPhotoModal && photoTargetDish && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPhotoModal(false);
          }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[60] flex items-end justify-center animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-3xl p-5 pb-8 space-y-4 max-h-[85vh] overflow-y-auto modal-scrollable touch-pan-y shadow-2xl animate-in slide-in-from-bottom duration-200 border-t border-slate-100"
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1" />

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
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center shadow-inner">
              {photoPreviewUrl ? (
                <img
                  src={photoPreviewUrl}
                  alt={photoTargetDish.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <p className="text-xs text-white">Chưa có ảnh</p>
              )}
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

      {/* DISH CREATE / EDIT MODAL */}
      {showDishModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDishModal(false);
          }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[60] flex items-end justify-center animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-3xl p-5 pb-8 space-y-4 max-h-[85vh] overflow-y-auto modal-scrollable touch-pan-y shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1" />

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
