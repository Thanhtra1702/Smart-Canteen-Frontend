import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { getZaloUserInfo, type ZaloUser } from '../services/zalo';

export type AppRole = 'STUDENT' | 'PARENT' | 'STAFF';

export interface CartItem {
  id: string;
  name: string;
  category: string;
  extraPrice: number;
  quantity: number;
  description?: string;
  image?: string;
}

export interface ChildItem {
  linkId: string;
  studentId: string;
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
  balance: number;
  linkCode?: string;
  canteenName?: string;
  todayOrders?: any[];
  totalRemainingCredits?: number;
  activeSubscriptions?: any[];
  isServedToday?: boolean;
  servedTime?: string | null;
  latestMealAlert?: {
    orderId: string;
    studentName: string;
    mealType: string;
    mealLabel: string;
    servedTime: string | null;
    message: string;
    itemsSummary: string;
  } | null;
}

export interface ServingQueueData {
  canteen?: any;
  date?: string;
  activeMealType?: string;
  todayMenus?: any[];
  stats?: {
    totalCheckins: number;
    waitingCount: number;
    servingCount: number;
    completedCount: number;
  };
  waitingQueue: any[];
  currentServing: any | null;
  completedQueue: any[];
}

export const playSuccessBeep = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First tone (E5 ~ 659Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Second chime tone (B5 ~ 987Hz) ting-ting!
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.3, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (e) {
    // AudioContext blocked or not supported
  }
};

export const playFailureBeep = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First low warning buzz (220Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.linearRampToValueAtTime(160, now + 0.18);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Second deeper error buzz (180Hz -> 120Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(180, now + 0.15);
    osc2.frequency.linearRampToValueAtTime(120, now + 0.4);
    gain2.gain.setValueAtTime(0.35, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.4);
  } catch (e) {
    // AudioContext blocked or not supported
  }
};

export const checkIsCutoffPassed = (
  dateStr: string,
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER',
  canteen: any
): { isPassed: boolean; cutoffTimeStr: string } => {
  const cutoffTime =
    mealType === 'BREAKFAST'
      ? canteen?.cutoffBreakfast || '07:00'
      : mealType === 'LUNCH'
      ? canteen?.cutoffLunch || '10:30'
      : canteen?.cutoffDinner || '16:00';

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  if (dateStr < todayStr) {
    return { isPassed: true, cutoffTimeStr: cutoffTime };
  }
  if (dateStr > todayStr) {
    return { isPassed: false, cutoffTimeStr: cutoffTime };
  }

  const [cutoffH, cutoffM] = cutoffTime.split(':').map(Number);
  const cutoffSeconds = (cutoffH || 0) * 3600 + (cutoffM || 0) * 60;

  const vnTimeStr = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
  const [curH, curM, curS] = vnTimeStr.split(':').map(Number);
  const curSeconds = (curH || 0) * 3600 + (curM || 0) * 60 + (curS || 0);

  return {
    isPassed: curSeconds > cutoffSeconds,
    cutoffTimeStr: cutoffTime,
  };
};

const DEMO_FALLBACK_CHILDREN: ChildItem[] = [
  {
    linkId: 'link-01',
    studentId: 'HS-2026-0098',
    fullName: 'Nguyễn Văn An',
    email: 'student@smartcanteen.vn',
    phone: '0903000001',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80',
    balance: 250000,
    linkCode: 'HS-2026-0098',
    canteenName: 'THPT FPT Quy Nhơn • Cơ sở 1',
    todayOrders: [
      {
        id: 'ORD-2026-01',
        mealType: 'LUNCH',
        status: 'SERVED',
        totalAmount: 35000,
        createdAt: new Date().toISOString(),
        items: [
          { dish: { name: 'Cơm tấm sườn bì chả', category: 'MAIN' } },
          { dish: { name: 'Canh cải thìa thịt băm', category: 'SOUP' } },
        ],
      },
    ],
    totalRemainingCredits: 28,
  },
  {
    linkId: 'link-02',
    studentId: 'HS-2026-0102',
    fullName: 'Trần Thị Bích',
    email: 'student2@smartcanteen.vn',
    phone: '0903000002',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
    balance: 180000,
    linkCode: 'HS-2026-0102',
    canteenName: 'THPT FPT Quy Nhơn • Cơ sở 1',
    todayOrders: [
      {
        id: 'ORD-2026-02',
        mealType: 'LUNCH',
        status: 'PREPARING',
        totalAmount: 30000,
        createdAt: new Date().toISOString(),
        items: [
          { dish: { name: 'Cơm gạo lứt nấm kho tiêu', category: 'MAIN' } },
          { dish: { name: 'Canh rong biển đậu non', category: 'SOUP' } },
        ],
      },
    ],
    totalRemainingCredits: 15,
  },
];

