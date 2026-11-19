import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { LockIcon as Lock } from '@phosphor-icons/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLayout } from './components/Layout/AdminLayout';
import type { TabType } from './components/Layout/Sidebar';
import { api } from './services/api';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

// Route-level code splitting via React.lazy to reduce initial bundle size below 500 kB
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const CanteensPage = lazy(() => import('./pages/CanteensPage').then(m => ({ default: m.CanteensPage })));
const PackagesPage = lazy(() => import('./pages/PackagesPage').then(m => ({ default: m.PackagesPage })));
const KitchenForecastPage = lazy(() => import('./pages/KitchenForecastPage').then(m => ({ default: m.KitchenForecastPage })));
const MenuImportPage = lazy(() => import('./pages/MenuImportPage').then(m => ({ default: m.MenuImportPage })));
const InventoryPage = lazy(() => import('./pages/InventoryPage').then(m => ({ default: m.InventoryPage })));
const FinancePage = lazy(() => import('./pages/FinancePage').then(m => ({ default: m.FinancePage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })));
const FeedbacksPage = lazy(() => import('./pages/FeedbacksPage').then(m => ({ default: m.FeedbacksPage })));
const ServingDisplayPage = lazy(() => import('./pages/ServingDisplayPage').then(m => ({ default: m.ServingDisplayPage })));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));

const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
    <div className="size-8 border-3 border-border-strong border-t-brand rounded-full animate-spin"></div>
    <span className="text-xs text-muted font-medium">Đang tải phân hệ...</span>
  </div>
);

// Canonical RESTful Product Route definitions
export const TAB_CANONICAL_PATHS: Record<TabType, string> = {
  dashboard: '/dashboard',
  forecast: '/kitchen-forecast',
  menu: '/menus',
  inventory: '/inventory',
  serving: '/serving-counter',
  canteens: '/canteens',
  packages: '/meal-packages',
  users: '/users',
  finance: '/finance',
  feedbacks: '/feedbacks',
  'audit-logs': '/audit-logs',
};

// Aliases and legacy mappings for clean URL resolution
const PATH_ALIASES: Record<string, TabType> = {
  '': 'dashboard',
  '/': 'dashboard',
  dashboard: 'dashboard',
  overview: 'dashboard',
  home: 'dashboard',

  'kitchen-forecast': 'forecast',
  forecast: 'forecast',
  bom: 'forecast',
  kitchen: 'forecast',

  menus: 'menu',
  menu: 'menu',
  'menu-import': 'menu',
  dishes: 'menu',

  inventory: 'inventory',
  stock: 'inventory',
  warehouse: 'inventory',

  'serving-counter': 'serving',
  serving: 'serving',
  pos: 'serving',
  counter: 'serving',

  canteens: 'canteens',
  canteen: 'canteens',
  branches: 'canteens',

  'meal-packages': 'packages',
  packages: 'packages',
  subscriptions: 'packages',

  users: 'users',
  accounts: 'users',
  rbac: 'users',
  members: 'users',

  finance: 'finance',
  reconciliation: 'finance',
  transactions: 'finance',

  feedbacks: 'feedbacks',
  feedback: 'feedbacks',
  csat: 'feedbacks',
  reviews: 'feedbacks',

  'audit-logs': 'audit-logs',
  audit: 'audit-logs',
  logs: 'audit-logs',
};

export const getTabTitle = (tab: TabType): string => {
  switch (tab) {
    case 'dashboard':
      return 'Tổng Quan Điều Hành Toàn Chuỗi (HQ Dashboard)';
    case 'serving':
      return 'Quầy Gắp Món Suất Ăn (Live POS)';
    case 'canteens':
      return 'Quản Lý Mạng Lưới Cơ Sở Canteen';
    case 'packages':
      return 'Quản Lý Gói Tháng & Quy Đổi Lượt Ăn';
    case 'forecast':
      return 'Dự Báo Bếp & Định Lượng Nguyên Vật Liệu (BOM)';
    case 'menu':
      return 'Quản Lý Thực Đơn & Nhập Liệu Excel';
    case 'inventory':
      return 'Quản Lý Tồn Kho & Nguyên Vật Liệu';
    case 'finance':
      return 'Giám Sát Tài Chính & Đối Soát Doanh Thu';
    case 'users':
      return 'Quản Lý Tài Khoản & Phân Quyền RBAC';
    case 'feedbacks':
      return 'Đánh Giá Chất Lượng & Phản Hồi (CSAT)';
    case 'audit-logs':
      return 'Nhật Ký Kiểm Toán Toàn Chuỗi (Audit Logs)';
    default:
      return 'Smart Canteen HQ';
  }
};

