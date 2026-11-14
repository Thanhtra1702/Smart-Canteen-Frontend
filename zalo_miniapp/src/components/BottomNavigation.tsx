import React from 'react';
import {
  UtensilsCrossed,
  Wallet,
  QrCode,
  Star,
  User,
  Users,
  BookOpen,
  ScanLine,
  ChefHat,
  MessageSquareHeart,
  LayoutDashboard,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export type TabKey =
  | 'menu'
  | 'wallet'
  | 'qr'
  | 'feedback'
  | 'profile'
  | 'children'
  | 'parent_menu'
  | 'parent_wallet'
  | 'overview'
  | 'scan'
  | 'serving'
  | 'users'
  | 'feedbacks'
  | 'staff_menu';

interface BottomNavigationProps {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onChangeTab }) => {
  const { currentRole, servingQueue, branchFeedbacks, activeOrders } = useApp();

  const waitingServingCount = servingQueue?.waitingQueue?.length || 0;
  const pendingFeedbacksCount = branchFeedbacks?.filter((f) => f.status === 'PENDING')?.length || 0;

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const pendingOrdersToday = activeOrders?.filter((o) => {
    if (o.status !== 'PENDING' && o.status !== 'CONFIRMED') return false;
    const ordDate = o.orderDate
      ? new Date(o.orderDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
      : (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) : todayStr);
    return ordDate === todayStr;
  }) || [];
  const hasPendingOrder = pendingOrdersToday.length > 0;

  // Active theme color (Cheero Blue: #0057b8)
  const primaryColor = '#0057b8';