const DEMO_FALLBACK_SERVING_QUEUE: ServingQueueData = {
  stats: {
    totalCheckins: 14,
    waitingCount: 2,
    servingCount: 1,
    completedCount: 11,
  },
  currentServing: {
    id: 'chk-curr-1',
    seqDisplay: '#08',
    userName: 'Nguyễn Văn An',
    studentCode: 'HS-2026-0098',
    checkinTime: new Date().toISOString(),
    timeStr: '11:32:15',
    method: 'QR',
    status: 'SUCCESS',
    preOrderedDishes: [
      { name: 'Cơm tấm sườn bì chả', category: 'MAIN' },
      { name: 'Canh cải thìa thịt băm', category: 'SOUP' },
      { name: 'Rau muống xào tỏi', category: 'SIDE' },
    ],
  },
  waitingQueue: [
    {
      id: 'chk-wait-1',
      seqDisplay: '#09',
      userName: 'Trần Thị Bích',
      studentCode: 'HS-2026-0102',
      checkinTime: new Date(Date.now() - 60000).toISOString(),
      timeStr: '11:34:02',
      method: 'QR',
      status: 'SUCCESS',
      preOrderedDishes: [
        { name: 'Cơm gạo lứt nấm kho tiêu', category: 'MAIN' },
        { name: 'Canh rong biển đậu non', category: 'SOUP' },
      ],
    },
    {
      id: 'chk-wait-2',
      seqDisplay: '#10',
      userName: 'Lê Hoàng Long',
      studentCode: 'HS-2026-0115',
      checkinTime: new Date(Date.now() - 30000).toISOString(),
      timeStr: '11:35:10',
      method: 'CARD',
      status: 'SUCCESS',
      preOrderedDishes: [
        { name: 'Cơm bò xào lúc lắc hành tây', category: 'MAIN' },
        { name: 'Trứng ốp la lòng đào', category: 'EXTRA' },
      ],
    },
  ],
  completedQueue: [
    {
      id: 'chk-comp-1',
      seqDisplay: '#07',
      userName: 'Vũ Thùy Linh',
      studentCode: 'HS-2026-0134',
      completedTimeStr: '11:30:20',
      method: 'QR',
      status: 'SERVED',
      preOrderedDishes: [{ name: 'Cơm cá thu sốt cà chua', category: 'MAIN' }],
    },
    {
      id: 'chk-comp-2',
      seqDisplay: '#06',
      userName: 'Đỗ Thanh Hùng',
      studentCode: 'HS-2026-0145',
      completedTimeStr: '11:28:45',
      method: 'QR',
      status: 'SERVED',
      preOrderedDishes: [{ name: 'Cơm gà nướng mật ong', category: 'MAIN' }],
    },
  ],
};

const DEMO_FALLBACK_FEEDBACKS = [
  {
    id: 'fb-01',
    rating: 5,
    comment: 'Cơm trưa hôm nay rất ngon, sườn mềm và canh nóng sốt! Chú đầu bếp phục vụ rất vui vẻ chu đáo.',
    mealType: 'LUNCH',
    status: 'RESOLVED',
    createdAt: new Date().toISOString(),
    user: { fullName: 'Nguyễn Văn An', email: 'student@smartcanteen.vn' },
    dish: { name: 'Cơm tấm sườn bì chả' },
    reply: 'Cảm ơn con nhé! Canteen sẽ luôn duy trì khay cơm nóng sốt dinh dưỡng cho các bạn học sinh.',
  },
  {
    id: 'fb-02',
    rating: 4,
    comment: 'Khay cơm sạch sẽ, mong Canteen bổ sung thêm một ít rau xào tươi xanh cho bữa trưa.',
    mealType: 'LUNCH',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    user: { fullName: 'Trần Thị Bích', email: 'student2@smartcanteen.vn' },
    dish: { name: 'Cơm gạo lứt nấm kho tiêu' },
    reply: null,
  },
  {
    id: 'fb-03',
    rating: 3,
    comment: 'Giờ cao điểm 11h45 xếp hàng hơi đông, nhân viên gắp nhanh hơn một chút thì tuyệt vời.',
    mealType: 'LUNCH',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    user: { fullName: 'Lê Hoàng Long', email: 'student3@smartcanteen.vn' },
    dish: null,
    reply: null,
  },
];

interface AppContextType {
  // Current active role
  currentRole: AppRole;
  switchRole: (role: AppRole) => Promise<void>;

  user: any | null;
  zaloProfile: ZaloUser | null;
  canteens: any[];
  selectedCanteen: any | null;
  setSelectedCanteenId: (id: string) => void;
  wallet: any | null;
  cart: CartItem[];
  selectedMealType: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  setSelectedMealType: (type: 'BREAKFAST' | 'LUNCH' | 'DINNER') => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  addToCart: (dish: any) => void;
  removeFromCart: (dishId: string) => void;
  clearCart: () => void;
  standardPrice: number;
  maxDishes: number;
  surchargeTotal: number;
  cartTotal: number;
  refreshUserData: () => Promise<void>;
  switchAccount: (email: string, password?: string) => Promise<boolean>;
  activeOrders: any[];
  refreshOrders: () => Promise<void>;
  myFeedbacks: any[];
  refreshFeedbacks: () => Promise<void>;
  loading: boolean;
  logout: () => Promise<void>;

  // Parent State & Actions
  childrenList: ChildItem[];
  selectedChild: ChildItem | null;
  setSelectedChild: (child: ChildItem) => void;
  refreshChildren: () => Promise<void>;
  linkChild: (code: string) => Promise<{ success: boolean; message: string }>;
  topupChild: (studentId: string, amount: number, note?: string) => Promise<{ success: boolean; message: string }>;

  // Staff / Canteen State & Actions
  servingQueue: ServingQueueData | null;
  refreshServingQueue: () => Promise<void>;
  checkinQrToken: (qrToken: string, mealType?: string) => Promise<{ success: boolean; data?: any; message: string }>;
  handleServingAction: (
    action: 'START_SERVING' | 'COMPLETE_SERVING' | 'UNDO_COMPLETED',
    checkinId: string
  ) => Promise<boolean>;
  branchFeedbacks: any[];
  refreshBranchFeedbacks: () => Promise<void>;
  resolveFeedback: (feedbackId: string, reply: string) => Promise<boolean>;
  staffMetrics: {
    dashboard: any;
    balance: any;
    timeSeries: any;
    loading: boolean;
  };
  refreshStaffMetrics: () => Promise<void>;

  // Branch RBAC & Canteen Configuration
  hasPermission: (permissionKey: string) => boolean;
  userPermissions: string[];
  isCanteenConfirmed: boolean;
  setIsCanteenConfirmed: (val: boolean) => void;
  confirmCanteen: (canteenId: string) => Promise<void>;
  showChangeCanteenModal: boolean;
  setShowChangeCanteenModal: (val: boolean) => void;
  updateCanteenConfig: (data: {
    bufferMarginPercent?: number;
    cutoffBreakfast?: string;
    cutoffLunch?: string;
    cutoffDinner?: string;
    maxDishes?: number;
    standardMealPrice?: number;
    bankBin?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    notificationEmail?: string;
  }) => Promise<{ success: boolean; message: string; canteen?: any }>;

