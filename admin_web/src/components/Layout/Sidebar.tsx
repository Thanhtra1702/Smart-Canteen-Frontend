import React from 'react';
import {
  LayoutDashboard,
  Building2,
  UtensilsCrossed,
  Boxes,
  Wallet,
  Users,
  MessageSquareQuote,
  LogOut,
  ChefHat,
  Package,
  Tv,
  X,
  ShieldCheck,
  Lock,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBrand } from '../../context/BrandContext';

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
}

interface NavSection {
  title: string;
  items: {
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
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
}) => {
  const { user, logout, hasPermission } = useAuth();
  const { brand, openBrandModal } = useBrand();

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
        { id: 'serving', label: 'Màn hình quầy gắp', icon: Tv, permission: 'SERVING_OPERATION' },
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
        className={`w-64 bg-surface text-foreground flex flex-col h-screen fixed left-0 top-0 border-r border-border z-40 select-none transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt={brand.brandName}
                className="size-8 rounded-lg object-contain bg-surface border border-border p-0.5 shrink-0 shadow-xs"
              />
            ) : (
              <div className="size-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                <ChefHat className="size-4.5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-foreground text-sm tracking-tight block truncate" title={brand.brandName}>
                {brand.brandName}
              </span>
              <span className="text-[11px] text-muted block truncate font-normal" title={brand.brandSubtitle}>
                {brand.brandSubtitle}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
              <button
                type="button"
                onClick={openBrandModal}
                title="Cấu hình thương hiệu & Logo"
                className="p-1.5 text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
              >
                <Settings className="size-4" />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-slate-100 cursor-pointer"
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
                <div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-light">
                  {section.title}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    const isLocked = Boolean(item.permission && user?.role === 'ADMIN' && !hasPermission(item.permission));

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentTab(item.id);
                          onClose?.();
                        }}
                        title={isLocked ? `Chưa được cấp quyền ${item.permission}` : item.label}
                        className={`w-full flex h-8.5 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-xs font-medium transition-all outline-hidden ${
                          isActive
                            ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs'
                            : isLocked
                            ? 'text-muted-light hover:text-muted hover:bg-slate-50 border border-transparent'
                            : 'text-foreground-subtle hover:text-foreground hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <Icon
                          className={`size-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-primary'
                              : isLocked
                              ? 'text-muted-light'
                              : 'text-muted'
                          }`}
                        />
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {isLocked ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0 font-normal"
                            title={`Cần quyền ${item.permission}`}
                          >
                            <Lock className="size-2.5" />
                            <span>Khóa</span>
                          </span>
                        ) : (
                          item.badge !== undefined && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10.5px] font-semibold tabular-nums border bg-rose-50 text-rose-700 border-rose-200 shrink-0">
                              {item.badge}
                            </span>
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
          <div className="flex items-center justify-between gap-2.5">
            <div className="relative">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary">
                {user?.fullName?.charAt(0) || 'A'}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">
                {user?.fullName || 'Quản trị viên'}
              </p>
              <p className="text-[11px] text-muted truncate">
                {user?.role === 'SUPER_ADMIN' ? 'Admin Tổng HQ' : 'Admin cơ sở'}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer outline-hidden"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
