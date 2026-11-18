import React, { useState } from 'react';
import {
  MapPinIcon as MapPin,
  BellIcon as Bell,
  LockIcon as Lock,
  CaretDownIcon as ChevronDown,
  UserIcon as User,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import logoImg from '../../../admin_web/src/assets/logo.png';

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
    brand,
  } = useApp();

  const [showLockDialog, setShowLockDialog] = useState(false);

  const isBranchAdmin = currentRole === 'STAFF' || user?.role === 'ADMIN';
  const branchName = selectedCanteen?.name || user?.canteen?.name || 'Cơ sở của bạn';

  return (
    <header className="sticky top-0 bg-white/95 backdrop-blur-md z-40 shadow-[0_1px_3px_rgba(0,0,0,0.03)] border-b border-slate-200/70 safe-top">
      <div className="px-3.5 sm:px-5 pt-2.5 pb-2.5 space-y-2">
        {/* Row 1: Logo Top-Left & Actions Top-Right */}
        <div className="flex items-center justify-between gap-2">
          {brand?.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt={brand?.brandName || 'Mino Smart Canteen'}
              className="h-8 sm:h-9 w-auto max-w-[150px] object-contain mix-blend-multiply"
            />
          ) : (
            <div className="h-9 w-[132px] sm:h-10 sm:w-[148px] overflow-hidden flex items-center justify-center shrink-0 -ml-0.5">
              <img
                src={logoImg}
                alt={brand?.brandName || 'Mino Smart Canteen'}
                className="w-full h-full object-contain scale-[1.85] translate-y-[1.5%] mix-blend-multiply"
              />
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenNotifications}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-700 transition-all cursor-pointer active:scale-95 shrink-0"
              title="Thông báo"
              aria-label="Thông báo"
            >
              <Bell className="w-4.5 h-4.5" />
            </button>

            <button
              type="button"
              onClick={onOpenProfile}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-700 transition-all cursor-pointer active:scale-95 shrink-0"
              title="Thông tin tài khoản"
              aria-label="Thông tin tài khoản"
            >
              <User className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Canteen Selector Bar Below */}
        {isBranchAdmin ? (
          <div className="w-full rounded-2xl bg-slate-50/90 border border-slate-200/70 px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <MapPin weight="fill" className="w-4 h-4 text-[#0057b8] shrink-0" />
              <div className="min-w-0">
                <span className="block text-[10px] font-medium text-slate-400 leading-tight">
                  Cơ sở phục vụ
                </span>
                <span className="block text-xs font-bold text-slate-900 truncate" title={branchName}>
                  {branchName}
                </span>
              </div>
            </div>
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => (onOpenChangeCanteen ? onOpenChangeCanteen() : setShowLockDialog(true))}
            className="w-full rounded-2xl bg-slate-50/90 hover:bg-slate-100/80 border border-slate-200/70 px-3 py-2 flex items-center gap-2.5 text-left transition cursor-pointer active:scale-[0.99] focus:outline-none"
            title="Đổi cơ sở canteen phục vụ"
          >
            <MapPin weight="fill" className="w-4 h-4 text-[#0057b8] shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium text-slate-400 leading-tight">
                Cơ sở phục vụ
              </span>
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-xs font-bold text-slate-900 truncate">{branchName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </div>
            </div>
          </button>
        )}
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