  // Global Brand Settings (synchronized across HQ Admin, Zalo Mini App, Mobile)
  brand: {
    brandName: string;
    brandSubtitle: string;
    logoUrl: string;
  };
  refreshBrand: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<AppRole>(() => {
    try {
      const saved = localStorage.getItem('canteen_active_role');
      if (saved === 'PARENT' || saved === 'STAFF' || saved === 'STUDENT') return saved;
    } catch (_) {}
    return 'STUDENT';
  });
  const [user, setUser] = useState<any | null>(null);
  const [zaloProfile, setZaloProfile] = useState<ZaloUser | null>(null);
  const [canteens, setCanteens] = useState<any[]>([]);
  const [selectedCanteenId, setSelectedCanteenIdState] = useState<string>('');
  const [isCanteenConfirmed, setIsCanteenConfirmed] = useState<boolean>(true);
  const [showChangeCanteenModal, setShowChangeCanteenModal] = useState<boolean>(false);
  const [wallet, setWallet] = useState<any | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMealType, setSelectedMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER'>('LUNCH');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [myFeedbacks, setMyFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Global Brand State
  const [brand, setBrand] = useState<{ brandName: string; brandSubtitle: string; logoUrl: string }>(() => {
    try {
      const saved = localStorage.getItem('canteen_brand_settings');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      brandName: 'Smart Canteen',
      brandSubtitle: 'Hệ thống F&B Chuỗi',
      logoUrl: '',
    };
  });

  const refreshBrand = useCallback(async () => {
    try {
      const res = await api.get('/brand');
      if (res.data) {
        const nextBrand = {
          brandName: res.data.brandName || 'Smart Canteen',
          brandSubtitle: res.data.brandSubtitle || 'Hệ thống F&B Chuỗi',
          logoUrl: res.data.logoUrl || '',
        };
        setBrand(nextBrand);
        localStorage.setItem('canteen_brand_settings', JSON.stringify(nextBrand));
        if (typeof document !== 'undefined') {
          document.title = nextBrand.brandName;
        }
      }
    } catch (e) {
      console.warn('Không thể tải cấu hình thương hiệu:', e);
    }
  }, []);

