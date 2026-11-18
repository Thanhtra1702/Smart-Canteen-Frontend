import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppProvider, useApp, type AppRole } from './context/AppContext';
import { HeaderBar } from './components/HeaderBar';
import { NotificationModal } from './components/NotificationModal';
import { SelectCanteenModal } from './components/SelectCanteenModal';
import { BottomNavigation, type TabKey } from './components/BottomNavigation';
import { HomePage } from './pages/HomePage';
import { WalletPage } from './pages/WalletPage';
import { QRPassPage } from './pages/QRPassPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { ProfilePage } from './pages/ProfilePage';
import { ParentPage } from './pages/ParentPage';
import { StaffPage } from './pages/StaffPage';
import { LoginPage } from './pages/LoginPage';

// Canonical URLs for Mobile/MiniApp tabs
const TAB_CANONICAL_URL: Record<TabKey, string> = {
  menu: '/menu',
  wallet: '/wallet',
  qr: '/qr',
  feedback: '/feedback',
  profile: '/profile',
  children: '/children',
  parent_menu: '/parent-menu',
  parent_wallet: '/parent-wallet',
  overview: '/overview',
  scan: '/scan',
  serving: '/serving',
  users: '/staff-users',
  feedbacks: '/feedbacks',
  staff_menu: '/branch-menu',
};

const getDefaultTabForRole = (role: AppRole): TabKey =>
  role === 'STAFF' ? 'overview' : role === 'PARENT' ? 'children' : 'menu';

const resolveMiniAppTabFromUrl = (role: AppRole): TabKey => {
  if (typeof window === 'undefined') return getDefaultTabForRole(role);
  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  const searchTab = new URLSearchParams(window.location.search).get('tab')?.toLowerCase();
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  const target = pathname || searchTab || hash;

  const validStudentTabs: TabKey[] = ['menu', 'wallet', 'qr', 'feedback', 'profile'];
  const validParentTabs: TabKey[] = ['children', 'parent_menu', 'parent_wallet', 'feedback', 'profile'];
  const validStaffTabs: TabKey[] = ['overview', 'staff_menu', 'scan', 'users', 'feedbacks', 'profile'];

  const tabAliases: Record<string, TabKey> = {
    order: 'menu',
    menus: 'menu',
    pay: 'wallet',
    payment: 'wallet',
    checkin: 'qr',
    pass: 'qr',
    csat: 'feedback',
    feedbacks: 'feedback',
    account: 'profile',
    settings: 'profile',
    kids: 'children',
    students: 'children',
    'parent-menu': 'parent_menu',
    'parent-wallet': 'parent_wallet',
    staff: 'overview',
    dashboard: 'overview',
    scanner: 'scan',
    'staff-users': 'users',
    'branch-menu': 'staff_menu',
    'dishes': 'staff_menu',
    'canteen-menu': 'staff_menu',
    accounts: 'users',
  };

  const resolved = tabAliases[target] || (target as TabKey);

  if (role === 'STUDENT' && validStudentTabs.includes(resolved)) return resolved;
  if (role === 'PARENT' && validParentTabs.includes(resolved)) return resolved;
  if (role === 'STAFF' && validStaffTabs.includes(resolved)) return resolved;

  return getDefaultTabForRole(role);
};