  // ==========================================
  // STUDENT ROLE: 5 TABS WITH ELEVATED QR BUTTON (Clean & Minimalist)
  // ==========================================
  if (currentRole === 'STUDENT') {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(15,23,42,0.04)] z-40 safe-bottom"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-[62px] px-1 relative">
          {/* Tab 0: Đặt món */}
          <button
            type="button"
            onClick={() => onChangeTab('menu')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'menu' ? 'text-[#0057b8] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <UtensilsCrossed className={`w-5 h-5 transition-transform ${activeTab === 'menu' ? 'stroke-[2.5px] scale-105' : 'stroke-[1.75px]'}`} />
            <span className="text-[10px] mt-1 tracking-tight">Đặt món</span>
          </button>

          {/* Tab 1: Ví Canteen */}
          <button
            type="button"
            onClick={() => onChangeTab('wallet')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'wallet' ? 'text-[#0057b8] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Wallet className={`w-5 h-5 transition-transform ${activeTab === 'wallet' ? 'stroke-[2.5px] scale-105' : 'stroke-[1.75px]'}`} />
            <span className="text-[10px] mt-1 tracking-tight">Ví Canteen</span>
          </button>

          {/* Tab 2: Elevated Center QR Button (QR Nhận) */}
          <div className="w-16 flex flex-col items-center justify-center relative">
            <button
              type="button"
              onClick={() => onChangeTab('qr')}
              className={`absolute -top-5 w-12 h-12 rounded-full bg-[#0057b8] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(0,87,184,0.35)] hover:bg-[#004593] active:scale-90 transition-all cursor-pointer border-[2.5px] border-white ${
                hasPendingOrder ? 'ring-4 ring-[#0057b8]/20' : ''
              }`}
              title="QR Nhận Suất Ăn"
            >
              <QrCode className="w-6 h-6 stroke-[2.2px]" />
              {hasPendingOrder && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 text-white text-[9px] font-black rounded-full border-2 border-white flex items-center justify-center shadow-xs">
                  {pendingOrdersToday.length}
                </span>
              )}
            </button>
            <span
              className={`text-[10px] mt-7.5 tracking-tight font-bold transition-colors ${
                activeTab === 'qr' ? 'text-[#0057b8]' : 'text-slate-600'
              }`}
            >
              QR Nhận
            </span>
          </div>

          {/* Tab 3: Đánh giá CSAT */}
          <button
            type="button"
            onClick={() => onChangeTab('feedback')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'feedback' ? 'text-[#0057b8] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Star className={`w-5 h-5 transition-transform ${activeTab === 'feedback' ? 'fill-amber-400 text-amber-500 scale-105' : 'stroke-[1.75px]'}`} />
            <span className="text-[10px] mt-1 tracking-tight">Đánh giá</span>
          </button>

          {/* Tab 4: Tài khoản */}
          <button
            type="button"
            onClick={() => onChangeTab('profile')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'profile' ? 'text-[#0057b8] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <User className={`w-5 h-5 transition-transform ${activeTab === 'profile' ? 'stroke-[2.5px] scale-105' : 'stroke-[1.75px]'}`} />
            <span className="text-[10px] mt-1 tracking-tight">Tài khoản</span>
          </button>
        </div>
      </nav>
    );
  }

  // ==========================================
  // PARENT ROLE: 5 TABS (Clean & Minimalist)
  // ==========================================
  if (currentRole === 'PARENT') {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(15,23,42,0.04)] z-40 safe-bottom"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-[62px] px-1">
          {/* Tab 0: Theo dõi con */}
          <button
            type="button"
            onClick={() => onChangeTab('children')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'children' ? 'text-[#0057b8] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Users className={`w-5 h-5 transition-transform ${activeTab === 'children' ? 'stroke-[2.5px] scale-105' : 'stroke-[1.75px]'}`} />
            <span className="text-[10px] mt-1 tracking-tight">Theo dõi con</span>
          </button>

          {/* Tab 1: Thực đơn con */}
          <button
            type="button"
            onClick={() => onChangeTab('parent_menu')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'parent_menu' ? 'text-[#0057b8] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <BookOpen className={`w-5 h-5 transition-transform ${activeTab === 'parent_menu' ? 'stroke-[2.5px] scale-105' : 'stroke-[1.75px]'}`} />
            <span className="text-[10px] mt-1 tracking-tight">Thực đơn</span>
          </button>

          {/* Tab 2: Nạp ví cho con */}
          <button
            type="button"
            onClick={() => onChangeTab('parent_wallet')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'parent_wallet' ? 'text-[#0057b8] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Wallet className={`w-5 h-5 transition-transform ${activeTab === 'parent_wallet' ? 'stroke-[2.5px] scale-105' : 'stroke-[1.75px]'}`} />
            <span className="text-[10px] mt-1 tracking-tight">Nạp ví</span>
          </button>

          {/* Tab 3: Góp ý & Yêu cầu Canteen */}
          <button
            type="button"
            onClick={() => onChangeTab('feedback')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'feedback' ? 'text-[#0057b8] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <MessageSquareHeart className={`w-5 h-5 transition-transform ${activeTab === 'feedback' ? 'stroke-[2.5px] scale-105' : 'stroke-[1.75px]'}`} />
            <span className="text-[10px] mt-1 tracking-tight">Góp ý</span>
          </button>

          {/* Tab 4: Cá nhân */}
          <button
            type="button"
            onClick={() => onChangeTab('profile')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'profile' ? 'text-[#0057b8] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <User className={`w-5 h-5 transition-transform ${activeTab === 'profile' ? 'stroke-[2.5px] scale-105' : 'stroke-[1.75px]'}`} />
            <span className="text-[10px] mt-1 tracking-tight">Cá nhân</span>
          </button>
        </div>
      </nav>
    );
  }

  // ==========================================
  // STAFF / BRANCH ADMIN ROLE: 5 TABS (Clean & Minimalist)
  // ==========================================
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(15,23,42,0.04)] z-40 safe-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-[62px] px-1">
        {/* Tab 0: Doanh thu & Vận hành (Tổng quan) */}
        <button
          type="button"
          onClick={() => onChangeTab('overview')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer active:scale-95 ${
            activeTab === 'overview' ? 'text-[#0057b8] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 transition-transform ${activeTab === 'overview' ? 'stroke-[2.5px] scale-105' : 'stroke-[1.75px]'}`} />
          <span className="text-[10px] mt-1 tracking-tight">Tổng quan</span>
        </button>

        {/* Tab 1: Thực đơn cơ sở (Xem món & Chụp ảnh) */}
        <button
          type="button"
          onClick={() => onChangeTab('staff_menu')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer active:scale-95 ${
            activeTab === 'staff_menu' ? 'text-[#0057b8] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <UtensilsCrossed className={`w-5 h-5 transition-transform ${activeTab === 'staff_menu' ? 'stroke-[2.5px] scale-105' : 'stroke-[1.75px]'}`} />
          <span className="text-[10px] mt-1 tracking-tight">Thực đơn</span>
        </button>

        {/* Tab 2: Quét QR */}
        <button
          type="button"
          onClick={() => onChangeTab('scan')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer active:scale-95 ${
            activeTab === 'scan' ? 'text-[#0057b8] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <ScanLine className={`w-5 h-5 transition-transform ${activeTab === 'scan' ? 'stroke-[2.5px] scale-105' : 'stroke-[1.75px]'}`} />
          <span className="text-[10px] mt-1 tracking-tight">Quét QR</span>
        </button>

        {/* Tab 3: Người dùng cơ sở */}
        <button
          type="button"
          onClick={() => onChangeTab('users')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer relative active:scale-95 ${
            activeTab === 'users' ? 'text-[#0057b8] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Users className={`w-5 h-5 transition-transform ${activeTab === 'users' ? 'stroke-[2.5px] scale-105' : 'stroke-[1.75px]'}`} />
          <span className="text-[10px] mt-1 tracking-tight">Người dùng</span>
        </button>

        {/* Tab 4: Đánh giá CSAT */}
        <button
          type="button"
          onClick={() => onChangeTab('feedbacks')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer relative active:scale-95 ${
            activeTab === 'feedbacks' ? 'text-[#0057b8] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <MessageSquareHeart className={`w-5 h-5 transition-transform ${activeTab === 'feedbacks' ? 'stroke-[2.5px] scale-105' : 'stroke-[1.75px]'}`} />
            {pendingFeedbacksCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                {pendingFeedbacksCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">CSAT</span>
        </button>
      </div>
    </nav>
  );
};
