import React, { useState } from 'react';
import {
  Utensils,
  MapPin,
  Bell,
  User,
  Lock,
  ArrowLeftRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderBarProps {
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenChangeCanteen?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onOpenNotifications,
  onOpenProfile,
  onOpenChangeCanteen,
}) => {
  const {
    selectedCanteen,
    user,
    currentRole,
    switchRole,
    brand,
  } = useApp();

  const [showLockDialog, setShowLockDialog] = useState(false);

  const isBranchAdmin = currentRole === 'STAFF' || user?.role === 'ADMIN';
  const branchName = selectedCanteen?.name || user?.canteen?.name || 'Cơ sở của bạn';

  return (
    <header className="sticky top-0 bg-white/95 backdrop-blur-md z-40 shadow-[0_1px_3px_rgba(0,0,0,0.03)] border-b border-slate-200/70 safe-top">
      {/* 1. Brand & Location Top Bar (Clean & Minimalist) */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Brand Icon / Logo Box */}
          {brand?.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt={brand.brandName || 'Logo'}
              className="w-9 h-9 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shrink-0 shadow-2xs"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 border border-blue-100 text-[#0057b8]">
              <Utensils className="w-4.5 h-4.5" />
            </div>
          )}

          {/* Brand Name & Canteen Branch Dropdown */}
          <div className="min-w-0">
            <span
              className="block text-[9.5px] font-bold tracking-wider text-[#0057b8] uppercase leading-none mb-1 max-w-[160px] truncate"
              title={brand?.brandName || 'SMART CANTEEN'}
            >
              {(brand?.brandName || 'SMART CANTEEN').toUpperCase()}
            </span>
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {isBranchAdmin ? (
                /* Admin cơ sở */
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    className="text-xs font-bold text-slate-800 max-w-[170px] truncate"
                    title={branchName}
                  >
                    {branchName}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
                    <Lock className="w-2.5 h-2.5 text-slate-400" />
                  </span>
                </div>
              ) : (
                /* Học sinh & Phụ huynh: Chạm để xem giải thích hoặc đổi trong Cài đặt */
                <button
                  type="button"
                  onClick={() => setShowLockDialog(true)}
                  className="flex items-center gap-1.5 min-w-0 text-left group cursor-pointer focus:outline-none"
                  title="Cơ sở được cố định để tránh đặt nhầm món. Chạm để xem chi tiết."
                >
                  <span className="text-xs font-bold text-slate-800 max-w-[145px] truncate group-hover:text-[#0057b8] transition-colors">
                    {branchName}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-slate-500 bg-slate-100 group-hover:bg-blue-50 group-hover:text-[#0057b8] px-1.5 py-0.5 rounded-full shrink-0 transition-colors">
                    <Lock className="w-2.5 h-2.5 text-slate-400 group-hover:text-[#0057b8]" />
                    <span>Cơ sở</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions: Quick Role Switcher + Notification Bell + Profile Avatar */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => switchRole(currentRole === 'STUDENT' ? 'PARENT' : 'STUDENT')}
            className={`px-2 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border ${
              currentRole === 'STUDENT'
                ? 'bg-blue-50 text-[#0057b8] border-blue-200 hover:bg-blue-100'
                : currentRole === 'PARENT'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
            }`}
            title="Chạm để chuyển đổi nhanh giữa Học sinh và Phụ huynh"
          >
            <span>{currentRole === 'STUDENT' ? '👦 Học sinh' : currentRole === 'PARENT' ? '👨‍👩‍👦 Phụ huynh' : '👨‍🍳 Cơ sở'}</span>
            <ArrowLeftRight className="w-2.5 h-2.5 opacity-60" />
          </button>
          <button
            type="button"
            onClick={onOpenNotifications}
            className="w-9 h-9 rounded-full bg-slate-100/80 hover:bg-slate-200/80 flex items-center justify-center text-slate-600 transition-all cursor-pointer active:scale-95 relative"
            title="Thông báo"
            aria-label="Thông báo"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 hover:border-[#0057b8] flex items-center justify-center text-[#0057b8] transition-all cursor-pointer font-bold text-xs active:scale-95 shadow-2xs"
            title="Tài khoản"
            aria-label="Tài khoản cá nhân"
          >
            {user?.fullName ? (
              user.fullName.split(' ').slice(-1)[0][0]
            ) : (
              <User className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Lock Notice Modal */}
      {showLockDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 space-y-4 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#003E82] flex items-center justify-center mx-auto border border-[#D0E7FF]">
              <Lock className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h4 className="text-sm font-black text-[#131B2E]">Cơ sở đã được cố định</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bạn đang xem và đặt món tại <strong className="text-[#003E82]">{branchName}</strong>. Cơ sở được khóa cố định nhằm tránh học sinh/phụ huynh đặt nhầm món tại trường khác.
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowLockDialog(false);
                  if (onOpenChangeCanteen) {
                    onOpenChangeCanteen();
                  } else if (onOpenProfile) {
                    onOpenProfile();
                  }
                }}
                className="w-full py-2.5 px-3 rounded-2xl bg-[#003E82] hover:bg-[#004b8c] text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                Thay đổi cơ sở phục vụ
              </button>
              <button
                type="button"
                onClick={() => setShowLockDialog(false)}
                className="w-full py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
              >
                Đã hiểu, giữ cơ sở này
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
