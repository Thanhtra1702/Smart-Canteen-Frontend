import React, { useState, useEffect, useCallback } from 'react';
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

const resolveMiniAppTabFromUrl = (role: AppRole): TabKey => {
  if (typeof window === 'undefined') return role === 'STAFF' ? 'overview' : role === 'PARENT' ? 'children' : 'menu';
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

  return role === 'STAFF' ? 'overview' : role === 'PARENT' ? 'children' : 'menu';
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

  // Sync tab with URL on mount or role change, and listen to popstate
  useEffect(() => {
    const initial = resolveMiniAppTabFromUrl(currentRole);
    setActiveTab(initial);
    if (typeof window !== 'undefined') {
      const canonical = TAB_CANONICAL_URL[initial] || `/${initial}`;
      const url = new URL(window.location.href);
      url.pathname = canonical;
      url.hash = '';
      url.searchParams.delete('tab');
      const cleanSearch = url.searchParams.toString() ? `?${url.searchParams.toString()}` : '';
      window.history.replaceState({ tab: initial }, '', `${url.pathname}${cleanSearch}`);
    }

    const onPop = () => {
      setActiveTab(resolveMiniAppTabFromUrl(currentRole));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [currentRole]);

  return (
    <div className="min-h-screen bg-[#F1F4F8] flex justify-center text-[#131B2E] antialiased selection:bg-[#0057b8] selection:text-white">
      {/* Mobile Frame Container (Responsive 360px - 430px) */}
      <div className="w-full max-w-md min-h-screen bg-[#F7FAFE] border-x border-[#E2E8F0] shadow-2xl flex flex-col relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
            <div className="w-9 h-9 border-3 border-[#0057b8] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500">
              Đang khởi tạo Smart Canteen Zalo Mini App...
            </p>
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
