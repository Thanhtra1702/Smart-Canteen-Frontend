import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MagnifyingGlassIcon as Search,
  CopyIcon as Copy,
  CheckIcon as Check,
  EyeIcon as Eye,
  XIcon as X,
  LockIcon as Lock,
  LockOpenIcon as Unlock,
  ShieldIcon as Shield,
  ShieldCheckIcon as ShieldCheck,
  UserPlusIcon as UserPlus,
  CaretUpDownIcon as ChevronsUpDown,
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';

export interface PermissionDef {
  key: string;
  name: string;
  badgeName: string;
  badgeColor: string;
  description: string;
}

export const BRANCH_PERMISSIONS: PermissionDef[] = [
  {
    key: 'CANTEEN_CONFIG',
    name: 'Cấu hình cơ sở & Ca ăn',
    badgeName: 'Cấu hình',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Cấu hình ca ăn, giờ mở cửa, giờ chốt đơn và số món mỗi suất.',
  },
  {
    key: 'MENU_MANAGEMENT',
    name: 'Quản lý thực đơn & Món ăn',
    badgeName: 'Thực đơn',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Tạo món mới, cập nhật giá và chỉnh sửa thực đơn ngày/tuần.',
  },
  {
    key: 'INVENTORY_MANAGEMENT',
    name: 'Quản lý kho & Nguyên liệu',
    badgeName: 'Kho hàng',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Quản lý nguyên liệu, nhập/xuất kho và kiểm kê tồn kho.',
  },
  {
    key: 'PACKAGE_MANAGEMENT',
    name: 'Quản lý gói ăn & Vé tháng',
    badgeName: 'Gói ăn',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Tạo và quản lý các gói ăn tháng áp dụng cho cơ sở.',
  },
  {
    key: 'FEEDBACK_RESOLVE',
    name: 'Xử lý phản hồi & CSAT',
    badgeName: 'CSAT',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Xem và phản hồi đánh giá của học sinh, phụ huynh.',
  },
  {
    key: 'FINANCE_VIEW',
    name: 'Xem báo cáo tài chính',
    badgeName: 'Tài chính',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Xem báo cáo doanh thu, biến động số dư và giao dịch.',
  },
  {
    key: 'FINANCE_WITHDRAW',
    name: 'Đối soát & Rút doanh thu',
    badgeName: 'Rút tiền',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'Lập phiếu yêu cầu đối soát và rút doanh thu cơ sở.',
  },
  {
    key: 'SERVING_OPERATION',
    name: 'Vận hành quầy gắp & Check-in',
    badgeName: 'Quầy gắp',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    description: 'Thao tác quầy phục vụ, màn hình KDS và điểm danh check-in.',
  },
];

export const PERMISSION_PRESETS = {
  FULL: {
    label: 'Toàn quyền cơ sở',
    permissions: [
      'CANTEEN_CONFIG',
      'MENU_MANAGEMENT',
      'INVENTORY_MANAGEMENT',
      'PACKAGE_MANAGEMENT',
      'FEEDBACK_RESOLVE',
      'FINANCE_VIEW',
      'FINANCE_WITHDRAW',
      'SERVING_OPERATION',
    ],
  },
  KITCHEN: {
    label: 'Quản lý Bếp & Thực đơn',
    permissions: ['MENU_MANAGEMENT', 'INVENTORY_MANAGEMENT', 'SERVING_OPERATION'],
  },
  ACCOUNTING: {
    label: 'Kế toán & Đối soát',
    permissions: ['FINANCE_VIEW', 'FINANCE_WITHDRAW'],
  },
};

const getRoleMeta = (role: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return { label: 'Admin Tổng HQ', dot: 'bg-[#0057b8]' };
    case 'ADMIN':
      return { label: 'Admin cơ sở', dot: 'bg-sky-500' };
    case 'USER':
      return { label: 'Học sinh', dot: 'bg-emerald-500' };
    case 'PARENT':
      return { label: 'Phụ huynh', dot: 'bg-amber-500' };
    default:
      return { label: role, dot: 'bg-slate-400' };
  }
};

