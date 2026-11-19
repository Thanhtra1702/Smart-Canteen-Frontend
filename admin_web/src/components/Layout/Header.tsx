import React, { useEffect, useState } from 'react';
import { ListIcon as Menu, BuildingsIcon as Building2 } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { SelectDropdown } from '../ui/SelectDropdown';

interface HeaderProps {
  title: string;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onToggleSidebar,
}) => {
  const { user, selectedCanteenId, setSelectedCanteenId } = useAuth();
  const [canteens, setCanteens] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchCanteens = async () => {
      try {
        const endpoint = user?.role === 'SUPER_ADMIN' ? '/admin-hq/canteens' : '/canteens';
        const res = await api.get(endpoint);
        const list = Array.isArray(res.data) ? res.data : [];
        setCanteens(list);
      } catch (err) {
        console.error('Failed to load canteens', err);
      }
    };
    fetchCanteens();
  }, [user]);

  useEffect(() => {
    if (
      canteens.length > 0 &&
      selectedCanteenId !== 'ALL' &&
      !canteens.some((c) => c.id === selectedCanteenId)
    ) {
      setSelectedCanteenId(canteens.length === 1 ? canteens[0].id : 'ALL');
    }
  }, [canteens, selectedCanteenId, setSelectedCanteenId]);

  return (
    <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 md:px-8">
      {/* Title & Context */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 -ml-1 text-muted hover:text-foreground hover:bg-slate-100 rounded-xl cursor-pointer shrink-0"
            title="Mở thanh điều hướng"
          >
            <Menu className="size-5" />
          </button>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-light font-normal hidden sm:flex shrink-0">
          <span>Mino Admin</span>
          <span>/</span>
        </div>
        <h1 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 tracking-tight truncate">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Canteen Selector */}
        {user?.role === 'SUPER_ADMIN' ? (
          <SelectDropdown
            value={selectedCanteenId}
            onChange={setSelectedCanteenId}
            align="right"
            className="w-[180px] sm:w-[250px]"
            buttonClassName="bg-slate-50/80 hover:bg-white font-semibold shadow-2xs"
            menuClassName="min-w-[260px]"
            icon={<Building2 className="size-3.5 text-[#0057b8]" />}
            options={[
              { value: 'ALL', label: 'Toàn chuỗi Căn tin' },
              ...canteens.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50/90 px-3 py-1.5 rounded-xl border border-slate-200/80 truncate max-w-[160px] sm:max-w-none shadow-2xs">
            <Building2 className="size-3.5 text-[#0057b8] shrink-0" />
            <span className="truncate">{canteens.find((c) => c.id === selectedCanteenId)?.name || 'Cơ sở hiện tại'}</span>
          </span>
        )}
      </div>
    </header>
  );
};