const resolveTabFromUrl = (): TabType => {
  if (typeof window === 'undefined') return 'dashboard';

  // 1. Pathname check (/users, /kitchen-forecast, /menus, etc.)
  const pathPart = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (PATH_ALIASES[pathPart]) {
    return PATH_ALIASES[pathPart];
  }

  // 2. Query param ?tab= check (e.g. ?tab=users)
  const searchTab = new URLSearchParams(window.location.search).get('tab')?.toLowerCase();
  if (searchTab && PATH_ALIASES[searchTab]) {
    return PATH_ALIASES[searchTab];
  }

  // 3. Hash check (e.g. #users, #/users)
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (hash && PATH_ALIASES[hash]) {
    return PATH_ALIASES[hash];
  }

  return 'dashboard';
};

const syncCanonicalUrl = (tab: TabType, replaceState = false) => {
  if (typeof window === 'undefined') return;
  const canonical = TAB_CANONICAL_PATHS[tab] || `/${tab}`;
  const url = new URL(window.location.href);

  // Preserve query parameters (like ?canteenId=...) but remove legacy keys
  url.searchParams.delete('tab');
  url.searchParams.delete('view');
  url.searchParams.delete('page');

  // Strip hash completely
  url.hash = '';

  const cleanSearch = url.searchParams.toString() ? `?${url.searchParams.toString()}` : '';
  const newRelativeUrl = `${canonical}${cleanSearch}`;

  if (replaceState || window.location.pathname !== canonical || window.location.hash) {
    window.history.replaceState({ tab }, '', newRelativeUrl);
  } else {
    window.history.pushState({ tab }, '', newRelativeUrl);
  }
};

const isLegacyLandingUrl = () => {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  const search = new URLSearchParams(window.location.search);

  return (
    hash === '#landing' ||
    hash.startsWith('#landing') ||
    pathname === '/landing' ||
    pathname.startsWith('/landing') ||
    search.get('view') === 'landing' ||
    search.get('page') === 'landing'
  );
};

const TAB_PERMISSION_MAP: Partial<Record<TabType, { permission: string; name: string }>> = {
  canteens: { permission: 'CANTEEN_CONFIG', name: 'Cấu hình Cơ sở & Ca ăn' },
  menu: { permission: 'MENU_MANAGEMENT', name: 'Quản lý Thực đơn & Món ăn' },
  inventory: { permission: 'INVENTORY_MANAGEMENT', name: 'Quản lý Kho & Nguyên liệu' },
  forecast: { permission: 'INVENTORY_MANAGEMENT', name: 'Dự báo Bếp & Định mức (BOM)' },
  serving: { permission: 'SERVING_OPERATION', name: 'Màn hình Quầy gắp & Check-in' },
  packages: { permission: 'PACKAGE_MANAGEMENT', name: 'Quản lý Gói ăn & Vé tháng' },
  finance: { permission: 'FINANCE_VIEW', name: 'Tài chính & Đối soát' },
  feedbacks: { permission: 'FEEDBACK_RESOLVE', name: 'Đánh giá CSAT & Khiếu nại' },
};

