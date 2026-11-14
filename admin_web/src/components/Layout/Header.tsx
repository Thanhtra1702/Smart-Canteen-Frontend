import React, { useEffect, useState } from 'react';
import { RefreshCw, ChevronDown, Menu, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface HeaderProps {
  title: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onRefresh,
  isRefreshing = false,
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
        if (list.length > 0 && selectedCanteenId !== 'ALL' && !list.some((c: any) => c.id === selectedCanteenId)) {
          setSelectedCanteenId(list.length === 1 ? list[0].id : 'ALL');
        }
      } catch (err) {
        console.error('Failed to load canteens', err);
      }
    };
    fetchCanteens();
  }, [user]);

  return (
    <header className="h-14 bg-surface/95 backdrop-blur-xs border-b border-border sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 md:px-8">
      {/* Title & Context */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 -ml-1 text-muted hover:text-foreground hover:bg-slate-100 rounded-lg cursor-pointer shrink-0"
            title="Mở thanh điều hướng"
          >
            <Menu className="size-5" />
          </button>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-light font-normal hidden sm:flex shrink-0">
          <span>Smart Canteen</span>
          <span>/</span>
        </div>
        <h1 className="text-xs sm:text-sm md:text-base font-semibold text-foreground tracking-tight truncate">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Canteen Selector */}
        {user?.role === 'SUPER_ADMIN' ? (
          <div className="relative">
            <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-muted">
              <Building2 className="size-3.5" />
            </div>
            <select
              value={selectedCanteenId}
              onChange={(e) => setSelectedCanteenId(e.target.value)}
              className="h-8.5 pl-8 pr-7 bg-surface border border-border rounded-lg text-xs font-medium text-foreground hover:border-slate-300 focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/15 cursor-pointer appearance-none shadow-xs transition-colors max-w-[155px] sm:max-w-none truncate"
            >
              <option value="ALL">Toàn chuỗi Căn tin</option>
              {canteens.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="size-3 text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground-subtle bg-slate-50 px-3 py-1.5 rounded-lg border border-border truncate max-w-[150px] sm:max-w-none shadow-xs">
            <Building2 className="size-3 text-muted shrink-0" />
            <span className="truncate">{canteens.find((c) => c.id === selectedCanteenId)?.name || 'Cơ sở hiện tại'}</span>
          </span>
        )}

        {/* Refresh Action */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="size-8.5 rounded-lg text-muted hover:text-foreground hover:bg-slate-100 border border-border transition-colors cursor-pointer flex items-center justify-center outline-hidden disabled:opacity-50 shadow-xs"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </header>
  );
};