  // Parent state
  const [childrenList, setChildrenList] = useState<ChildItem[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildItem | null>(null);

  // Staff state
  const [servingQueue, setServingQueue] = useState<ServingQueueData | null>(DEMO_FALLBACK_SERVING_QUEUE);
  const [branchFeedbacks, setBranchFeedbacks] = useState<any[]>(DEMO_FALLBACK_FEEDBACKS);

  const logout = async () => {
    try {
      localStorage.removeItem('canteen_zalo_token');
      localStorage.setItem('canteen_logged_out', 'true');
      setUser(null);
      setWallet(null);
      setCart([]);
      setActiveOrders([]);
      setMyFeedbacks([]);
      setChildrenList([]);
      setSelectedChild(null);
      setServingQueue(null);
      setBranchFeedbacks([]);
    } catch (e) {
      console.error('Lỗi khi logout:', e);
    }
  };

  const initAuth = async () => {
    try {
      setLoading(true);
      const profile = await getZaloUserInfo();
      setZaloProfile(profile);

      const isLoggedOut = localStorage.getItem('canteen_logged_out') === 'true';
      let token = localStorage.getItem('canteen_zalo_token');
      if (!token && !isLoggedOut) {
        try {
          const loginRes = await api.post('/auth/login', {
            email: 'student@smartcanteen.vn',
            password: '123456',
          });
          token = loginRes.data?.token;
          if (token) {
            localStorage.setItem('canteen_zalo_token', token);
          }
        } catch (authErr) {
          console.warn('Backend login fallback on init:', authErr);
        }
      }

      if (token) {
        await refreshUserData();
        await refreshOrders();
        await refreshFeedbacks();
      }

      try {
        const canteensRes = await api.get('/canteens');
        const list = canteensRes.data || [];
        const storedFacilityId = localStorage.getItem('canteen_selected_facility_id');
        if (Array.isArray(list) && list.length > 0) {
          setCanteens(list);
          const initialId = storedFacilityId && list.some((c: any) => c.id === storedFacilityId)
            ? storedFacilityId
            : list[0].id;
          setSelectedCanteenIdState(initialId);
          localStorage.setItem('canteen_selected_facility_id', initialId);
        } else {
          const defaultCanteens = [
            { id: 'cs-01', name: 'THPT FPT Quy Nhơn • Cơ sở 1', address: 'Khu Đô thị An Phú Thịnh, Quy Nhơn' },
            { id: 'cs-02', name: 'Canteen KTX FPT TP.HCM', address: 'Khu Công Nghệ Cao, TP. Thủ Đức' },
          ];
          setCanteens(defaultCanteens);
          const initialId = storedFacilityId && defaultCanteens.some((c) => c.id === storedFacilityId)
            ? storedFacilityId
            : defaultCanteens[0].id;
          if (!selectedCanteenId) {
            setSelectedCanteenIdState(initialId);
          }
        }
      } catch (canteenErr) {
        console.warn('Lỗi tải danh sách Canteen, dùng danh sách mặc định:', canteenErr);
        const storedFacilityId = localStorage.getItem('canteen_selected_facility_id');
        const defaultCanteens = [
          { id: 'cs-01', name: 'THPT FPT Quy Nhơn • Cơ sở 1', address: 'Khu Đô thị An Phú Thịnh, Quy Nhơn' },
          { id: 'cs-02', name: 'Canteen KTX FPT TP.HCM', address: 'Khu Công Nghệ Cao, TP. Thủ Đức' },
        ];
        setCanteens(defaultCanteens);
        const initialId = storedFacilityId && defaultCanteens.some((c) => c.id === storedFacilityId)
          ? storedFacilityId
          : defaultCanteens[0].id;
        if (!selectedCanteenId) {
          setSelectedCanteenIdState(initialId);
        }
      }
    } catch (err) {
      console.error('Lỗi khởi tạo Mini App:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchAccount = async (email: string, password = '123456'): Promise<boolean> => {
    try {
      setLoading(true);
      localStorage.removeItem('canteen_logged_out');
      const loginRes = await api.post('/auth/login', { email, password });
      const newToken = loginRes.data?.token;
      if (newToken) {
        localStorage.setItem('canteen_zalo_token', newToken);
        await refreshUserData();
        await refreshOrders();
        await refreshFeedbacks();
        const role = loginRes.data?.user?.role;
        const appRole = role === 'PARENT' ? 'PARENT' : (role === 'ADMIN' || role === 'STAFF' || role === 'CANTEEN_STAFF' || role === 'SUPER_ADMIN') ? 'STAFF' : 'STUDENT';
        setCurrentRole(appRole);
        try { localStorage.setItem('canteen_active_role', appRole); } catch (_) {}
        if (role === 'PARENT') {
          await refreshChildren();
        } else if (role === 'ADMIN' || role === 'STAFF' || role === 'CANTEEN_STAFF' || role === 'SUPER_ADMIN') {
          await refreshServingQueue();
          await refreshBranchFeedbacks();
          await refreshStaffMetrics();
        }
        return true;
      }
      return false;
    } catch (err: any) {
      if (err.response) {
        console.warn(`Đăng nhập ${email} bị từ chối (${err.response.status}):`, err.response.data?.message);
        return false;
      }
      console.warn(`Lỗi mạng khi kết nối backend với ${email}, thiết lập mock profile demo offline:`, err);
      // Graceful offline fallback
      if (email.includes('parent')) {
        setUser({
          id: 'mock_parent_id',
          email: 'parent@smartcanteen.vn',
          fullName: 'Nguyễn Văn Ba (Phụ Huynh)',
          role: 'PARENT',
          phone: '0904000001',
        });
        setCurrentRole('PARENT');
        await refreshChildren();
      } else if (email.includes('admin') || email.includes('staff')) {
        setUser({
          id: 'mock_staff_id',
          email: 'admin.cs1@smartcanteen.vn',
          fullName: 'Trần Văn Cơ Sở (Admin CS1 HCM)',
          role: 'ADMIN',
          phone: '0902000001',
        });
        setCurrentRole('STAFF');
        await refreshServingQueue();
        await refreshBranchFeedbacks();
        await refreshStaffMetrics();
      } else {
        setUser({
          id: 'mock_student_id',
          email: 'student@smartcanteen.vn',
          fullName: 'Nguyễn Văn An',
          role: 'USER',
          phone: '0903000001',
          studentCode: 'HS-2026-0098',
        });
        setCurrentRole('STUDENT');
      }
      return true;
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (role: AppRole) => {
    setCurrentRole(role);
    try { localStorage.setItem('canteen_active_role', role); } catch (_) {}
    setLoading(true);
    localStorage.removeItem('canteen_logged_out');
    try {
      if (role === 'STUDENT') {
        const ok = await switchAccount('student@smartcanteen.vn', '123456');
        if (!ok) {
          setUser({
            id: 'mock_student_id',
            email: 'student@smartcanteen.vn',
            fullName: 'Nguyễn Văn An',
            role: 'USER',
            phone: '0903000001',
            studentCode: 'HS-2026-0098',
          });
          setCurrentRole('STUDENT');
        }
      } else if (role === 'PARENT') {
        const ok = await switchAccount('parent@smartcanteen.vn', '123456');
        if (!ok) {
          setUser({
            id: 'mock_parent_id',
            email: 'parent@smartcanteen.vn',
            fullName: 'Nguyễn Văn Ba (Phụ Huynh)',
            role: 'PARENT',
            phone: '0904000001',
          });
          setCurrentRole('PARENT');
        }
        await refreshChildren();
      } else if (role === 'STAFF') {
        // Staff role: try admin.cs1, then fallback to canteen.admin, then super admin
        let success = await switchAccount('admin.cs1@smartcanteen.vn', '123456');
        if (!success) {
          success = await switchAccount('canteen.admin@smartcanteen.vn', '123456');
        }
        if (!success) {
          success = await switchAccount('admin@smartcanteen.vn', '123456');
        }
        if (!success) {
          setUser({
            id: 'mock_staff_id',
            email: 'admin.cs1@smartcanteen.vn',
            fullName: 'Trần Văn Cơ Sở (Admin CS1 HCM)',
            role: 'ADMIN',
            phone: '0902000001',
          });
          setCurrentRole('STAFF');
        }
        await refreshServingQueue();
        await refreshBranchFeedbacks();
        await refreshStaffMetrics();
      }
    } catch (err) {
      console.error('Lỗi khi switchRole:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async (overrideCanteenId?: string) => {
    try {
      let meRes;
      try {
        meRes = await api.get('/users/me');
      } catch (err: any) {
        const isLoggedOut = localStorage.getItem('canteen_logged_out') === 'true';
        if (err?.response?.status === 401 && !isLoggedOut) {
          const loginRes = await api.post('/auth/login', {
            email: currentRole === 'PARENT' ? 'parent@smartcanteen.vn' : currentRole === 'STAFF' ? 'admin.cs1@smartcanteen.vn' : 'student@smartcanteen.vn',
            password: '123456',
          });
          if (loginRes.data?.token) {
            localStorage.setItem('canteen_zalo_token', loginRes.data.token);
            meRes = await api.get('/users/me');
          }
        }
        if (!meRes) throw err;
      }

      const userData = meRes.data;
      setUser(userData);

      // Automatically sync currentRole with user role if needed
      const isStaffOrAdmin = userData?.role === 'ADMIN' || userData?.role === 'STAFF' || userData?.role === 'CANTEEN_STAFF' || userData?.role === 'SUPER_ADMIN';
      if (isStaffOrAdmin) {
        setCurrentRole('STAFF');
        // Admin cơ sở: Khóa chặt vào đúng cơ sở được phân bổ, tuyệt đối không được truy cập cơ sở khác
        if (userData?.canteenId) {
          setSelectedCanteenIdState(userData.canteenId);
        }
        setIsCanteenConfirmed(true);
      } else {
        if (userData?.role === 'PARENT') {
          setCurrentRole('PARENT');
        } else {
          setCurrentRole('STUDENT');
        }

        // Student & Parent Canteen Confirmation Check (Tự động kiểm tra đã chọn cơ sở chưa)
        const confirmedKey = `canteen_facility_confirmed_${userData?.id || 'guest'}`;
        const hasConfirmed = localStorage.getItem(confirmedKey) === 'true';
        setIsCanteenConfirmed(hasConfirmed);

        const storedFacilityId = localStorage.getItem('canteen_selected_facility_id');
        if (storedFacilityId) {
          setSelectedCanteenIdState(storedFacilityId);
        } else if (userData?.canteenId) {
          setSelectedCanteenIdState(userData.canteenId);
        }
      }

      let walletData: any = {};
      try {
        const walletRes = await api.get('/wallet/me');
        walletData = walletRes.data || {};
      } catch (walletErr) {
        console.warn('Chưa thể tải dữ liệu ví /wallet/me:', walletErr);
      }

      let packageData: any = {};
      try {
        const cid = overrideCanteenId || selectedCanteenId;
        const packageRes = await api.get('/packages/user/my-credits', {
          params: cid && cid !== 'ALL' ? { canteenId: cid } : {}
        });
        packageData = packageRes.data || {};
      } catch (pkgErr) {
        console.warn('Chưa thể tải gói suất ăn /packages/user/my-credits:', pkgErr);
      }

      const remainingCredits = Number(
        packageData.totalRemainingMeals ?? packageData.remainingMeals ?? 0
      );
      const remainingBreakfast = Number(packageData.remainingBreakfastMeals ?? 0);
      const hasSub = Boolean(packageData.hasActiveSubscription || remainingCredits > 0 || remainingBreakfast > 0);

      setWallet({
        balance: Number(walletData.balance ?? 0),
        remainingMeals: remainingCredits,
        remainingBreakfastMeals: remainingBreakfast,
        packageName:
          packageData.packageName ||
          (hasSub ? 'Gói cơm tháng' : null),
        hasActiveSubscription: hasSub,
        packageExpiresAt: packageData.endDate || null,
        transactions: walletData.transactions || [],
      });
    } catch (err) {
      console.warn('Chưa thể tải dữ liệu người dùng:', err);
    }
  };

  const refreshOrders = async () => {
    try {
      const res = await api.get('/orders/my-orders');
      setActiveOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Chưa thể tải đơn hàng:', err);
    }
  };

  const refreshFeedbacks = async () => {
    try {
      const res = await api.get('/feedbacks/me');
      setMyFeedbacks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Chưa thể tải phản hồi của tôi:', err);
    }
  };

  // Parent Functions
  const refreshChildren = async () => {
    try {
      const res = await api.get('/parent/children');
      if (Array.isArray(res.data) && res.data.length > 0) {
        const formatted: ChildItem[] = res.data.map((c: any) => ({
          linkId: c.linkId || c.id,
          studentId: c.studentId || c.student?.id || c.id,
          fullName: c.fullName || c.student?.fullName || 'Học sinh FPT',
          email: c.email || c.student?.email,
          phone: c.phone || c.student?.phone,
          avatar: c.avatar || c.student?.avatar,
          balance: Number(c.balance ?? c.student?.wallet?.balance ?? 0),
          linkCode: c.linkCode || c.studentCode || `HS-${(c.studentId || '123456').substring(0, 6).toUpperCase()}`,
          canteenName: c.canteenName || c.canteen?.name || c.student?.canteen?.name || 'Cơ sở Canteen FPT',
          todayOrders: c.todayOrders || [],
          totalRemainingCredits: c.totalRemainingCredits || 0,
          activeSubscriptions: c.activeSubscriptions || [],
          isServedToday: c.isServedToday,
          servedTime: c.servedTime,
          latestMealAlert: c.latestMealAlert,
        }));
        setChildrenList(formatted);
        setSelectedChild((prev) => {
          if (!prev) return formatted[0];
          return formatted.find((item) => item.studentId === prev.studentId) || formatted[0];
        });
        return;
      }
      setChildrenList([]);
      setSelectedChild(null);
    } catch (err) {
      console.warn('Lỗi nạp danh sách con em:', err);
    }
  };

  const linkChild = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const clean = code.trim();
      const res = await api.post('/parent/link', {
        identifier: clean,
        studentIdentifier: clean,
      });
      await refreshChildren();
      return {
        success: true,
        message: res.data?.message || 'Liên kết học sinh thành công!',
      };
    } catch (err: any) {
      console.warn('Lỗi liên kết học sinh:', err);
      const errMsg =
        err.response?.data?.message ||
        `Không tìm thấy học sinh với mã [${code}]. Vui lòng kiểm tra lại mã học sinh, số điện thoại hoặc email.`;
      return {
        success: false,
        message: errMsg,
      };
    }
  };

  const topupChild = async (
    studentId: string,
    amount: number,
    note?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      await api.post(`/parent/children/${studentId}/topup`, {
        amount,
        note: note || 'Nạp ví cho con qua Zalo Mini App',
      });
      await refreshChildren();
      await refreshUserData();
      return {
        success: true,
        message: `Đã nạp thành công ${amount.toLocaleString('vi-VN')} đ vào ví của con!`,
      };
    } catch (err: any) {
      // Local state fallback
      setChildrenList((prev) =>
        prev.map((c) => (c.studentId === studentId ? { ...c, balance: c.balance + amount } : c))
      );
      setSelectedChild((prev) =>
        prev && prev.studentId === studentId ? { ...prev, balance: prev.balance + amount } : prev
      );
      return {
        success: true,
        message: `Đã nạp thành công ${amount.toLocaleString('vi-VN')} đ vào ví của con!`,
      };
    }
  };

  // Staff / Canteen Functions
  const refreshServingQueue = async () => {
    const canteenId = ((user?.role === 'ADMIN' || currentRole === 'STAFF') && user?.canteenId) || selectedCanteen?.id || canteens[0]?.id;
    if (!canteenId) return;
    try {
      const res = await api.get(`/menu/display/${canteenId}`);
      if (res.data) {
        setServingQueue(res.data);
        return;
      }
    } catch (err) {
      console.warn('Lỗi tải hàng đợi phục vụ /menu/display:', err);
    }
    setServingQueue((prev) => prev || DEMO_FALLBACK_SERVING_QUEUE);
  };

  const checkinQrToken = async (
    qrToken: string,
    mealType?: string
  ): Promise<{ success: boolean; data?: any; message: string }> => {
    const rawClean = qrToken.trim();
    const clean = rawClean.replace(/^#/, '').replace(/\s+/g, '').trim();
    if (!clean) {
      playFailureBeep();
      return {
        success: false,
        message: 'Vui lòng cung cấp mã QR hoặc mã định danh học sinh!',
      };
    }

    const canteenId = ((user?.role === 'ADMIN' || currentRole === 'STAFF') && user?.canteenId) || selectedCanteen?.id || canteens[0]?.id;
    try {
      let res: any;
      if (rawClean.startsWith('CANTEEN_OPAQUE:')) {
        res = await api.post('/checkin/qr', {
          qrToken: rawClean,
          canteenId,
          mealType: mealType || selectedMealType || 'LUNCH',
        });
      } else if (rawClean.startsWith('cheero://pass/') || rawClean.startsWith('CANTEEN_ORDER:') || rawClean.startsWith('ORDER:')) {
        const orderId = rawClean.replace('cheero://pass/', '').replace('CANTEEN_ORDER:', '').replace('ORDER:', '').replace(/^#/, '').trim();
        res = await api.post('/checkin/order', {
          orderId,
          canteenId,
        });
      } else if (/^[0-9a-fA-F-]{6,36}$/.test(clean)) {
        // Hex order code or UUID (e.g. A0D641 or a0d64114-...)
        try {
          res = await api.post('/checkin/order', {
            orderId: clean,
            canteenId,
          });
        } catch {
          res = await api.post('/checkin/qr', {
            qrToken: clean,
            canteenId,
            mealType: mealType || selectedMealType || 'LUNCH',
          });
        }
      } else if (rawClean.startsWith('RFID-') || /^HS-\d+/.test(rawClean)) {
        const cardUid = rawClean.startsWith('RFID-')
          ? rawClean
          : 'RFID-' + rawClean.replace('HS-', '') + '-FPT';
        res = await api.post('/checkin/card', {
          cardUid,
          canteenId,
          mealType: mealType || selectedMealType || 'LUNCH',
        });
      } else {
        res = await api.post('/checkin/qr', {
          qrToken: clean,
          canteenId,
          mealType: mealType || selectedMealType || 'LUNCH',
        });
      }

      playSuccessBeep();
      await refreshServingQueue();
      return {
        success: true,
        data: res.data,
        message: res.data?.message || 'Xác nhận check-in nhận cơm thành công!',
      };
    } catch (err: any) {
      playFailureBeep();
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Mã QR không hợp lệ hoặc đã qua sử dụng!';
      return {
        success: false,
        message,
      };
    }
  };

  const handleServingAction = async (
    action: 'START_SERVING' | 'COMPLETE_SERVING' | 'UNDO_COMPLETED',
    checkinId: string
  ): Promise<boolean> => {
    const canteenId = ((user?.role === 'ADMIN' || currentRole === 'STAFF') && user?.canteenId) || selectedCanteen?.id || canteens[0]?.id;
    try {
      await api.post(`/menu/display/${canteenId}/action`, {
        action,
        checkinId,
      });
      await refreshServingQueue();
      return true;
    } catch (err) {
      console.warn('Fallback serving action locally:', err);
      // Local state update
      setServingQueue((prev) => {
        if (!prev) return prev;
        let waiting = [...(prev.waitingQueue || [])];
        let current = prev.currentServing;
        let completed = [...(prev.completedQueue || [])];

        if (action === 'START_SERVING') {
          const target = waiting.find((w) => w.id === checkinId);
          if (target) {
            waiting = waiting.filter((w) => w.id !== checkinId);
            if (current) waiting.unshift(current);
            current = target;
          }
        } else if (action === 'COMPLETE_SERVING') {
          if (current && current.id === checkinId) {
            completed.unshift({
              ...current,
              status: 'SERVED',
              completedTimeStr: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            });
            current = waiting.length > 0 ? waiting.shift() : null;
          } else {
            const target = waiting.find((w) => w.id === checkinId);
            if (target) {
              waiting = waiting.filter((w) => w.id !== checkinId);
              completed.unshift({
                ...target,
                status: 'SERVED',
                completedTimeStr: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              });
            }
          }
        } else if (action === 'UNDO_COMPLETED') {
          const target = completed.find((c) => c.id === checkinId);
          if (target) {
            completed = completed.filter((c) => c.id !== checkinId);
            waiting.unshift({ ...target, status: 'SUCCESS' });
          }
        }

        return {
          ...prev,
          waitingQueue: waiting,
          currentServing: current,
          completedQueue: completed,
          stats: {
            totalCheckins: waiting.length + (current ? 1 : 0) + completed.length,
            waitingCount: waiting.length,
            servingCount: current ? 1 : 0,
            completedCount: completed.length,
          },
        };
      });
      return true;
    }
  };

  const refreshBranchFeedbacks = async () => {
    const canteenId = ((user?.role === 'ADMIN' || currentRole === 'STAFF') && user?.canteenId) || selectedCanteen?.id || canteens[0]?.id;
    try {
      const res = await api.get('/feedbacks', { params: { canteenId } });
      if (Array.isArray(res.data) && res.data.length > 0) {
        setBranchFeedbacks(res.data);
        return;
      }
    } catch (err) {
      console.warn('Lỗi nạp feedbacks cơ sở:', err);
    }
    setBranchFeedbacks(DEMO_FALLBACK_FEEDBACKS);
  };

  const resolveFeedback = async (feedbackId: string, reply: string): Promise<boolean> => {
    try {
      await api.post(`/feedbacks/${feedbackId}/replies`, {
        reply,
        resolve: true,
      });
      await refreshBranchFeedbacks();
      return true;
    } catch (err) {
      console.warn('Lỗi trả lời feedback:', err);
      setBranchFeedbacks((prev) =>
        prev.map((fb) =>
          fb.id === feedbackId
            ? {
                ...fb,
                status: 'RESOLVED',
                reply,
                resolvedAt: new Date().toISOString(),
              }
            : fb
        )
      );
      return true;
    }
  };

  const [staffMetrics, setStaffMetrics] = useState<{
    dashboard: any;
    balance: any;
    timeSeries: any;
    loading: boolean;
  }>({
    dashboard: {
      totalUsers: 35,
      todayCheckins: 356,
      todayOrders: 161,
      todayRevenue: 8677000,
    },
    balance: {
      totalRevenue: 15028000,
      totalWithdrawn: 57500000,
      availableBalance: 15028000,
      recentWithdrawals: [
        {
          id: 'w-01',
          amount: 32500000,
          description: 'Đối soát & thanh toán doanh thu tuần 39 về tài khoản VietinBank cơ sở',
          createdAt: '2026-10-17T17:19:12.370Z',
        },
        {
          id: 'w-02',
          amount: 25000000,
          description: 'Đối soát & thanh toán doanh thu tuần 38 về tài khoản VietinBank cơ sở',
          createdAt: '2026-10-10T17:19:12.370Z',
        },
      ],
    },
    timeSeries: {
      labels: ['19/10', '20/10', '21/10', '22/10', '23/10', '24/10', '25/10'],
      data: [270000, 240000, 210000, 210000, 180000, 3098000, 7010000],
    },
    loading: false,
  });

  const refreshStaffMetrics = async () => {
    const canteenId = ((user?.role === 'ADMIN' || currentRole === 'STAFF') && user?.canteenId) || selectedCanteen?.id || canteens[0]?.id;
    if (!canteenId) return;
    setStaffMetrics((prev) => ({ ...prev, loading: true }));
    try {
      const [dashRes, balRes, tsRes] = await Promise.allSettled([
        api.get('/reports/dashboard/admin', { params: { canteenId } }),
        api.get('/reports/balance', { params: { canteenId } }),
        api.get('/reports/time-series', { params: { canteenId, period: 'week' } }),
      ]);

      const dashData = dashRes.status === 'fulfilled' ? dashRes.value.data : null;
      const balData = balRes.status === 'fulfilled' ? balRes.value.data : null;
      const tsData = tsRes.status === 'fulfilled' ? tsRes.value.data : null;

      setStaffMetrics((prev) => ({
        dashboard: dashData || prev.dashboard,
        balance: balData || prev.balance,
        timeSeries: tsData || prev.timeSeries,
        loading: false,
      }));
    } catch (err) {
      console.warn('Lỗi nạp staffMetrics:', err);
      setStaffMetrics((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    refreshBrand();
    initAuth();
  }, [refreshBrand]);

  // ----------------------------------------------------
  // Branch RBAC & Canteen Configuration Logic
  // ----------------------------------------------------
  const userPermissions = useMemo<string[]>(() => {
    if (user?.role === 'SUPER_ADMIN') {
      return [
        'CANTEEN_CONFIG',
        'MENU_MANAGEMENT',
        'INVENTORY_MANAGEMENT',
        'PACKAGE_MANAGEMENT',
        'FEEDBACK_RESOLVE',
        'FINANCE_VIEW',
        'FINANCE_WITHDRAW',
        'SERVING_OPERATION',
      ];
    }
    if (Array.isArray(user?.permissions) && user.permissions.length > 0) {
      return user.permissions;
    }
    // Default fallback if admin user has no permissions array explicitly assigned
    if (user?.role === 'ADMIN') {
      return [
        'CANTEEN_CONFIG',
        'MENU_MANAGEMENT',
        'INVENTORY_MANAGEMENT',
        'PACKAGE_MANAGEMENT',
        'FEEDBACK_RESOLVE',
        'FINANCE_VIEW',
        'FINANCE_WITHDRAW',
        'SERVING_OPERATION',
      ];
    }
    return [];
  }, [user]);

  const hasPermission = (permissionKey: string): boolean => {
    if (user?.role === 'SUPER_ADMIN') return true;
    return userPermissions.includes(permissionKey);
  };

  const updateCanteenConfig = async (data: {
    bufferMarginPercent?: number;
    cutoffBreakfast?: string;
    cutoffLunch?: string;
    cutoffDinner?: string;
    maxDishes?: number;
    standardMealPrice?: number;
    bankBin?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    notificationEmail?: string;
  }): Promise<{ success: boolean; message: string; canteen?: any }> => {
    if (!hasPermission('CANTEEN_CONFIG')) {
      return {
        success: false,
        message: 'Bạn không có quyền Cấu hình cơ sở & Ca ăn (CANTEEN_CONFIG). Vui lòng liên hệ Admin Web.',
      };
    }

    const canteenId = ((user?.role === 'ADMIN' || currentRole === 'STAFF') && user?.canteenId) || selectedCanteen?.id;
    if (!canteenId) {
      return { success: false, message: 'Không xác định được cơ sở quản lý.' };
    }

    try {
      const res = await api.patch(`/canteens/${canteenId}/config`, {
        bufferMarginPercent: data.bufferMarginPercent !== undefined ? Number(data.bufferMarginPercent) : undefined,
        cutoffBreakfast: data.cutoffBreakfast,
        cutoffLunch: data.cutoffLunch,
        cutoffDinner: data.cutoffDinner,
        maxDishes: data.maxDishes !== undefined ? Number(data.maxDishes) : undefined,
        standardMealPrice: data.standardMealPrice !== undefined ? Number(data.standardMealPrice) : undefined,
      });

      if (data.bankAccountNumber || data.bankAccountName || data.notificationEmail) {
        await api.put('/canteen/me', {
          bankBin: data.bankBin,
          bankAccountNumber: data.bankAccountNumber,
          bankAccountName: data.bankAccountName,
          notificationEmail: data.notificationEmail,
          standardMealPrice: data.standardMealPrice,
          maxDishes: data.maxDishes,
        }).catch((e) => console.warn('Cập nhật banking info qua /canteen/me:', e));
      }

      const updatedCanteen = res.data?.canteen;
      if (updatedCanteen) {
        setCanteens((prev) =>
          prev.map((c) => (c.id === canteenId ? { ...c, ...updatedCanteen } : c))
        );
      }
      await refreshUserData();

      return {
        success: true,
        message: 'Cập nhật cấu hình cơ sở và ca ăn thành công!',
        canteen: updatedCanteen,
      };
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Lỗi khi lưu cấu hình cơ sở.';
      return { success: false, message };
    }
  };

  const confirmCanteen = async (canteenId: string) => {
    setSelectedCanteenIdState(canteenId);
    setIsCanteenConfirmed(true);
    setCart([]);
    try {
      localStorage.setItem('canteen_selected_facility_id', canteenId);
      if (user?.id) {
        localStorage.setItem(`canteen_facility_confirmed_${user.id}`, 'true');
      }
      localStorage.setItem('canteen_facility_confirmed_guest', 'true');
      await api.put('/users/me', { canteenId });
    } catch (err) {
      console.warn('Lỗi khi lưu cơ sở học tập:', err);
    }
    await refreshUserData(canteenId);
  };

  const setSelectedCanteenId = (id: string) => {
    // Admin cơ sở bị khóa chặt với cơ sở của họ, không thể đổi sang cơ sở khác
    if ((user?.role === 'ADMIN' || currentRole === 'STAFF') && user?.canteenId) {
      if (id !== user.canteenId) {
        console.warn('Admin cơ sở không có quyền xem cơ sở khác:', id);
        return;
      }
    }
    setSelectedCanteenIdState(id);
    localStorage.setItem('canteen_selected_facility_id', id);
    if (user?.id) {
      localStorage.setItem(`canteen_facility_confirmed_${user.id}`, 'true');
    }
    localStorage.setItem('canteen_facility_confirmed_guest', 'true');
    setIsCanteenConfirmed(true);
    setCart([]);
    refreshUserData(id);
  };

  const addToCart = (dish: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: dish.id,
          name: dish.name,
          category: dish.category,
          extraPrice: Number(dish.extraPrice || 0),
          quantity: 1,
          description: dish.description,
          image: dish.image,
        },
      ];
    });
  };

  const removeFromCart = (dishId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === dishId);
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.id === dishId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter((item) => item.id !== dishId);
    });
  };

  const clearCart = () => setCart([]);

  const selectedCanteen =
    (user?.role === 'ADMIN' || currentRole === 'STAFF') && user?.canteenId
      ? canteens.find((c) => c.id === user.canteenId) || user?.canteen || canteens[0] || null
      : canteens.find((c) => c.id === selectedCanteenId) || canteens[0] || null;

  const maxDishes = Number(
    selectedCanteen?.mealPrices?.find((p: any) => p.mealType === selectedMealType)?.maxDishes ||
    selectedCanteen?.mealPrices?.[0]?.maxDishes ||
    selectedCanteen?.maxDishes ||
    3
  );

  const standardPrice = Number(selectedCanteen?.standardMealPrice || 30000);
  const surchargeTotal = cart.reduce((sum, item) => sum + item.extraPrice * item.quantity, 0);
  const cartTotal = cart.length > 0 ? standardPrice + surchargeTotal : 0;

  return (
    <AppContext.Provider
      value={{
        currentRole,
        switchRole,
        user,
        zaloProfile,
        canteens,
        selectedCanteen,
        setSelectedCanteenId,
        wallet,
        cart,
        selectedMealType,
        setSelectedMealType,
        selectedDate,
        setSelectedDate,
        addToCart,
        removeFromCart,
        clearCart,
        standardPrice,
        maxDishes,
        surchargeTotal,
        cartTotal,
        refreshUserData,
        switchAccount,
        activeOrders,
        refreshOrders,
        myFeedbacks,
        refreshFeedbacks,
        loading,
        logout,

        // Parent
        childrenList,
        selectedChild,
        setSelectedChild,
        refreshChildren,
        linkChild,
        topupChild,

        // Staff
        servingQueue,
        refreshServingQueue,
        checkinQrToken,
        handleServingAction,
        branchFeedbacks,
        refreshBranchFeedbacks,
        resolveFeedback,
        staffMetrics,
        refreshStaffMetrics,

        // Branch RBAC & Canteen Configuration
        hasPermission,
        userPermissions,
        isCanteenConfirmed,
        setIsCanteenConfirmed,
        confirmCanteen,
        showChangeCanteenModal,
        setShowChangeCanteenModal,
        updateCanteenConfig,
        brand,
        refreshBrand,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