const AppContent: React.FC = () => {
  const { user, token, isLoading, selectedCanteenId, hasPermission, logout } = useAuth();
  const [currentTab, setCurrentTabState] = useState<TabType>(resolveTabFromUrl);
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  const setCurrentTab = useCallback((tab: TabType) => {
    setCurrentTabState(tab);
    syncCanonicalUrl(tab, false);
  }, []);

  // Listen to popstate for browser back/forward and initialize canonical URL
  useEffect(() => {
    const initialTab = resolveTabFromUrl();
    setCurrentTabState(initialTab);
    syncCanonicalUrl(initialTab, true);

    const handlePopState = () => {
      const poppedTab = resolveTabFromUrl();
      setCurrentTabState(poppedTab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Dynamically update document title to reflect active tab
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = `${getTabTitle(currentTab)} | Smart Canteen HQ`;
    }
  }, [currentTab]);


  // Role guard: Non-SUPER_ADMIN cannot access HQ-only tabs
  useEffect(() => {
    if (!user) return;
    if (user.role !== 'SUPER_ADMIN') {
      if (currentTab === 'audit-logs') {
        setCurrentTab('dashboard');
      }
    }
  }, [user, currentTab, setCurrentTab]);

  useEffect(() => {
    if (isLoading || !isLegacyLandingUrl()) return;
    window.history.replaceState(null, '', token && user ? '/' : '/login');
  }, [isLoading, token, user]);

  // Lấy số lượng cảnh báo tồn kho để hiển thị badge đỏ trên thanh Sidebar
  const fetchStockAlertCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/inventory', { params: { isLowStock: 'true' } });
      setLowStockCount(res.data?.length || 0);
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchStockAlertCount();
      const interval = setInterval(fetchStockAlertCount, 30000); // 30s poll
      return () => clearInterval(interval);
    }
  }, [token, fetchStockAlertCount]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="size-10 border-4 border-border-strong border-t-brand rounded-full animate-spin"></div>
      </div>
    );
  }

  // Người chưa đăng nhập luôn vào cổng HQ Admin
  if (!token || !user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
    if (token && user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      logout();
    }
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <LoginPage />
      </Suspense>
    );
  }


    const requiredPermission = TAB_PERMISSION_MAP[currentTab];
    const isTabUnauthorized = Boolean(
      user?.role === 'ADMIN' && requiredPermission && !hasPermission(requiredPermission.permission)
    );

    return (
      <AdminLayout
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        title={getTabTitle(currentTab)}
        lowStockCount={lowStockCount}
      >
        {isTabUnauthorized ? (
          <div className="p-8 text-center bg-surface rounded-2xl border border-border space-y-4 max-w-lg mx-auto my-12 shadow-xs">
            <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
              <Lock className="size-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-foreground">Bạn chưa được cấp quyền truy cập</h3>
              <p className="text-xs text-muted leading-relaxed">
                Tài khoản Admin cơ sở của bạn chưa được cấp quyền <strong className="text-foreground">{requiredPermission!.name} ({requiredPermission!.permission})</strong> để thao tác phân hệ này.
              </p>
              <p className="text-xs text-muted">Vui lòng liên hệ Quản trị viên Tổng (Super Admin) để được phân bổ quyền hạn.</p>
            </div>
            <button
              onClick={() => setCurrentTab('dashboard')}
              className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-hover transition-colors cursor-pointer"
            >
              Quay lại Bảng điều khiển
            </button>
          </div>
        ) : (
          <Suspense fallback={<PageLoadingFallback />}>
            {currentTab === 'dashboard' && <DashboardPage onNavigateTab={setCurrentTab} />}
            {currentTab === 'serving' && (() => {
              const targetCanteenId = user?.canteenId || (selectedCanteenId !== 'ALL' ? selectedCanteenId : null);
              if (!targetCanteenId) {
                return (
                  <div className="p-8 text-center bg-surface rounded-2xl border border-border space-y-3 max-w-md mx-auto my-12 shadow-xs">
                    <h3 className="text-sm font-semibold text-foreground">Vui lòng chọn cơ sở cụ thể</h3>
                    <p className="text-xs text-muted">
                      Super Admin quản lý toàn chuỗi. Để hiển thị màn hình quầy gắp món (Live POS), vui lòng chọn một cơ sở cụ thể trên thanh chọn cơ sở phía trên.
                    </p>
                  </div>
                );
              }
              return (
                <div className="h-[calc(100vh-8.5rem)] -m-2 sm:-m-4">
                  <ServingDisplayPage canteenId={targetCanteenId} isEmbedded />
                </div>
              );
            })()}
            {currentTab === 'canteens' && <CanteensPage />}
            {currentTab === 'packages' && <PackagesPage />}
            {currentTab === 'forecast' && <KitchenForecastPage />}
            {currentTab === 'menu' && <MenuImportPage onNavigateTab={setCurrentTab} />}
            {currentTab === 'inventory' && <InventoryPage />}
            {currentTab === 'finance' && <FinancePage />}
            {currentTab === 'users' && <UsersPage />}
            {currentTab === 'feedbacks' && <FeedbacksPage />}
            {currentTab === 'audit-logs' && <AuditLogsPage />}
          </Suspense>
        )}
      </AdminLayout>
    );
};

function getDisplayCanteenId(): string | null {
  if (typeof window === 'undefined') return null;
  // 1. Path: /display/:id, /serving-counter/:id, /serving/:id, /pos/:id, /tv/:id
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/(?:display|serving-counter|serving|counter|pos|tv)\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // 2. Query: ?display=:id or ?canteenId=:id (when path contains display/tv/kiosk)
  const params = new URLSearchParams(window.location.search);
  const qDisplay = params.get('display') || (pathname.match(/\b(display|kiosk|tv)\b/) ? params.get('canteenId') : null);
  if (qDisplay) return qDisplay;

  // 3. Hash: #/display/:id
  const hash = window.location.hash;
  const hashMatch = hash.match(/#\/(?:display|serving|tv)\/([a-zA-Z0-9_-]+)/);
  if (hashMatch) return hashMatch[1];

  return null;
}

export default function App() {
  const displayCanteenId = getDisplayCanteenId();

  // Nếu là đường dẫn màn hình quầy gắp món của cơ sở, hiển thị trực tiếp chế độ hiển thị toàn màn hình
  if (displayCanteenId) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <ServingDisplayPage canteenId={displayCanteenId} />
      </Suspense>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
