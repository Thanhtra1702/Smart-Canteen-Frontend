import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  Plus,
  RefreshCw,
  Users,
  X,
  Tv,
  Copy,
  Search,
  Edit,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { useToast } from '../context/ToastContext';

export const CanteensPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { toast } = useToast();
  const [canteens, setCanteens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

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

  // Modal to edit canteen settings (Cut-off & Buffer margin & Max Dishes)
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
        data = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      } else {
        const res = await api.get('/canteens');
        const all = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        data = user?.canteenId ? all.filter((c: any) => c.id === user.canteenId) : all;
      }
      setCanteens(data);
    } catch (err) {
      console.error('Failed to load canteens', err);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, user?.canteenId]);

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

  const filteredCanteens = useMemo(() => {
    return canteens.filter((c) => {
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && c.isActive) ||
        (statusFilter === 'INACTIVE' && !c.isActive);

      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }, [canteens, statusFilter, search]);

  const counts = useMemo(() => {
    return {
      all: canteens.length,
      active: canteens.filter((c) => c.isActive).length,
      inactive: canteens.filter((c) => !c.isActive).length,
    };
  }, [canteens]);

  const handleConfirmToggleStatus = async () => {
    if (!confirmCanteen) return;
    try {
      setIsTogglingStatus(true);
      const targetStatus = !confirmCanteen.isActive;
      await api.patch(`/admin-hq/canteens/${confirmCanteen.id}/status`, {
        isActive: targetStatus,
      });
      toast.success(`Đã ${targetStatus ? 'kích hoạt' : 'tạm dừng'} cơ sở ${confirmCanteen.name}!`);
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
    const mp = c.mealPrices?.[0];
    setEditMaxDishes(String(mp?.maxDishes ?? 3));
    setEditStandardMealPrice(String(mp?.price ? Number(mp.price) : 30000));
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
    const mp = c.mealPrices?.[0];
    setEditConfigMaxDishes(String(mp?.maxDishes ?? 3));
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

  const statusTabItems = [
    { id: 'ALL' as const, label: 'Tất cả cơ sở', count: counts.all },
    { id: 'ACTIVE' as const, label: 'Đang mở', count: counts.active },
    { id: 'INACTIVE' as const, label: 'Tạm đóng / Archive', count: counts.inactive },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Filter, Search and Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <Tabs items={statusTabItems} activeTab={statusFilter} onChange={(id) => setStatusFilter(id)} />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px]">
            <Search className="size-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, địa chỉ cơ sở..."
              className="w-full pl-9 pr-3 h-8.5 bg-surface border border-border rounded-lg text-xs font-medium text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary outline-hidden transition-colors"
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
                <span>Admin cơ sở ({staffList.length})</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddModal(true)}
                icon={Plus}
              >
                <span>Thêm cơ sở</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Canteens Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface text-muted text-[11px] uppercase font-medium border-b border-border">
              <tr>
                <th className="px-5 py-3">Cơ sở Canteen</th>
                <th className="px-5 py-3">Địa chỉ & Liên hệ</th>
                <th className="px-5 py-3">Giờ chốt đơn</th>
                <th className="px-5 py-3 text-center">Số món/suất</th>
                <th className="px-5 py-3 text-center">Dự phòng</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCanteens.map((c) => (
                <tr key={c.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-3.5 font-medium text-foreground">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0 border border-border">
                        <Building2 className="size-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-foreground">{c.name}</div>
                        {c.description && <div className="text-[11px] text-muted truncate max-w-xs">{c.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted max-w-xs">
                    <div className="truncate">{c.address || '—'}</div>
                    {c.notificationEmail && (
                      <div className="text-[11px] text-muted font-mono mt-0.5">{c.notificationEmail}</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-foreground font-mono text-[11px]">
                    {c.cutoffBreakfast || '07:00'} · {c.cutoffLunch || '10:30'} · {c.cutoffDinner || '16:00'}
                  </td>
                  <td className="px-5 py-3.5 text-center font-medium">
                    <Badge variant="brand" size="sm">
                      {c.mealPrices?.[0]?.maxDishes || 3} món
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-center font-medium text-foreground tabular-nums">
                    +{c.bufferMarginPercent ?? 10}%
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={c.isActive ? 'success' : 'neutral'} dot>
                      {c.isActive ? 'Đang mở' : 'Tạm đóng'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => window.open(`/display/${c.id}`, '_blank')}
                      className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary-hover text-foreground text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer outline-hidden"
                      title="Mở màn hình hiển thị quầy gắp món của cơ sở này trên tab mới"
                    >
                      <Tv className="size-3.5 text-muted" />
                      <span>Quầy</span>
                    </button>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/display/${c.id}`;
                        navigator.clipboard.writeText(url);
                        toast.success(`Đã sao chép link màn hình quầy gắp món của ${c.name}`);
                      }}
                      className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-secondary transition-colors cursor-pointer outline-hidden"
                      title="Sao chép link màn hình quầy"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => openEditModal(c)}
                        className="px-2.5 py-1.5 rounded-lg text-xs text-foreground font-medium hover:bg-secondary transition-colors cursor-pointer outline-hidden inline-flex items-center gap-1"
                        title="Chỉnh sửa thông tin cơ sở"
                      >
                        <Edit className="size-3 text-muted" />
                        <span>Sửa</span>
                      </button>
                    )}
                    <button
                      onClick={() => openConfigModal(c)}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-foreground font-medium hover:bg-secondary transition-colors cursor-pointer outline-hidden"
                    >
                      Cấu hình
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => setConfirmCanteen(c)}
                        className="px-2.5 py-1.5 rounded-lg text-xs text-muted hover:text-rose-700 hover:bg-rose-500/10 transition-colors cursor-pointer outline-hidden"
                        title={c.isActive ? 'Tạm đóng / Lưu trữ cơ sở' : 'Mở lại cơ sở'}
                      >
                        {c.isActive ? 'Đóng' : 'Mở'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCanteens.length === 0 && (
          <div className="py-12 text-center text-xs text-muted">
            {loading ? 'Đang tải danh sách cơ sở...' : 'Không tìm thấy cơ sở nào phù hợp với bộ lọc.'}
          </div>
        )}
      </div>

      {/* Modal Chỉnh Sửa Cơ Sở */}
      {editCanteen && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 border border-border shadow-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Chỉnh sửa thông tin cơ sở</h3>
              <button
                onClick={() => setEditCanteen(null)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer outline-hidden"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground block">Tên cơ sở *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-surface border border-border-strong rounded-xl text-sm text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground block">Địa chỉ</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full h-10 px-3.5 bg-surface border border-border-strong rounded-xl text-sm text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground block">Mô tả / Ghi chú</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-3 bg-surface border border-border-strong rounded-xl text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground block">Email nhận thông báo vận hành</label>
                <input
                  type="email"
                  value={editNotificationEmail}
                  onChange={(e) => setEditNotificationEmail(e.target.value)}
                  placeholder="canteen.notify@smartcanteen.vn"
                  className="w-full h-10 px-3.5 bg-surface border border-border-strong rounded-xl text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="font-medium text-foreground block">Số tài khoản ngân hàng</label>
                  <input
                    type="text"
                    value={editBankAccountNumber}
                    onChange={(e) => setEditBankAccountNumber(e.target.value)}
                    placeholder="999888666"
                    className="w-full h-9 px-3 bg-surface border border-border-strong rounded-xl font-mono text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground block">Tên chủ tài khoản</label>
                  <input
                    type="text"
                    value={editBankAccountName}
                    onChange={(e) => setEditBankAccountName(e.target.value)}
                    placeholder="CANG TIN CO SO 1"
                    className="w-full h-9 px-3 bg-surface border border-border-strong rounded-xl text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div className="space-y-1">
                  <label className="font-medium text-foreground block">Đơn giá suất chuẩn (₫)</label>
                  <input
                    type="number"
                    value={editStandardMealPrice}
                    onChange={(e) => setEditStandardMealPrice(e.target.value)}
                    className="w-full h-9 px-3 bg-surface border border-border-strong rounded-xl font-mono text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground block">Số lượng món tối đa / suất</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editMaxDishes}
                    onChange={(e) => setEditMaxDishes(e.target.value)}
                    className="w-full h-9 px-3 bg-surface border border-border-strong rounded-xl font-mono text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditCanteen(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSavingEdit}
                >
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Đổi Trạng Thái / Archive Cơ Sở */}
      {confirmCanteen && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 border border-border shadow-modal space-y-4">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {confirmCanteen.isActive ? 'Tạm đóng cơ sở?' : 'Kích hoạt lại cơ sở?'}
                </h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {confirmCanteen.isActive
                    ? `Cơ sở "${confirmCanteen.name}" sẽ tạm ngừng nhận đơn và ẩn khỏi ứng dụng. Mọi thay đổi đều được ghi vết vào Audit Log.`
                    : `Cơ sở "${confirmCanteen.name}" sẽ được mở lại hoạt động bình thường.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmCanteen(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
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
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 border border-border shadow-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Cấu hình vận hành cơ sở</h3>
                <p className="text-xs text-muted mt-0.5">{configCanteen.name}</p>
              </div>
              <button
                onClick={() => setConfigCanteen(null)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer outline-hidden"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground block">Số lượng món tối đa / suất ăn</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editConfigMaxDishes}
                  onChange={(e) => setEditConfigMaxDishes(e.target.value)}
                  placeholder="3"
                  className="w-full h-10 px-3 bg-surface border border-border-strong rounded-xl text-foreground text-sm font-mono focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                />
                <span className="text-[11px] text-muted">Mặc định 3 món/suất. Học sinh tự do chọn món trong thực đơn của cơ sở.</span>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground block">Tỷ lệ dự phòng an toàn (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={editMargin}
                  onChange={(e) => setEditMargin(e.target.value)}
                  className="w-full h-10 px-3 bg-surface border border-border-strong rounded-xl text-foreground text-sm focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <span className="font-medium text-foreground block">Giờ chốt đặt món suất ăn</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-muted block mb-1">Sáng</label>
                    <input
                      type="time"
                      value={editBreakfast}
                      onChange={(e) => setEditBreakfast(e.target.value)}
                      className="w-full h-9 px-2 bg-surface border border-border-strong rounded-xl font-mono text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted block mb-1">Trưa</label>
                    <input
                      type="time"
                      value={editLunch}
                      onChange={(e) => setEditLunch(e.target.value)}
                      className="w-full h-9 px-2 bg-surface border border-border-strong rounded-xl font-mono text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted block mb-1">Tối</label>
                    <input
                      type="time"
                      value={editDinner}
                      onChange={(e) => setEditDinner(e.target.value)}
                      className="w-full h-9 px-2 bg-surface border border-border-strong rounded-xl font-mono text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfigCanteen(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSavingConfig}
                >
                  Lưu cấu hình
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Cơ Sở */}
      {showAddModal && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 border border-border shadow-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Thêm cơ sở Canteen mới</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer outline-hidden"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCanteen} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground block">Tên cơ sở *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Canteen Trường THPT Chu Văn An"
                  className="w-full h-10 px-3.5 bg-surface border border-border-strong rounded-xl text-sm text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-foreground block">Địa chỉ</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="10 Thụy Khuê, Tây Hồ, Hà Nội"
                  className="w-full h-10 px-3.5 bg-surface border border-border-strong rounded-xl text-sm text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground block">Đơn giá suất chuẩn</label>
                  <input
                    type="number"
                    value={standardMealPrice}
                    onChange={(e) => setStandardMealPrice(e.target.value)}
                    className="w-full h-10 px-3.5 bg-surface border border-border-strong rounded-xl text-sm font-mono text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground block">Số món tối đa</label>
                  <input
                    type="number"
                    value={maxDishes}
                    onChange={(e) => setMaxDishes(e.target.value)}
                    className="w-full h-10 px-3.5 bg-surface border border-border-strong rounded-xl text-sm font-mono text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                >
                  Tạo cơ sở
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Admin Cơ Sở */}
      {staffModalOpen && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-6 border border-border shadow-modal space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Quản trị viên Cơ sở Canteen</h3>
              <button
                onClick={() => setStaffModalOpen(false)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer outline-hidden"
              >
                <X className="size-4" />
              </button>
            </div>

            <div>
              <span className="text-xs font-semibold text-foreground block mb-2">
                Danh sách Admin chi nhánh ({staffList.length})
              </span>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface text-muted text-[10px] uppercase font-medium border-b border-border">
                    <tr>
                      <th className="px-3.5 py-2.5">Họ tên</th>
                      <th className="px-3.5 py-2.5">Email</th>
                      <th className="px-3.5 py-2.5">Cơ sở</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {staffList.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-hover transition-colors">
                        <td className="px-3.5 py-2.5 font-medium text-foreground">{s.fullName}</td>
                        <td className="px-3.5 py-2.5 text-muted">{s.email}</td>
                        <td className="px-3.5 py-2.5 text-foreground font-medium">
                          {s.canteen?.name || 'Toàn chuỗi'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <form onSubmit={handleCreateStaff} className="p-4 bg-secondary/40 rounded-xl border border-border space-y-3 text-xs">
              <span className="font-semibold text-foreground block">Tạo tài khoản Admin mới</span>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  value={staffFullName}
                  onChange={(e) => setStaffFullName(e.target.value)}
                  placeholder="Họ tên *"
                  className="h-9 px-3 bg-surface border border-border-strong rounded-xl text-foreground text-xs focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                />
                <input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="Email *"
                  className="h-9 px-3 bg-surface border border-border-strong rounded-xl text-foreground text-xs focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                />
                <input
                  type="password"
                  required
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="Mật khẩu *"
                  className="h-9 px-3 bg-surface border border-border-strong rounded-xl text-foreground text-xs focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                />
                <select
                  required
                  value={staffCanteenId}
                  onChange={(e) => setStaffCanteenId(e.target.value)}
                  className="h-9 px-3 bg-surface border border-border-strong rounded-xl text-foreground text-xs focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
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
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isCreatingStaff}
                >
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