export const UsersPage: React.FC = () => {
  const { user, selectedCanteenId } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [canteens, setCanteens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'PARENT'>('ALL');
  const [sortField, setSortField] = useState<'fullName' | 'role' | 'balance'>('fullName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: 'password123',
    role: 'USER',
    canteenId: '',
  });
  const [createPermissions, setCreatePermissions] = useState<string[]>([...PERMISSION_PRESETS.FULL.permissions]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Lock / Unlock Modal State
  const [confirmStatusUser, setConfirmStatusUser] = useState<any | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Edit Role Modal State
  const [editRoleUser, setEditRoleUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('USER');
  const [selectedUserCanteenId, setSelectedUserCanteenId] = useState<string>('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Permissions Modal State
  const [permissionsUser, setPermissionsUser] = useState<any | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/users', {
        params: {
          search: search.trim() || undefined,
          canteenId: selectedCanteenId !== 'ALL' ? selectedCanteenId : undefined,
        },
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCanteenId]);

  const fetchCanteens = useCallback(async () => {
    try {
      const res = await api.get('/canteens').catch(() => api.get('/admin-hq/canteens'));
      const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setCanteens(data);
    } catch (err) {
      console.error('Failed to load canteens', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchCanteens();
  }, [fetchUsers, fetchCanteens]);

  const handleCopy = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const formatVND = (num: number) => `${Math.round(num || 0).toLocaleString('vi-VN')} đ`;

  const toggleSort = (field: 'fullName' | 'role' | 'balance') => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'balance' ? 'desc' : 'asc');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.fullName.trim() || !createForm.email.trim()) {
      toast.error('Vui lòng nhập họ tên và email');
      return;
    }

    try {
      setIsCreatingUser(true);
      await api.post('/users', {
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim().toLowerCase(),
        phone: createForm.phone.trim() || undefined,
        password: createForm.password || 'password123',
        role: createForm.role,
        canteenId: createForm.canteenId || (canteens.length > 0 ? canteens[0].id : undefined),
        permissions: createForm.role === 'ADMIN' ? createPermissions : undefined,
      });

      toast.success(`Tạo tài khoản ${createForm.fullName} thành công!`);
      setShowCreateModal(false);
      setCreateForm({
        fullName: '',
        email: '',
        phone: '',
        password: 'password123',
        role: 'USER',
        canteenId: '',
      });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi tạo tài khoản');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleToggleUserStatus = async () => {
    if (!confirmStatusUser) return;
    try {
      setIsUpdatingStatus(true);
      const targetStatus = !confirmStatusUser.isActive;
      await api.patch(`/admin-hq/users/${confirmStatusUser.id}/status`, {
        isActive: targetStatus,
      });
      toast.success(
        `Đã ${targetStatus ? 'mở khóa' : 'khóa'} tài khoản ${confirmStatusUser.fullName} thành công!`
      );
      setConfirmStatusUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật trạng thái tài khoản');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const openRoleModal = (u: any) => {
    setEditRoleUser(u);
    setSelectedRole(u.role);
    setSelectedUserCanteenId(u.canteenId || '');
    setUserPermissions(
      u.role === 'ADMIN' && Array.isArray(u.permissions)
        ? [...u.permissions]
        : [...PERMISSION_PRESETS.FULL.permissions]
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoleUser) return;

    try {
      setIsUpdatingRole(true);
      await api.patch(`/admin-hq/users/${editRoleUser.id}/role`, {
        role: selectedRole,
        canteenId:
          selectedRole === 'SUPER_ADMIN' ? null : selectedUserCanteenId || undefined,
        permissions: selectedRole === 'ADMIN' ? userPermissions : undefined,
      });
      toast.success(`Đã cập nhật vai trò cho ${editRoleUser.fullName} thành công!`);
      setEditRoleUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật vai trò tài khoản');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const openPermissionsModal = (u: any) => {
    setPermissionsUser(u);
    setUserPermissions(Array.isArray(u.permissions) ? [...u.permissions] : []);
  };

  const handleTogglePermission = (permKey: string) => {
    setUserPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((k) => k !== permKey) : [...prev, permKey]
    );
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissionsUser) return;
    try {
      setIsSavingPermissions(true);
      await api.patch(`/users/${permissionsUser.id}/permissions`, {
        permissions: userPermissions,
      });
      toast.success(`Cập nhật phân quyền cho ${permissionsUser.fullName} thành công!`);
      setPermissionsUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật phân quyền');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    const factor = sortDir === 'asc' ? 1 : -1;

    return users
      .filter((u) => {
        const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
        const matchSearch =
          !q ||
          u.fullName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          u.studentLinks?.some((l: any) => l.studentCode?.toLowerCase().includes(q)) ||
          u.parentLinks?.some((l: any) => l.studentCode?.toLowerCase().includes(q));
        return matchRole && matchSearch;
      })
      .sort((a, b) => {
        if (sortField === 'balance') {
          return (Number(a.wallet?.balance || 0) - Number(b.wallet?.balance || 0)) * factor;
        }
        if (sortField === 'role') {
          return getRoleMeta(a.role).label.localeCompare(getRoleMeta(b.role).label, 'vi') * factor;
        }
        return String(a.fullName || '').localeCompare(String(b.fullName || ''), 'vi') * factor;
      });
  }, [users, roleFilter, search, sortField, sortDir]);

  const counts = useMemo(
    () => ({
      all: users.length,
      superAdmin: users.filter((u) => u.role === 'SUPER_ADMIN').length,
      admin: users.filter((u) => u.role === 'ADMIN').length,
      user: users.filter((u) => u.role === 'USER').length,
      parent: users.filter((u) => u.role === 'PARENT').length,
    }),
    [users]
  );

  const roleTabs = [
    { id: 'ALL' as const, label: 'Tất cả', count: counts.all },
    { id: 'USER' as const, label: 'Học sinh', count: counts.user },
    { id: 'PARENT' as const, label: 'Phụ huynh', count: counts.parent },
    { id: 'ADMIN' as const, label: 'Admin cơ sở', count: counts.admin },
    { id: 'SUPER_ADMIN' as const, label: 'Admin tổng', count: counts.superAdmin },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. Compact Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
          {roleTabs.map((tab) => {
            const isActive = roleFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                className={`h-7 px-2.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
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

        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          <div className="relative flex-1 sm:w-64">
            <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, email, mã HS..."
              className="w-full pl-9 pr-3 h-9 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0057b8] focus:ring-1 focus:ring-[#0057b8] outline-hidden"
            />
          </div>

          {isSuperAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              icon={<UserPlus className="size-3.5" />}
            >
              Thêm tài khoản
            </Button>
          )}
        </div>
      </div>

      {/* 2. Floating Row-Card Users List (Synced with AuditLogsPage) */}
      <div className="space-y-3">
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[760px] space-y-2">
            {/* Transparent Header Row */}
            <div className="grid grid-cols-[minmax(220px,1.4fr)_minmax(140px,0.9fr)_minmax(180px,1.1fr)_minmax(120px,0.8fr)_150px] items-center gap-3 px-4 py-1 text-xs font-medium text-slate-400">
              <button
                type="button"
                onClick={() => toggleSort('fullName')}
                className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer text-left"
              >
                <span>Tài khoản</span>
                <ChevronsUpDown className="size-3 text-slate-300" />
              </button>
              <button
                type="button"
                onClick={() => toggleSort('role')}
                className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer text-left"
              >
                <span>Vai trò &amp; Trạng thái</span>
                <ChevronsUpDown className="size-3 text-slate-300" />
              </button>
              <span>Cơ sở &amp; Quyền</span>
              <button
                type="button"
                onClick={() => toggleSort('balance')}
                className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer justify-end"
              >
                <span>Ví &amp; Suất ăn</span>
                <ChevronsUpDown className="size-3 text-slate-300" />
              </button>
              <span className="text-right">Thao tác</span>
            </div>

            {/* Elevated Row Cards */}
            {filteredUsers.map((u) => {
              const studentLink = u.studentLinks?.[0];
              const activeSub = u.subscriptions?.[0];
              const roleMeta = getRoleMeta(u.role);
              const isLocked = u.isActive === false;

              return (
                <div
                  key={u.id}
                  className="group bg-white rounded-xl border border-slate-200/75 hover:border-[#0057b8] hover:shadow-xs px-4 py-3 grid grid-cols-[minmax(220px,1.4fr)_minmax(140px,0.9fr)_minmax(180px,1.1fr)_minmax(120px,0.8fr)_150px] items-center gap-3 transition-all"
                >
                  {/* Account Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-medium text-slate-800 truncate">{u.fullName}</span>
                      {u.role === 'USER' && studentLink?.studentCode && (
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">
                          • {studentLink.studentCode}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {u.email}
                      {u.phone ? ` • ${u.phone}` : ''}
                    </div>
                  </div>

                  {/* Role & Status */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`size-1.5 rounded-full shrink-0 ${roleMeta.dot}`} />
                      <span className="text-xs text-slate-800 truncate">{roleMeta.label}</span>
                    </div>
                    <div className="text-[11px] mt-0.5 pl-3.5">
                      <span className={isLocked ? 'text-rose-500 font-medium' : 'text-slate-400'}>
                        {isLocked ? 'Đã khóa' : 'Hoạt động'}
                      </span>
                    </div>
                  </div>

                  {/* Canteen & Permissions */}
                  <div className="min-w-0">
                    <div className="text-xs text-slate-700 truncate" title={u.canteen?.name || ''}>
                      {u.canteen?.name || 'Toàn hệ thống'}
                    </div>
                    {u.role === 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => openPermissionsModal(u)}
                        className="text-[11px] text-[#0057b8] hover:underline font-medium mt-0.5 cursor-pointer text-left"
                      >
                        {u.permissions?.length ? `${u.permissions.length}/8 quyền • Chỉnh sửa` : 'Cấp quyền cơ sở'}
                      </button>
                    )}
                  </div>

                  {/* Wallet & Meals */}
                  <div className="text-right min-w-0">
                    {u.role === 'USER' ? (
                      <>
                        <div className="text-xs font-medium font-mono tabular-nums text-slate-800">
                          {formatVND(Number(u.wallet?.balance || 0))}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {activeSub ? `Còn ${activeSub.remainingCredits} suất` : 'Chưa mua gói'}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </div>

                  {/* Row Actions */}
                  <div className="flex items-center justify-end gap-1.5">
                    {isSuperAdmin && u.role !== 'SUPER_ADMIN' && (
                      <>
                        <button
                          type="button"
                          onClick={() => openRoleModal(u)}
                          className="size-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                          title="Đổi vai trò"
                        >
                          <Shield className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmStatusUser(u)}
                          className={`size-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                            isLocked
                              ? 'border-emerald-200 bg-emerald-50/50 text-emerald-600 hover:bg-emerald-100'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                          }`}
                          title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                        >
                          {isLocked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedUserDetail(u)}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 group-hover:bg-[#0057b8] group-hover:text-white group-hover:border-[#0057b8] text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Eye className="size-3.5" />
                      <span>Xem</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200/75 py-12 text-center text-xs text-slate-400">
                {loading ? 'Đang tải danh sách...' : 'Không tìm thấy tài khoản phù hợp.'}
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-400">
          {filteredUsers.length} tài khoản
        </div>
      </div>

      {/* Modal Xác nhận Khóa / Mở khóa tài khoản */}
      {confirmStatusUser && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmStatusUser(null);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200/80 shadow-modal space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmStatusUser.isActive ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {confirmStatusUser.isActive ? <Lock className="size-4.5" /> : <Unlock className="size-4.5" />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {confirmStatusUser.isActive ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {confirmStatusUser.isActive
                    ? `Tài khoản "${confirmStatusUser.fullName}" sẽ tạm thời không thể đăng nhập.`
                    : `Kích hoạt lại tài khoản "${confirmStatusUser.fullName}".`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmStatusUser(null)}>
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                variant={confirmStatusUser.isActive ? 'danger' : 'primary'}
                isLoading={isUpdatingStatus}
                onClick={handleToggleUserStatus}
              >
                {confirmStatusUser.isActive ? 'Xác nhận khóa' : 'Mở khóa'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đổi Vai Trò */}
      {editRoleUser && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditRoleUser(null);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200/80 shadow-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Đổi vai trò tài khoản</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{editRoleUser.fullName}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditRoleUser(null)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                aria-label="Đóng"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Vai trò mới</label>
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setSelectedRole(nextRole);
                    if (nextRole === 'ADMIN' && !selectedUserCanteenId && canteens.length > 0) {
                      setSelectedUserCanteenId(canteens[0].id);
                    }
                  }}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-[#0057b8] outline-hidden"
                >
                  <option value="USER">Học sinh</option>
                  <option value="PARENT">Phụ huynh</option>
                  <option value="ADMIN">Admin cơ sở</option>
                  <option value="SUPER_ADMIN">Admin Tổng HQ</option>
                </select>
              </div>

              {selectedRole === 'ADMIN' && (
                <>
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700 block">Cơ sở trực thuộc</label>
                    <select
                      required
                      value={selectedUserCanteenId}
                      onChange={(e) => setSelectedUserCanteenId(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-[#0057b8] outline-hidden"
                    >
                      <option value="">-- Chọn cơ sở --</option>
                      {canteens.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-slate-700">
                        Quyền hạn ({userPermissions.length}/8)
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setUserPermissions([...PERMISSION_PRESETS.FULL.permissions])}
                          className="text-[11px] text-[#0057b8] hover:underline font-medium cursor-pointer"
                        >
                          Chọn hết
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserPermissions([])}
                          className="text-[11px] text-slate-400 hover:underline cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>
                    <div className="max-h-44 overflow-y-auto space-y-1.5 border border-slate-200/80 rounded-xl p-2 bg-slate-50/40">
                      {BRANCH_PERMISSIONS.map((p) => {
                        const checked = userPermissions.includes(p.key);
                        return (
                          <label
                            key={p.key}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePermission(p.key)}
                              className="rounded border-slate-300 text-[#0057b8] size-3.5"
                            />
                            <span className="text-xs text-slate-700">{p.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditRoleUser(null)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isUpdatingRole}>
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chi tiết tài khoản (Synced with AuditLogsPage detail style) */}
      {selectedUserDetail && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedUserDetail(null);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200/80 shadow-modal space-y-4 text-xs">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">{selectedUserDetail.fullName}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {getRoleMeta(selectedUserDetail.role).label} •{' '}
                  {selectedUserDetail.isActive === false ? 'Đã khóa' : 'Đang hoạt động'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Đóng"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-slate-50/40">
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500">Email</span>
                <div className="flex items-center gap-1.5 font-mono text-slate-800">
                  <span>{selectedUserDetail.email}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedUserDetail.email)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Sao chép email"
                  >
                    {copiedEmail === selectedUserDetail.email ? (
                      <Check className="size-3 text-emerald-600" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
              </div>

              {selectedUserDetail.phone && (
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-slate-500">Số điện thoại</span>
                  <span className="font-mono text-slate-800">{selectedUserDetail.phone}</span>
                </div>
              )}

              <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500">Cơ sở</span>
                <span className="font-medium text-slate-800 text-right">
                  {selectedUserDetail.canteen?.name || 'Toàn hệ thống'}
                </span>
              </div>

              {selectedUserDetail.role === 'USER' && (
                <>
                  {selectedUserDetail.studentLinks?.[0]?.studentCode && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                      <span className="text-slate-500">Mã học sinh</span>
                      <span className="font-mono font-medium text-slate-800">
                        {selectedUserDetail.studentLinks[0].studentCode}
                      </span>
                    </div>
                  )}
                  <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                    <span className="text-slate-500">Số dư ví</span>
                    <span className="font-mono font-semibold text-[#0057b8] tabular-nums">
                      {formatVND(Number(selectedUserDetail.wallet?.balance || 0))}
                    </span>
                  </div>
                  <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                    <span className="text-slate-500">Gói ăn</span>
                    <span className="font-medium text-slate-800">
                      {selectedUserDetail.subscriptions?.[0]
                        ? `Còn ${selectedUserDetail.subscriptions[0].remainingCredits} suất ăn`
                        : 'Chưa đăng ký'}
                    </span>
                  </div>
                  {selectedUserDetail.studentLinks?.[0]?.parent && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                      <span className="text-slate-500">Phụ huynh liên kết</span>
                      <span className="font-medium text-slate-800 text-right">
                        {selectedUserDetail.studentLinks[0].parent.fullName}
                      </span>
                    </div>
                  )}
                </>
              )}

              {selectedUserDetail.role === 'PARENT' && selectedUserDetail.parentLinks?.[0]?.student && (
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-slate-500">Học sinh liên kết</span>
                  <span className="font-medium text-slate-800 text-right">
                    {selectedUserDetail.parentLinks[0].student.fullName} (
                    {selectedUserDetail.parentLinks[0].studentCode})
                  </span>
                </div>
              )}

              {selectedUserDetail.role === 'ADMIN' && (
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-slate-500">Quyền hạn cơ sở</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">
                      {selectedUserDetail.permissions?.length || 0}/8 quyền
                    </span>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const target = selectedUserDetail;
                          setSelectedUserDetail(null);
                          openPermissionsModal(target);
                        }}
                        className="text-[#0057b8] hover:underline font-medium cursor-pointer"
                      >
                        Chỉnh sửa
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              {isSuperAdmin && selectedUserDetail.role !== 'SUPER_ADMIN' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const target = selectedUserDetail;
                      setSelectedUserDetail(null);
                      openRoleModal(target);
                    }}
                  >
                    Đổi vai trò
                  </Button>
                  <Button
                    variant={selectedUserDetail.isActive === false ? 'primary' : 'danger'}
                    size="sm"
                    onClick={() => {
                      const target = selectedUserDetail;
                      setSelectedUserDetail(null);
                      setConfirmStatusUser(target);
                    }}
                  >
                    {selectedUserDetail.isActive === false ? 'Mở khóa' : 'Khóa'}
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => setSelectedUserDetail(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Phân quyền cơ sở */}
      {permissionsUser && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setPermissionsUser(null);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col p-5 border border-slate-200/80 shadow-modal space-y-3.5">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Phân quyền chức năng cơ sở</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {permissionsUser.fullName} • {permissionsUser.canteen?.name || 'Cơ sở trực thuộc'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPermissionsUser(null)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Đóng"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 shrink-0">
              {[
                { label: 'Toàn quyền', perms: PERMISSION_PRESETS.FULL.permissions },
                { label: 'Bếp & Thực đơn', perms: PERMISSION_PRESETS.KITCHEN.permissions },
                { label: 'Kế toán', perms: PERMISSION_PRESETS.ACCOUNTING.permissions },
                { label: 'Bỏ chọn hết', perms: [] },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setUserPermissions([...preset.perms])}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto space-y-1.5 pr-1 max-h-[360px] text-xs">
              {BRANCH_PERMISSIONS.map((perm) => {
                const isChecked = userPermissions.includes(perm.key);
                return (
                  <label
                    key={perm.key}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-[#EFF6FF]/60 border-[#0057b8]/35'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePermission(perm.key)}
                      className="mt-0.5 rounded border-slate-300 text-[#0057b8] size-4 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900 text-xs">{perm.name}</div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{perm.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0 text-xs">
              <span className="text-slate-500">Đã chọn {userPermissions.length}/8 quyền</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPermissionsUser(null)}
                  disabled={isSavingPermissions}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSavePermissions}
                  isLoading={isSavingPermissions}
                  icon={<ShieldCheck className="size-3.5" />}
                >
                  Lưu phân quyền
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm tài khoản mới */}
      {showCreateModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200/80 shadow-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">Thêm tài khoản mới</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                aria-label="Đóng"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block font-medium text-slate-700">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-[#0057b8] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="student@school.edu.vn"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-[#0057b8] outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="0912345678"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-[#0057b8] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">Vai trò *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-[#0057b8] outline-hidden cursor-pointer"
                  >
                    <option value="USER">Học sinh</option>
                    <option value="PARENT">Phụ huynh</option>
                    <option value="ADMIN">Admin cơ sở</option>
                    <option value="SUPER_ADMIN">Admin Tổng HQ</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">Cơ sở</label>
                  <select
                    value={createForm.canteenId}
                    onChange={(e) => setCreateForm({ ...createForm, canteenId: e.target.value })}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-[#0057b8] outline-hidden cursor-pointer"
                  >
                    <option value="">Mặc định cơ sở đầu tiên</option>
                    {canteens.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {createForm.role === 'ADMIN' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-slate-700">
                      Quyền hạn ({createPermissions.length}/8)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCreatePermissions([...PERMISSION_PRESETS.FULL.permissions])}
                        className="text-[11px] text-[#0057b8] hover:underline font-medium cursor-pointer"
                      >
                        Chọn hết
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreatePermissions([])}
                        className="text-[11px] text-slate-400 hover:underline cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200/80 rounded-xl p-2 bg-slate-50/40">
                    {BRANCH_PERMISSIONS.map((p) => {
                      const checked = createPermissions.includes(p.key);
                      return (
                        <label
                          key={p.key}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setCreatePermissions((prev) =>
                                prev.includes(p.key) ? prev.filter((k) => k !== p.key) : [...prev, p.key]
                              )
                            }
                            className="rounded border-slate-300 text-[#0057b8] size-3.5"
                          />
                          <span className="text-xs text-slate-700">{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block font-medium text-slate-700">Mật khẩu ban đầu</label>
                <input
                  type="text"
                  placeholder="password123"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-[#0057b8] outline-hidden font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreatingUser}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isCreatingUser}
                  icon={<UserPlus className="size-3.5" />}
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
