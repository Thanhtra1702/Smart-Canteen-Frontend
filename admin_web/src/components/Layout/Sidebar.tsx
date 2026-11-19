import React from 'react';
import {
  SquaresFourIcon as LayoutDashboard,
  BuildingsIcon as Building2,
  ForkKnifeIcon as UtensilsCrossed,
  CubeIcon as Boxes,
  WalletIcon as Wallet,
  UsersIcon as Users,
  ChatCircleDotsIcon as MessageSquareQuote,
  SignOutIcon as LogOut,
  ChefHatIcon as ChefHat,
  PackageIcon as Package,
  XIcon as X,
  ShieldCheckIcon as ShieldCheck,
  LockIcon as Lock,
  SidebarSimpleIcon as SidebarSimple,
  UserIcon as User,
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import logoImg from '../../assets/logo.png';

export type TabType =
  | 'dashboard'
  | 'serving'
  | 'canteens'
  | 'packages'
  | 'forecast'
  | 'menu'
  | 'inventory'
  | 'finance'
  | 'users'
  | 'feedbacks'
  | 'audit-logs';

interface SidebarProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  lowStockCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavSection {
  title: string;
  items: {
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' }>;
    badge?: number;
    roles?: string[];
    permission?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  lowStockCount = 0,
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user, logout, hasPermission } = useAuth();

  const navSections: NavSection[] = [
    {
      title: 'TỔNG QUAN',
      items: [
        { id: 'dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard },
      ],
    },
    {
      title: 'VẬN HÀNH BẾP',
      items: [
        { id: 'menu', label: 'Thực đơn món ăn', icon: UtensilsCrossed, permission: 'MENU_MANAGEMENT' },
        {
          id: 'inventory',
          label: 'Kho nguyên liệu',
          icon: Boxes,
          permission: 'INVENTORY_MANAGEMENT',
          badge: lowStockCount > 0 ? lowStockCount : undefined,
        },
        { id: 'forecast', label: 'Dự báo suất ăn', icon: ChefHat, permission: 'INVENTORY_MANAGEMENT' },
      ],
    },
    {
      title: 'QUẢN TRỊ HỆ THỐNG',
      items: [
        { id: 'canteens', label: 'Cơ sở Canteen', icon: Building2, permission: 'CANTEEN_CONFIG' },
        { id: 'packages', label: 'Gói ăn & Vé tháng', icon: Package, permission: 'PACKAGE_MANAGEMENT' },
        { id: 'users', label: 'Tài khoản & Học sinh', icon: Users },
        { id: 'finance', label: 'Tài chính & Đối soát', icon: Wallet, permission: 'FINANCE_VIEW' },
        { id: 'feedbacks', label: 'Đánh giá CSAT', icon: MessageSquareQuote, permission: 'FEEDBACK_RESOLVE' },
        { id: 'audit-logs', label: 'Nhật ký kiểm toán', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },
      ],
    },
  ];

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`w-64 ${
          isCollapsed ? 'lg:w-[76px]' : 'lg:w-64'
        } bg-surface text-foreground flex flex-col h-screen fixed left-0 top-0 border-r border-border z-40 select-none transition-all duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header (Synced with Mino branding) */}
        <div
          className={`h-14 flex items-center ${
            isCollapsed ? 'justify-between lg:justify-center px-3.5 lg:px-0' : 'justify-between px-3.5'
          } border-b border-slate-200/80 bg-white shrink-0`}
        >
          <div className={`flex items-center gap-2 min-w-0 flex-1 ${isCollapsed ? 'lg:hidden' : ''}`}>
            <div className="h-10 w-[132px] flex items-center justify-center shrink-0">
              <img
                src={logoImg}
                alt="Mino Smart Canteen"
                className="w-full h-full object-contain scale-[1.28] mix-blend-multiply"
              />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#0057b8] shrink-0">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
                aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
                className={`hidden lg:inline-flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                  isCollapsed
                    ? 'size-9 text-[#0057b8] bg-[#EFF6FF]/80 hover:bg-[#EFF6FF]'
                    : 'p-1.5 text-slate-400 hover:text-[#0057b8] hover:bg-[#EFF6FF]'
                }`}
              >
                <SidebarSimple weight={isCollapsed ? 'fill' : 'regular'} className="size-5" />
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden p-1.5 text-muted hover:text-foreground rounded-xl hover:bg-slate-100 cursor-pointer shrink-0"
                aria-label="Đóng thanh điều hướng"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-4 overflow-y-auto scrollbar-clean">
          {navSections.map((section, idx) => {
            const visibleItems = section.items.filter(
              (item) => !item.roles || (user && item.roles.includes(user.role))
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <div
                  className={`px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-light ${
                    isCollapsed ? 'lg:hidden' : ''
                  }`}
                >
                  {section.title}
                </div>
                {isCollapsed && idx > 0 && (
                  <div className="hidden lg:block h-px bg-slate-100 mx-2 my-1.5" />
                )}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    const isLocked = Boolean(item.permission && user?.role === 'ADMIN' && !hasPermission(item.permission));

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setCurrentTab(item.id);
                          onClose?.();
                        }}
                        title={isLocked ? `${item.label} (Chưa cấp quyền)` : item.label}
                        className={`relative w-full flex h-10 cursor-pointer items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all outline-hidden ${
                          isCollapsed ? 'lg:w-11 lg:h-11 lg:mx-auto lg:justify-center lg:px-0' : ''
                        } ${
                          isActive
                            ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs'
                            : isLocked
                            ? 'text-muted-light hover:text-muted hover:bg-slate-50 border border-transparent'
                            : 'text-foreground-subtle hover:text-foreground hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <Icon
                          weight={isActive ? 'fill' : 'regular'}
                          className={`size-5 shrink-0 transition-colors ${
                            isActive
                              ? 'text-primary'
                              : isLocked
                              ? 'text-muted-light'
                              : 'text-muted'
                          }`}
                        />
                        <span className={`flex-1 text-left truncate ${isCollapsed ? 'lg:hidden' : ''}`}>
                          {item.label}
                        </span>
                        {isLocked ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0 font-normal ${
                              isCollapsed ? 'lg:hidden' : ''
                            }`}
                            title={`Cần quyền ${item.permission}`}
                          >
                            <Lock className="size-2.5" />
                            <span>Khóa</span>
                          </span>
                        ) : (
                          item.badge !== undefined && (
                            <>
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[11px] font-semibold tabular-nums border bg-rose-50 text-rose-700 border-rose-200 shrink-0 ${
                                  isCollapsed ? 'lg:hidden' : ''
                                }`}
                              >
                                {item.badge}
                              </span>
                              {isCollapsed && (
                                <span className="hidden lg:flex absolute top-1 right-1 min-w-4 h-4 px-1 items-center justify-center rounded-full text-[10px] font-bold tabular-nums bg-rose-500 text-white">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer / User Profile & Logout */}
        <div className="p-3 border-t border-border bg-surface shrink-0">
          <div
            className={`flex items-center justify-between gap-2.5 ${
              isCollapsed ? 'lg:flex-col lg:justify-center lg:gap-2' : ''
            }`}
          >
            <div
              className="relative shrink-0"
              title={user?.fullName || 'Quản trị viên'}
            >
              <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <User weight="fill" className="size-[18px]" />
              </div>
            </div>
            <div className={`min-w-0 flex-1 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <p className="text-[13px] font-semibold text-foreground truncate">
                {user?.fullName || 'Quản trị viên'}
              </p>
              <p className="text-xs text-muted truncate">
                {user?.role === 'SUPER_ADMIN' ? 'Admin Tổng HQ' : 'Admin cơ sở'}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-2 text-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer outline-hidden shrink-0"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