const MainScreen: React.FC = () => {
  const {
    currentRole,
    loading,
    user,
    isCanteenConfirmed,
    showChangeCanteenModal,
    setShowChangeCanteenModal,
  } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>(() => resolveMiniAppTabFromUrl(currentRole));
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);
  const wasLoggedOutRef = useRef(false);
  const prevUserIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setIsSlowNetwork(false);
      return;
    }
    const timer = setTimeout(() => setIsSlowNetwork(true), 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  const handleNavigateTab = useCallback((newTab: TabKey) => {
    setActiveTab(newTab);
    if (typeof window !== 'undefined') {
      const canonical = TAB_CANONICAL_URL[newTab] || `/${newTab}`;
      const url = new URL(window.location.href);
      url.pathname = canonical;
      url.hash = '';
      url.searchParams.delete('tab');
      const cleanSearch = url.searchParams.toString() ? `?${url.searchParams.toString()}` : '';
      window.history.replaceState({ tab: newTab }, '', `${url.pathname}${cleanSearch}`);
    }
  }, []);

  // Always land on the first tab for any role when logging in or switching accounts
  useEffect(() => {
    if (loading) return;

    const userIdentity: string | null = user?.id || user?.email || null;
    if (!userIdentity) {
      wasLoggedOutRef.current = true;
      prevUserIdentityRef.current = null;
      return;
    }

    const isFreshLoginOrSwitch =
      wasLoggedOutRef.current ||
      (prevUserIdentityRef.current !== null && prevUserIdentityRef.current !== userIdentity);

    wasLoggedOutRef.current = false;
    prevUserIdentityRef.current = userIdentity;

    const targetTab = isFreshLoginOrSwitch
      ? getDefaultTabForRole(currentRole)
      : resolveMiniAppTabFromUrl(currentRole);

    handleNavigateTab(targetTab);
  }, [currentRole, user?.id, user?.email, loading, handleNavigateTab]);

  // Listen to browser back/forward navigation
  useEffect(() => {
    const onPop = () => {
      setActiveTab(resolveMiniAppTabFromUrl(currentRole));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [currentRole]);

  return (
    <div className="min-h-screen bg-[#F1F4F8] flex justify-center text-[#131B2E] antialiased selection:bg-[#0057b8] selection:text-white">
      {/* Responsive App Shell (Mobile / Foldable / Tablet) */}
      <div className="w-full max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl min-h-screen bg-[#F7FAFE] sm:border-x border-[#E2E8F0] shadow-2xl flex flex-col relative">
        {loading ? (
          <div className="flex-1 flex flex-col bg-[#F7FAFE]">
            {/* Top Progress Bar */}
            <div className="h-0.5 w-full bg-blue-100 overflow-hidden">
              <div className="h-full w-1/3 bg-[#0057b8] animate-pulse rounded-full" />
            </div>

            {/* Header Skeleton */}
            <div className="px-3.5 sm:px-5 py-2.5 bg-white border-b border-slate-200/70 flex items-center justify-between gap-2 animate-pulse">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
                <div className="space-y-1.5">
                  <div className="w-24 h-2.5 bg-slate-200 rounded" />
                  <div className="w-36 h-3 bg-slate-200 rounded" />
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-9 h-9 rounded-full bg-slate-200" />
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="p-3.5 sm:p-5 space-y-3.5 flex-1">
              <div className="bg-white rounded-2xl border border-slate-200/70 p-3 space-y-2.5 animate-pulse">
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-8 bg-slate-200 rounded-xl" />
                  <div className="h-8 bg-slate-100 rounded-xl" />
                </div>
                <div className="h-9 bg-slate-100 rounded-xl" />
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/70 p-4 space-y-3 animate-pulse">
                <div className="w-32 h-3 bg-slate-200 rounded" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="rounded-2xl border border-slate-100 p-2 space-y-2">
                      <div className="w-full h-24 bg-slate-200 rounded-xl" />
                      <div className="w-3/4 h-3 bg-slate-200 rounded" />
                      <div className="w-1/2 h-2.5 bg-slate-100 rounded" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center pt-2 gap-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <div className="w-3.5 h-3.5 border-2 border-[#0057b8] border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải dữ liệu...</span>
                </div>
                {isSlowNetwork && (
                  <p className="text-[11px] text-amber-600 font-medium text-center">
                    Kết nối mạng đang chậm, vui lòng chờ thêm giây lát...
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : !user ? (
          <LoginPage />
        ) : (
          <>
            <HeaderBar
              onOpenNotifications={() => setShowNotifications(true)}
              onOpenProfile={() => handleNavigateTab('profile')}
              onOpenChangeCanteen={() => setShowChangeCanteenModal(true)}
            />

            <main className="flex-1 overflow-y-auto">
              {/* STUDENT VIEWS (5 Tabs - 1:1 Parallel Clone of Flutter UserMainNavigation) */}
              {currentRole === 'STUDENT' && (
                <>
                  {activeTab === 'menu' && <HomePage onGoToTab={handleNavigateTab} />}
                  {activeTab === 'wallet' && <WalletPage />}
                  {activeTab === 'qr' && <QRPassPage onNavigateTab={handleNavigateTab} />}
                  {activeTab === 'feedback' && <FeedbackPage />}
                  {activeTab === 'profile' && <ProfilePage onNavigateTab={handleNavigateTab} />}
                </>
              )}

              {/* PARENT VIEWS (5 Tabs - Theo dõi con, Thực đơn, Nạp ví, Góp ý Canteen, Cá nhân) */}
              {currentRole === 'PARENT' && (
                <>
                  {activeTab === 'profile' ? (
                    <ProfilePage onNavigateTab={handleNavigateTab} />
                  ) : activeTab === 'feedback' ? (
                    <FeedbackPage />
                  ) : (
                    <ParentPage activeSubTab={activeTab} onNavigateTab={handleNavigateTab} />
                  )}
                </>
              )}

              {/* STAFF VIEWS (4 Tabs - 1:1 Parallel Clone of Flutter AdminMainNavigation) */}
              {currentRole === 'STAFF' && (
                <>
                  {activeTab === 'profile' ? (
                    <ProfilePage onNavigateTab={handleNavigateTab} />
                  ) : (
                    <StaffPage activeSubTab={activeTab} onNavigateTab={handleNavigateTab} />
                  )}
                </>
              )}
            </main>

            <BottomNavigation activeTab={activeTab} onChangeTab={handleNavigateTab} />

            <NotificationModal
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />

            {/* Initial Canteen Selection Modal (Bắt buộc chọn cơ sở ngay từ đầu cho học sinh & phụ huynh) */}
            {(currentRole === 'STUDENT' || currentRole === 'PARENT') && (
              <SelectCanteenModal
                isOpen={!isCanteenConfirmed}
                isInitial={true}
                onClose={() => {}}
              />
            )}

            {/* Global Change Canteen Modal */}
            <SelectCanteenModal
              isOpen={showChangeCanteenModal}
              isInitial={false}
              onClose={() => setShowChangeCanteenModal(false)}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainScreen />
    </AppProvider>
  );
}
