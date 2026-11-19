import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PlusIcon as Plus,
  UsersIcon as Users,
  XIcon as X,
  TelevisionIcon as Tv,
  CopyIcon as Copy,
  CheckIcon as Check,
  MagnifyingGlassIcon as Search,
  PencilSimpleIcon as Edit2,
  SlidersHorizontalIcon as SlidersHorizontal,
  EyeIcon as Eye,
  WarningIcon as AlertTriangle,
  CaretUpDownIcon as ChevronsUpDown,
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { TimePickerButton } from '../components/ui/TimePickerButton';
import { useToast } from '../context/ToastContext';

export const CanteensPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { toast } = useToast();
  const [canteens, setCanteens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Search, Filter & Sort State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortField, setSortField] = useState<'name' | 'isActive'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Detail & Copy State
  const [selectedCanteen, setSelectedCanteen] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State for Add Canteen
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [bankBin] = useState('970422');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [standardMealPrice, setStandardMealPrice] = useState('30000');
  const [maxDishes, setMaxDishes] = useState('3');
  const [bufferMarginPercent] = useState('10');
  const [cutoffBreakfast] = useState('07:00');
  const [cutoffLunch] = useState('10:30');
  const [cutoffDinner] = useState('16:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Canteen State
  const [editCanteen, setEditCanteen] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotificationEmail, setEditNotificationEmail] = useState('');
  const [editBankBin, setEditBankBin] = useState('970422');
  const [editBankAccountNumber, setEditBankAccountNumber] = useState('');
  const [editBankAccountName, setEditBankAccountName] = useState('');
  const [editMaxDishes, setEditMaxDishes] = useState('3');
  const [editStandardMealPrice, setEditStandardMealPrice] = useState('30000');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Staff (Branch Admin) Management State
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffFullName, setStaffFullName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffCanteenId, setStaffCanteenId] = useState('');
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  // Config Modal State
  const [configCanteen, setConfigCanteen] = useState<any | null>(null);
  const [editMargin, setEditMargin] = useState('10');
  const [editBreakfast, setEditBreakfast] = useState('07:00');
  const [editLunch, setEditLunch] = useState('10:30');
  const [editDinner, setEditDinner] = useState('16:00');
  const [editConfigMaxDishes, setEditConfigMaxDishes] = useState('3');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Archive / Toggle Status Confirmation State
  const [confirmCanteen, setConfirmCanteen] = useState<any | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const fetchCanteens = useCallback(async () => {
    try {
      setLoading(true);
      let data: any[] = [];
      if (isSuperAdmin) {
        const res = await api.get('/admin-hq/canteens');
        data = Array.isArray(res.data) ? res.data : res.data?.items || [];
      } else {
        const res = await api.get('/canteens');
        const all = Array.isArray(res.data) ? res.data : res.data?.items || [];
        data = user?.canteenId ? all.filter((c: any) => c.id === user.canteenId) : all;
      }
      setCanteens(data);
    } catch (err) {
      console.error('Failed to load canteens', err);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, user]);

  const fetchStaff = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await api.get('/admin-hq/staff');
      setStaffList(res.data || []);
    } catch (err) {
      console.error('Failed to load branch admins', err);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchCanteens();
    fetchStaff();
  }, [fetchCanteens, fetchStaff]);

  const getMaxDishes = (c: any) => c?.mealPrices?.[0]?.maxDishes ?? c?.maxDishes ?? 3;
  const getStandardMealPrice = (c: any) =>
    Number(c?.mealPrices?.[0]?.price ?? c?.standardMealPrice ?? 30000);
  const formatVND = (num: number) => `${Math.round(num || 0).toLocaleString('vi-VN')} đ`;

  const toggleSort = (field: 'name' | 'isActive') => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'isActive' ? 'desc' : 'asc');
    }
  };

  const handleCopyDisplayUrl = (c: any) => {
    const url = `${window.location.origin}/display/${c.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 1800);
    toast.success(`Đã sao chép link màn hình quầy của ${c.name}`);
  };

  const filteredCanteens = useMemo(() => {
    const q = search.toLowerCase().trim();
    const factor = sortDir === 'asc' ? 1 : -1;

    return canteens
      .filter((c) => {
        const matchStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'ACTIVE' && c.isActive) ||
          (statusFilter === 'INACTIVE' && !c.isActive);

        const matchSearch =
          !q ||
          c.name?.toLowerCase().includes(q) ||
          c.address?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.notificationEmail?.toLowerCase().includes(q);

        return matchStatus && matchSearch;
      })
      .sort((a, b) => {
        if (sortField === 'isActive') {
          return ((a.isActive ? 1 : 0) - (b.isActive ? 1 : 0)) * factor;
        }
        return String(a.name || '').localeCompare(String(b.name || ''), 'vi') * factor;
      });
  }, [canteens, statusFilter, search, sortField, sortDir]);

  const counts = useMemo(
    () => ({
      all: canteens.length,
      active: canteens.filter((c) => c.isActive).length,
      inactive: canteens.filter((c) => !c.isActive).length,
    }),
    [canteens]
  );

  const handleConfirmToggleStatus = async () => {
    if (!confirmCanteen) return;
    try {
      setIsTogglingStatus(true);
      const targetStatus = !confirmCanteen.isActive;
      await api.patch(`/admin-hq/canteens/${confirmCanteen.id}/status`, {
        isActive: targetStatus,
      });
      toast.success(`Đã ${targetStatus ? 'kích hoạt' : 'tạm đóng'} cơ sở ${confirmCanteen.name}!`);
      setConfirmCanteen(null);
      fetchCanteens();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật trạng thái cơ sở');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const openEditModal = (c: any) => {
    setEditCanteen(c);
    setEditName(c.name || '');
    setEditAddress(c.address || '');
    setEditDescription(c.description || '');
    setEditNotificationEmail(c.notificationEmail || '');
    setEditBankBin(c.bankBin || '970422');
    setEditBankAccountNumber(c.bankAccountNumber || '');
    setEditBankAccountName(c.bankAccountName || '');
    setEditMaxDishes(String(getMaxDishes(c)));
    setEditStandardMealPrice(String(getStandardMealPrice(c)));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCanteen || !editName.trim()) return;

    try {
      setIsSavingEdit(true);
      await api.patch(`/admin-hq/canteens/${editCanteen.id}`, {
        name: editName.trim(),
        address: editAddress,
        description: editDescription,
        notificationEmail: editNotificationEmail,
        bankBin: editBankBin,
        bankAccountNumber: editBankAccountNumber,
        bankAccountName: editBankAccountName,
        maxDishes: Number(editMaxDishes) || 3,
        standardMealPrice: Number(editStandardMealPrice) || 30000,
      });
      toast.success('Cập nhật thông tin cơ sở thành công!');
      setEditCanteen(null);
      fetchCanteens();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật cơ sở');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openConfigModal = (c: any) => {
    setConfigCanteen(c);
    setEditMargin(String(c.bufferMarginPercent ?? 10));
    setEditBreakfast(c.cutoffBreakfast || '07:00');
    setEditLunch(c.cutoffLunch || '10:30');
    setEditDinner(c.cutoffDinner || '16:00');
    setEditConfigMaxDishes(String(getMaxDishes(c)));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configCanteen) return;

    try {
      setIsSavingConfig(true);
      await api.patch(`/admin-hq/canteens/${configCanteen.id}/config`, {
        bufferMarginPercent: Number(editMargin),
        cutoffBreakfast: editBreakfast,
        cutoffLunch: editLunch,
        cutoffDinner: editDinner,
        maxDishes: Number(editConfigMaxDishes) || 3,
      });
      toast.success('Lưu cấu hình cơ sở thành công!');
      setConfigCanteen(null);
      fetchCanteens();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi lưu cấu hình');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmail || !staffPassword || !staffFullName || !staffCanteenId) return;

    try {
      setIsCreatingStaff(true);
      await api.post('/admin-hq/staff', {
        email: staffEmail,
        password: staffPassword,
        fullName: staffFullName,
        phone: staffPhone || undefined,
        canteenId: staffCanteenId,
      });
      toast.success('Tạo tài khoản Admin cơ sở thành công!');
      setStaffEmail('');
      setStaffPassword('');
      setStaffFullName('');
      setStaffPhone('');
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi tạo tài khoản');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const handleCreateCanteen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      setIsSubmitting(true);
      await api.post('/admin-hq/canteens', {
        name,
        address,
        description,
        notificationEmail,
        bankBin,
        bankAccountNumber,
        bankAccountName,
        standardMealPrice: Number(standardMealPrice),
        maxDishes: Number(maxDishes),
        bufferMarginPercent: Number(bufferMarginPercent),
        cutoffBreakfast,
        cutoffLunch,
        cutoffDinner,
      });
      setShowAddModal(false);
      setName('');
      setAddress('');
      setDescription('');
      setNotificationEmail('');
      setBankAccountNumber('');
      setBankAccountName('');
      fetchCanteens();
      toast.success('Tạo cơ sở mới thành công!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi tạo cơ sở');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusTabs = [
    { id: 'ALL' as const, label: 'Tất cả', count: counts.all },
    { id: 'ACTIVE' as const, label: 'Đang mở', count: counts.active },
    { id: 'INACTIVE' as const, label: 'Tạm đóng', count: counts.inactive },
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Filter, Search & Actions Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`h-7 px-3 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] text-slate-400 font-numeric">{tab.count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-60 sm:flex-none">
            <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, địa chỉ cơ sở..."
              className="w-full pl-9 pr-3 h-9 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#0057b8] focus:ring-1 focus:ring-[#0057b8] outline-hidden transition-colors"
            />
          </div>

          {isSuperAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStaffModalOpen(true)}
                icon={Users}
              >
                Admin cơ sở ({staffList.length})
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddModal(true)}
                icon={Plus}
              >
                Thêm cơ sở
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Floating Row-Card Canteens List */}
      <div className="space-y-3">
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[780px] space-y-2">
            {/* Transparent Column Header Row */}
            <div className="grid grid-cols-[minmax(210px,1.5fr)_minmax(190px,1.3fr)_minmax(180px,1.1fr)_104px_216px] items-center gap-3 px-4 py-1 text-xs font-medium text-slate-400">
              <button
                type="button"
                onClick={() => toggleSort('name')}
                className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer text-left"
              >
                <span>Cơ sở</span>
                <ChevronsUpDown className="size-3 text-slate-300" />
              </button>
              <span>Địa chỉ &amp; Liên hệ</span>
              <span>Vận hành</span>
              <button
                type="button"
                onClick={() => toggleSort('isActive')}
                className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer text-left"
              >
                <span>Trạng thái</span>
                <ChevronsUpDown className="size-3 text-slate-300" />
              </button>
              <span className="text-right">Thao tác</span>
            </div>

            {/* Elevated Row Cards */}
            {filteredCanteens.map((c) => {
              const dishesLimit = getMaxDishes(c);
              const margin = c.bufferMarginPercent ?? 10;

              return (
                <div
                  key={c.id}
                  className="group bg-white rounded-xl border border-slate-200/75 hover:border-[#0057b8] hover:shadow-xs px-4 py-3 grid grid-cols-[minmax(210px,1.5fr)_minmax(190px,1.3fr)_minmax(180px,1.1fr)_104px_216px] items-center gap-3 transition-all"
                >
                  {/* Canteen Name & Description */}
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-800 truncate" title={c.name}>
                      {c.name}
                    </div>
                    <div
                      className="text-[11px] text-slate-400 truncate mt-0.5"
                      title={c.description || ''}
                    >
                      {c.description || '—'}
                    </div>
                  </div>

                  {/* Address & Notification Email */}
                  <div className="min-w-0">
                    <div className="text-xs text-slate-700 truncate" title={c.address || ''}>
                      {c.address || '—'}
                    </div>
                    <div
                      className="text-[11px] font-mono text-slate-400 truncate mt-0.5"
                      title={c.notificationEmail || ''}
                    >
                      {c.notificationEmail || 'Chưa cấu hình email'}
                    </div>
                  </div>

                  {/* Operational Config: Cutoffs + Max Dishes + Margin */}
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {c.cutoffBreakfast || '07:00'} · {c.cutoffLunch || '10:30'} · {c.cutoffDinner || '16:00'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {dishesLimit} món/suất • Dự phòng +{margin}%
                    </div>
                  </div>

                  {/* Semantic Status Dot */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`size-1.5 rounded-full shrink-0 ${
                        c.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    <span className={`text-xs ${c.isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                      {c.isActive ? 'Đang mở' : 'Tạm đóng'}
                    </span>
                  </div>

                  {/* Row Actions */}
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => window.open(`/display/${c.id}`, '_blank')}
                      className="size-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                      title="Mở màn hình quầy"
                    >
                      <Tv className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyDisplayUrl(c)}
                      className="size-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                      title="Sao chép link quầy"
                    >
                      {copiedId === c.id ? (
                        <Check className="size-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => openConfigModal(c)}
                      className="size-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                      title="Cấu hình vận hành"
                    >
                      <SlidersHorizontal className="size-3.5" />
                    </button>

                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        className="size-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                        title="Chỉnh sửa thông tin"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedCanteen(c)}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 group-hover:bg-[#0057b8] group-hover:text-white group-hover:border-[#0057b8] text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Eye className="size-3.5" />
                      <span>Xem</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredCanteens.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200/75 py-12 text-center text-xs text-slate-400">
                {loading ? 'Đang tải danh sách cơ sở...' : 'Không tìm thấy cơ sở phù hợp.'}
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-400">
          {filteredCanteens.length} cơ sở
        </div>
      </div>

      {/* Modal Chi tiết Cơ sở (Synced with AuditLogsPage style) */}
      {selectedCanteen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCanteen(null);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200/80 shadow-modal space-y-4 text-xs">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">{selectedCanteen.name}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedCanteen.isActive ? 'Đang hoạt động' : 'Đang tạm đóng'}
                  {selectedCanteen.notificationEmail ? ` • ${selectedCanteen.notificationEmail}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCanteen(null)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Đóng"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-slate-50/40">
              <div className="px-3.5 py-2.5 flex items-start justify-between gap-3">
                <span className="text-slate-500 shrink-0">Địa chỉ</span>
                <span className="font-medium text-slate-800 text-right">
                  {selectedCanteen.address || '—'}
                </span>
              </div>

              {selectedCanteen.description && (
                <div className="px-3.5 py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 shrink-0">Mô tả</span>
                  <span className="text-slate-700 text-right">{selectedCanteen.description}</span>
                </div>
              )}

              <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500">Đơn giá suất chuẩn</span>
                <span className="font-mono font-semibold text-[#0057b8] tabular-nums">
                  {formatVND(getStandardMealPrice(selectedCanteen))}
                </span>
              </div>

              <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500">Định mức món &amp; Dự phòng</span>
                <span className="font-medium text-slate-800">
                  {getMaxDishes(selectedCanteen)} món/suất • +{selectedCanteen.bufferMarginPercent ?? 10}%
                </span>
              </div>

              <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500">Giờ chốt (Sáng · Trưa · Tối)</span>
                <span className="font-mono text-slate-800 tabular-nums">
                  {selectedCanteen.cutoffBreakfast || '07:00'} · {selectedCanteen.cutoffLunch || '10:30'} ·{' '}
                  {selectedCanteen.cutoffDinner || '16:00'}
                </span>
              </div>

              {(selectedCanteen.bankAccountNumber || selectedCanteen.bankAccountName) && (
                <div className="px-3.5 py-2.5 flex items-start justify-between gap-3">
                  <span className="text-slate-500 shrink-0">Tài khoản đối soát</span>
                  <div className="text-right">
                    <div className="font-mono font-medium text-slate-800">
                      {selectedCanteen.bankAccountNumber}
                    </div>
                    {selectedCanteen.bankAccountName && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {selectedCanteen.bankAccountName}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
              {isSuperAdmin && (
                <Button
                  variant={selectedCanteen.isActive ? 'danger' : 'primary'}
                  size="sm"
                  onClick={() => {
                    const target = selectedCanteen;
                    setSelectedCanteen(null);
                    setConfirmCanteen(target);
                  }}
                >
                  {selectedCanteen.isActive ? 'Tạm đóng cơ sở' : 'Mở lại cơ sở'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const target = selectedCanteen;
                  setSelectedCanteen(null);
                  openConfigModal(target);
                }}
              >
                Cấu hình
              </Button>
              {isSuperAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = selectedCanteen;
                    setSelectedCanteen(null);
                    openEditModal(target);
                  }}
                >
                  Sửa thông tin
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setSelectedCanteen(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa Cơ Sở */}
      {editCanteen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditCanteen(null);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200/80 shadow-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Chỉnh sửa thông tin cơ sở</h3>
              <button
                type="button"
                onClick={() => setEditCanteen(null)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                aria-label="Đóng"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Tên cơ sở *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-[#0057b8] outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Địa chỉ</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-[#0057b8] outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Mô tả / Ghi chú</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-[#0057b8] outline-hidden resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Email nhận thông báo vận hành</label>
                <input
                  type="email"
                  value={editNotificationEmail}
                  onChange={(e) => setEditNotificationEmail(e.target.value)}
                  placeholder="canteen.notify@smartcanteen.vn"
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-[#0057b8] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 block">Số tài khoản ngân hàng</label>
                  <input
                    type="text"
                    value={editBankAccountNumber}
                    onChange={(e) => setEditBankAccountNumber(e.target.value)}
                    placeholder="999888666"
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:border-[#0057b8] outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 block">Tên chủ tài khoản</label>
                  <input
                    type="text"
                    value={editBankAccountName}
                    onChange={(e) => setEditBankAccountName(e.target.value)}
                    placeholder="CANG TIN CO SO 1"
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-[#0057b8] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 block">Đơn giá suất chuẩn (₫)</label>
                  <input
                    type="number"
                    value={editStandardMealPrice}
                    onChange={(e) => setEditStandardMealPrice(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:border-[#0057b8] outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 block">Số lượng món tối đa / suất</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editMaxDishes}
                    onChange={(e) => setEditMaxDishes(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:border-[#0057b8] outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditCanteen(null)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSavingEdit}>
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Đổi Trạng Thái / Archive Cơ Sở */}
      {confirmCanteen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmCanteen(null);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200/80 shadow-modal space-y-4">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {confirmCanteen.isActive ? 'Tạm đóng cơ sở?' : 'Kích hoạt lại cơ sở?'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {confirmCanteen.isActive
                    ? `Cơ sở "${confirmCanteen.name}" sẽ tạm ngừng nhận đơn và ẩn khỏi ứng dụng. Mọi thay đổi đều được ghi vết vào Nhật ký kiểm toán.`
                    : `Cơ sở "${confirmCanteen.name}" sẽ được mở lại hoạt động bình thường.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmCanteen(null)}>
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                variant={confirmCanteen.isActive ? 'danger' : 'primary'}
                isLoading={isTogglingStatus}
                onClick={handleConfirmToggleStatus}
              >
                {confirmCanteen.isActive ? 'Xác nhận tạm đóng' : 'Kích hoạt'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cấu hình Giờ chốt & Margin */}
      {configCanteen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfigCanteen(null);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200/80 shadow-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Cấu hình vận hành cơ sở</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{configCanteen.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setConfigCanteen(null)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                aria-label="Đóng"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Số lượng món tối đa / suất ăn</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editConfigMaxDishes}
                  onChange={(e) => setEditConfigMaxDishes(e.target.value)}
                  placeholder="3"
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:border-[#0057b8] outline-hidden"
                />
                <span className="text-[11px] text-slate-400">
                  Mặc định 3 món/suất. Học sinh tự do chọn món trong thực đơn của cơ sở.
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Tỷ lệ dự phòng an toàn (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={editMargin}
                  onChange={(e) => setEditMargin(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:border-[#0057b8] outline-hidden"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-medium text-slate-700 block">Giờ chốt đặt món suất ăn</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Sáng</label>
                    <TimePickerButton
                      value={editBreakfast}
                      onChange={setEditBreakfast}
                      title="Giờ chốt Ca Sáng"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Trưa</label>
                    <TimePickerButton
                      value={editLunch}
                      onChange={setEditLunch}
                      title="Giờ chốt Ca Trưa"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Tối</label>
                    <TimePickerButton
                      value={editDinner}
                      onChange={setEditDinner}
                      title="Giờ chốt Ca Tối"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setConfigCanteen(null)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSavingConfig}>
                  Lưu cấu hình
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Cơ Sở */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200/80 shadow-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Thêm cơ sở Canteen mới</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                aria-label="Đóng"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <form onSubmit={handleCreateCanteen} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Tên cơ sở *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Canteen Trường THPT Chu Văn An"
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-[#0057b8] outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Địa chỉ</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="10 Thụy Khuê, Tây Hồ, Hà Nội"
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-[#0057b8] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 block">Đơn giá suất chuẩn</label>
                  <input
                    type="number"
                    value={standardMealPrice}
                    onChange={(e) => setStandardMealPrice(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-[#0057b8] outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 block">Số món tối đa</label>
                  <input
                    type="number"
                    value={maxDishes}
                    onChange={(e) => setMaxDishes(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-[#0057b8] outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                  Tạo cơ sở
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Admin Cơ Sở */}
      {staffModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setStaffModalOpen(false);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-slate-200/80 shadow-modal space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Quản trị viên Cơ sở Canteen</h3>
              <button
                type="button"
                onClick={() => setStaffModalOpen(false)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                aria-label="Đóng"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-600 block mb-2">
                Danh sách Admin chi nhánh ({staffList.length})
              </span>
              <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-slate-50/40">
                {staffList.map((s) => (
                  <div key={s.id} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 truncate">{s.fullName}</div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">{s.email}</div>
                    </div>
                    <span className="text-[11px] text-slate-600 text-right shrink-0">
                      {s.canteen?.name || 'Toàn chuỗi'}
                    </span>
                  </div>
                ))}
                {staffList.length === 0 && (
                  <div className="px-3.5 py-6 text-center text-xs text-slate-400">
                    Chưa có quản trị viên chi nhánh.
                  </div>
                )}
              </div>
            </div>

            <form
              onSubmit={handleCreateStaff}
              className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3 text-xs"
            >
              <span className="font-semibold text-slate-800 block">Tạo tài khoản Admin mới</span>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  value={staffFullName}
                  onChange={(e) => setStaffFullName(e.target.value)}
                  placeholder="Họ tên *"
                  className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-[#0057b8] outline-hidden"
                />
                <input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="Email *"
                  className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-[#0057b8] outline-hidden"
                />
                <input
                  type="password"
                  required
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="Mật khẩu *"
                  className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-[#0057b8] outline-hidden"
                />
                <select
                  required
                  value={staffCanteenId}
                  onChange={(e) => setStaffCanteenId(e.target.value)}
                  className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-[#0057b8] outline-hidden"
                >
                  <option value="">-- Chọn cơ sở --</option>
                  {canteens.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end pt-1">
                <Button type="submit" variant="primary" size="sm" isLoading={isCreatingStaff}>
                  Tạo tài khoản
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
