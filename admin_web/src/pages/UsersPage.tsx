import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Building2,
  QrCode,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  X,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  UserPlus,
  Utensils,
  Calculator,
  RotateCcw,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
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
    description: 'Quyền tự cấu hình ca ăn, giờ mở cửa, giờ chốt đơn (cut-off), và số món mỗi suất ăn (maxDishes) của cơ sở mình.',
  },
  {
    key: 'MENU_MANAGEMENT',
    name: 'Quản lý thực đơn & Món ăn',
    badgeName: 'Thực đơn',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Quyền tạo món mới, cập nhật giá, chỉnh sửa thực đơn ngày/tuần, nhập thực đơn Excel cho cơ sở mình.',
  },
  {
    key: 'INVENTORY_MANAGEMENT',
    name: 'Quản lý kho & Nguyên liệu',
    badgeName: 'Kho hàng',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Quyền quản lý nguyên liệu, nhập/xuất kho, kiểm kê và nhập tồn kho Excel cho cơ sở mình.',
  },
  {
    key: 'PACKAGE_MANAGEMENT',
    name: 'Quản lý gói ăn & Vé tháng',
    badgeName: 'Gói ăn',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Quyền tạo và quản lý các gói ăn tháng, vé tháng áp dụng cho cơ sở mình.',
  },
  {
    key: 'FEEDBACK_RESOLVE',
    name: 'Xử lý phản hồi & CSAT',
    badgeName: 'CSAT',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Quyền xem và phản hồi các đánh giá, khiếu nại CSAT của học sinh/phụ huynh tại cơ sở mình.',
  },
  {
    key: 'FINANCE_VIEW',
    name: 'Xem báo cáo tài chính',
    badgeName: 'Tài chính',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Quyền xem báo cáo doanh thu, biến động số dư và lịch sử giao dịch tại cơ sở mình.',
  },
  {
    key: 'FINANCE_WITHDRAW',
    name: 'Đối soát & Rút doanh thu',
    badgeName: 'Rút tiền',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'Quyền lập phiếu yêu cầu đối soát và rút doanh thu cơ sở.',
  },
  {
    key: 'SERVING_OPERATION',
    name: 'Vận hành quầy gắp & Check-in',
    badgeName: 'Quầy gắp',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    description: 'Quyền thao tác quầy gắp món, màn hình KDS, điểm danh check-in.',
  },
];

export const PERMISSION_PRESETS = {
  FULL: {
    label: 'Toàn quyền cơ sở (Full Access)',
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

export const UsersPage: React.FC = () => {
  const { user, selectedCanteenId } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'PARENT'>('ALL');
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Lock / Unlock Confirmation State
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

  const [confirmStatusUser, setConfirmStatusUser] = useState<any | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Edit Role Modal State
  const [editRoleUser, setEditRoleUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('USER');
  const [selectedUserCanteenId, setSelectedUserCanteenId] = useState<string>('');
  const [canteens, setCanteens] = useState<any[]>([]);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Phân quyền chức năng cơ sở Modal State
  const [permissionsUser, setPermissionsUser] = useState<any | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const openPermissionsModal = (u: any) => {
    setPermissionsUser(u);
    setUserPermissions(Array.isArray(u.permissions) ? [...u.permissions] : []);
  };

  const handleTogglePermission = (permKey: string) => {
    setUserPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((k) => k !== permKey) : [...prev, permKey]
    );
  };

  const handleApplyPreset = (presetPerms: string[]) => {
    setUserPermissions([...presetPerms]);
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

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/users', {
        params: {
          search: search.trim() || undefined,
          canteenId: selectedCanteenId !== 'ALL' ? selectedCanteenId : undefined,
        },
      });
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || []);
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
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || []);
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

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
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
      Array.isArray(u.permissions) && u.permissions.length > 0
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
        canteenId: selectedUserCanteenId || undefined,
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

  // Filter users by search and role
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.studentLinks?.some((l: any) => l.studentCode?.toLowerCase().includes(q)) ||
        u.parentLinks?.some((l: any) => l.studentCode?.toLowerCase().includes(q));

      return matchRole && matchSearch;
    });
  }, [users, roleFilter, search]);

  // Counts for role filter tabs
  const counts = useMemo(() => {
    return {
      all: users.length,
      superAdmin: users.filter((u) => u.role === 'SUPER_ADMIN').length,
      admin: users.filter((u) => u.role === 'ADMIN').length,
      user: users.filter((u) => u.role === 'USER').length,
      parent: users.filter((u) => u.role === 'PARENT').length,
    };
  }, [users]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge variant="brand">Admin Tổng HQ</Badge>;
      case 'ADMIN':
        return <Badge variant="neutral">Admin Cơ Sở</Badge>;
      case 'USER':
        return <Badge variant="success">Học Sinh / User</Badge>;
      case 'PARENT':
        return <Badge variant="warning">Phụ Huynh</Badge>;
      default:
        return <Badge variant="neutral">{role}</Badge>;
    }
  };

  const roleTabItems = [
    { id: 'ALL' as const, label: 'Tất cả', count: counts.all },
    { id: 'USER' as const, label: 'Học sinh', count: counts.user },
    { id: 'PARENT' as const, label: 'Phụ huynh', count: counts.parent },
    { id: 'ADMIN' as const, label: 'Admin cơ sở', count: counts.admin },
    { id: 'SUPER_ADMIN' as const, label: 'Admin tổng', count: counts.superAdmin },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Quick Action Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Badge variant="success" dot>Zalo QR & Định danh</Badge>
          <span className="text-xs text-muted hidden sm:inline">
            • Quản lý {counts.all} tài khoản trên toàn hệ thống
          </span>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-2.5 rounded-lg border border-border">
        <Tabs items={roleTabItems} activeTab={roleFilter} onChange={(id) => setRoleFilter(id)} />

        {/* Search Input */}
        <div className="relative min-w-[280px]">
          <Search className="size-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, mã HS..."
            className="w-full pl-9 pr-3 h-8 bg-surface border border-border-strong rounded-md text-xs font-medium text-foreground placeholder:text-muted focus:border-focus focus:ring-1 focus:ring-focus outline-hidden transition-colors"
          />
        </div>
      </div>

      {/* Main Users Table */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-secondary/60 text-muted uppercase text-[11px] font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-2.5 w-[32%]">Tài khoản & Định danh</th>
                <th className="px-4 py-2.5 w-[16%]">Vai trò & Trạng thái</th>
                <th className="px-4 py-2.5 w-[22%]">Cơ sở & Quyền hạn</th>
                <th className="px-4 py-2.5 w-[14%] text-right">Ví & Suất ăn</th>
                <th className="px-4 py-2.5 w-[16%] text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((u) => {
                const studentLink = u.studentLinks?.[0];
                const activeSub = u.subscriptions?.[0];

                return (
                  <tr key={u.id} className="hover:bg-surface-hover/70 transition-colors">
                    {/* Cột 1: Tài khoản & Định danh */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-secondary text-foreground font-semibold text-xs flex items-center justify-center shrink-0 border border-border-strong">
                          {u.fullName?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-foreground truncate">{u.fullName}</span>
                            {u.role === 'USER' && (
                              <span className="font-mono text-[10.5px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                {studentLink?.studentCode || 'HS-2026-0098'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted font-mono flex items-center gap-1.5 mt-0.5 truncate">
                            <span>{u.email}</span>
                            {u.phone && <span className="text-slate-400 font-sans">• {u.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Vai trò & Trạng thái */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-1">
                        <div>{getRoleBadge(u.role)}</div>
                        <div>
                          <Badge variant={u.isActive ? 'success' : 'neutral'} size="sm" dot>
                            {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                          </Badge>
                        </div>
                      </div>
                    </td>

                    {/* Cột 3: Cơ sở & Phân quyền */}
                    <td className="px-4 py-3 text-muted">
                      <div className="space-y-1">
                        {u.canteen?.name ? (
                          <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                            <Building2 className="size-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[210px]">{u.canteen.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted text-[11px] italic">
                            <Building2 className="size-3.5 text-slate-400 shrink-0" />
                            <span>Toàn hệ thống (HQ)</span>
                          </div>
                        )}

                        {u.role === 'ADMIN' && (
                          <div>
                            <button
                              type="button"
                              onClick={() => openPermissionsModal(u)}
                              className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-[#0057b8] border border-blue-200 transition-colors font-medium cursor-pointer"
                              title="Tùy chỉnh phân quyền cơ sở"
                            >
                              <ShieldCheck className="size-3 text-[#0057b8]" />
                              <span>{u.permissions?.length ? `${u.permissions.length}/8 quyền` : 'Chưa cấp quyền'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Cột 4: Ví & Suất ăn */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {u.role === 'USER' ? (
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground font-mono text-xs tabular-nums">
                            {formatVND(Number(u.wallet?.balance || 0))}
                          </div>
                          {activeSub ? (
                            <div className="text-[11px] text-emerald-700 font-medium">
                              Còn {activeSub.remainingCredits} suất ăn
                            </div>
                          ) : (
                            <div className="text-[10.5px] text-muted">Chưa mua gói</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>

                    {/* Cột 5: Thao tác */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedUserDetail(u)}
                          className="h-7 px-2.5 rounded border border-border-strong bg-surface hover:bg-button-hover text-xs font-medium text-foreground transition-colors cursor-pointer inline-flex items-center gap-1 outline-hidden shadow-2xs"
                        >
                          <Eye className="size-3 text-muted" />
                          <span>Chi tiết</span>
                        </button>

                        {isSuperAdmin && u.role !== 'SUPER_ADMIN' && (
                          <>
                            <button
                              onClick={() => openRoleModal(u)}
                              className="h-7 px-2 rounded border border-border-strong bg-surface hover:bg-button-hover text-xs font-medium text-muted hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1 outline-hidden shadow-2xs"
                              title="Đổi vai trò"
                            >
                              <Shield className="size-3" />
                              <span>Vai trò</span>
                            </button>

                            <button
                              onClick={() => setConfirmStatusUser(u)}
                              className={`h-7 px-2 rounded text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1 outline-hidden shadow-2xs border ${
                                u.isActive
                                  ? 'border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100'
                                  : 'border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100'
                              }`}
                              title={u.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            >
                              {u.isActive ? (
                                <>
                                  <Lock className="size-3" />
                                  <span>Khóa</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="size-3" />
                                  <span>Mở</span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="py-14 text-center text-xs text-muted">
            {loading ? 'Đang cập nhật danh sách...' : 'Không tìm thấy tài khoản phù hợp với bộ lọc.'}
          </div>
        )}
      </div>

      {/* Modal Xác nhận Khóa / Mở khóa tài khoản */}
      {confirmStatusUser && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-sm w-full p-5 border border-border shadow-modal space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmStatusUser.isActive ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
                }`}
              >
                {confirmStatusUser.isActive ? <Lock className="size-5" /> : <Unlock className="size-5" />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {confirmStatusUser.isActive ? 'Khóa tài khoản người dùng?' : 'Mở khóa tài khoản?'}
                </h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {confirmStatusUser.isActive
                    ? `Người dùng "${confirmStatusUser.fullName}" sẽ bị thu hồi phiên đăng nhập ngay lập tức và không thể truy cập hệ thống.`
                    : `Tài khoản "${confirmStatusUser.fullName}" sẽ được kích hoạt lại trạng thái hoạt động bình thường.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmStatusUser(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
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

      {/* Modal Đổi Vai Trò & Phân Quyền */}
      {editRoleUser && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-sm w-full p-5 border border-border shadow-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Phân quyền tài khoản</h3>
                <p className="text-xs text-muted mt-0.5">{editRoleUser.fullName}</p>
              </div>
              <button
                onClick={() => setEditRoleUser(null)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer outline-hidden"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground block">Vai trò mới *</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full h-10 px-3 bg-surface border border-border-strong rounded-xl text-foreground text-sm focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                >
                  <option value="USER">Học Sinh / User</option>
                  <option value="PARENT">Phụ Huynh</option>
                  <option value="ADMIN">Admin Cơ Sở</option>
                  <option value="SUPER_ADMIN">Admin Tổng HQ</option>
                </select>
              </div>

              {selectedRole === 'ADMIN' && (
                <>
                  <div className="space-y-1">
                    <label className="font-medium text-foreground block">Cơ sở trực thuộc *</label>
                    <select
                      required
                      value={selectedUserCanteenId}
                      onChange={(e) => setSelectedUserCanteenId(e.target.value)}
                      className="w-full h-10 px-3 bg-surface border border-border-strong rounded-xl text-foreground text-sm focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                    >
                      <option value="">-- Chọn cơ sở --</option>
                      {canteens.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-foreground block">
                        Phân quyền cơ sở ({userPermissions.length}/8)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(PERMISSION_PRESETS.FULL.permissions)}
                          className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                        >
                          Toàn quyền
                        </button>
                        <span className="text-muted text-[10px]">·</span>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset([])}
                          className="text-[10px] text-muted hover:underline cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-border rounded-xl p-2 bg-secondary/20">
                      {BRANCH_PERMISSIONS.map((p) => {
                        const checked = userPermissions.includes(p.key);
                        return (
                          <label
                            key={p.key}
                            className={`flex items-start gap-2 p-1.5 rounded-lg border cursor-pointer transition-colors ${
                              checked
                                ? 'bg-primary/5 border-primary/30 text-foreground'
                                : 'bg-surface border-border text-muted hover:bg-secondary'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePermission(p.key)}
                              className="mt-0.5 rounded border-border-strong text-primary focus:ring-primary size-3.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-foreground leading-tight">{p.name}</div>
                              <div className="text-[10px] text-muted truncate">{p.description}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditRoleUser(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isUpdatingRole}
                >
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Details Modal */}
      {selectedUserDetail && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-md w-full p-6 border border-border shadow-modal space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-secondary text-foreground font-semibold flex items-center justify-center border border-border-strong text-xs">
                  {selectedUserDetail.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Hồ sơ tài khoản</h3>
                  <p className="text-xs text-muted font-mono">ID: {selectedUserDetail.id.slice(0, 8)}...</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer outline-hidden"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Profile Info Grid */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border">
                <span className="text-muted">Họ và tên:</span>
                <span className="text-foreground font-semibold">{selectedUserDetail.fullName}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border">
                <span className="text-muted">Email đăng nhập:</span>
                <div className="flex items-center gap-1.5 font-mono text-foreground font-medium">
                  <span>{selectedUserDetail.email}</span>
                  <button
                    onClick={() => handleCopy(selectedUserDetail.email)}
                    className="text-muted hover:text-foreground transition-colors cursor-pointer outline-hidden"
                  >
                    {copiedEmail === selectedUserDetail.email ? (
                      <Check className="size-3 text-emerald-600" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border">
                <span className="text-muted">Mật khẩu demo:</span>
                <span className="font-mono font-medium text-foreground bg-surface px-2 py-0.5 rounded border border-border-strong">
                  123456
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border">
                <span className="text-muted">Vai trò:</span>
                {getRoleBadge(selectedUserDetail.role)}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border">
                <span className="text-muted">Trạng thái:</span>
                <Badge variant={selectedUserDetail.isActive ? 'success' : 'neutral'} dot>
                  {selectedUserDetail.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border">
                <span className="text-muted">Cơ sở trực thuộc:</span>
                <span className="font-medium text-foreground">
                  {selectedUserDetail.canteen?.name || 'Toàn hệ thống'}
                </span>
              </div>

              {selectedUserDetail.role === 'USER' && (
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1.5 text-xs mt-1">
                  <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                    <QrCode className="size-3.5 text-emerald-700" />
                    <span>Định danh & Suất ăn (Zalo Mini App):</span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>Mã học sinh:</span>
                    <strong className="font-mono font-semibold text-foreground">
                      {selectedUserDetail.studentLinks?.[0]?.studentCode || 'HS-2026-0098'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>Số dư ví:</span>
                    <strong className="font-mono text-emerald-700 font-semibold">
                      {formatVND(Number(selectedUserDetail.wallet?.balance || 0))}
                    </strong>
                  </div>
                  {selectedUserDetail.subscriptions?.[0] && (
                    <div className="flex items-center justify-between text-muted">
                      <span>Gói ăn kích hoạt:</span>
                      <span className="font-medium text-emerald-800">
                        Còn {selectedUserDetail.subscriptions[0].remainingCredits} suất ăn
                      </span>
                    </div>
                  )}
                  {selectedUserDetail.studentLinks?.[0]?.parent && (
                    <div className="flex items-center justify-between text-muted pt-1 border-t border-emerald-200/60">
                      <span>Phụ huynh bảo trợ:</span>
                      <strong className="text-foreground font-medium">
                        {selectedUserDetail.studentLinks[0].parent.fullName}{' '}
                        {selectedUserDetail.studentLinks[0].parent.phone && (
                          <span className="font-normal text-muted">({selectedUserDetail.studentLinks[0].parent.phone})</span>
                        )}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {selectedUserDetail.role === 'PARENT' && (
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1.5 text-xs mt-1">
                  <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <span>Học sinh bảo trợ (Zalo Phụ huynh):</span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>Họ tên học sinh:</span>
                    <strong className="text-foreground font-medium">
                      {selectedUserDetail.parentLinks?.[0]?.student?.fullName || 'Nguyễn Văn An'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>Mã định danh HS:</span>
                    <strong className="font-mono text-foreground font-semibold">
                      {selectedUserDetail.parentLinks?.[0]?.studentCode || 'HS-2026-0098'}
                    </strong>
                  </div>
                </div>
              )}

              {selectedUserDetail.role === 'ADMIN' && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-xs mt-1">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-primary" />
                      <span>Quyền hạn cơ sở ({selectedUserDetail.permissions?.length || 0}/8):</span>
                    </div>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const target = selectedUserDetail;
                          setSelectedUserDetail(null);
                          openPermissionsModal(target);
                        }}
                        className="text-xs text-primary font-medium hover:underline cursor-pointer"
                      >
                        Chỉnh sửa
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(!selectedUserDetail.permissions || selectedUserDetail.permissions.length === 0) ? (
                      <span className="text-[10px] text-muted italic">Chưa được cấp quyền nào</span>
                    ) : (
                      selectedUserDetail.permissions.map((pKey: string) => {
                        const def = BRANCH_PERMISSIONS.find((p) => p.key === pKey);
                        return (
                          <span
                            key={pKey}
                            title={def?.description}
                            className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${
                              def?.badgeColor || 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {def?.name || pKey}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
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
                    icon={<Shield className="size-3.5" />}
                  >
                    Đổi vai trò
                  </Button>
                  <Button
                    variant={selectedUserDetail.isActive ? 'danger' : 'primary'}
                    size="sm"
                    onClick={() => {
                      const target = selectedUserDetail;
                      setSelectedUserDetail(null);
                      setConfirmStatusUser(target);
                    }}
                    icon={selectedUserDetail.isActive ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                  >
                    {selectedUserDetail.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUserDetail(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Phân quyền chức năng cơ sở */}
      {permissionsUser && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col p-6 border border-border shadow-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Phân Quyền Chức Năng Cơ Sở</h3>
                  <p className="text-[11px] text-muted">
                    {permissionsUser.fullName} ({permissionsUser.email}) — {permissionsUser.canteen?.name || 'Cơ sở trực thuộc'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPermissionsUser(null)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer outline-hidden"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Presets Toolbar */}
            <div className="space-y-1.5 shrink-0 bg-secondary/30 p-2.5 rounded-lg border border-border">
              <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Mẫu phân quyền nhanh:</div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset(PERMISSION_PRESETS.FULL.permissions)}
                  className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface text-foreground border border-border hover:bg-secondary hover:border-border-strong transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <ShieldCheck className="size-3.5 text-primary shrink-0" />
                  <span>Toàn quyền cơ sở (Full Access)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(PERMISSION_PRESETS.KITCHEN.permissions)}
                  className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface text-foreground border border-border hover:bg-secondary hover:border-border-strong transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Utensils className="size-3.5 text-slate-500 shrink-0" />
                  <span>Quản lý Bếp & Thực đơn</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(PERMISSION_PRESETS.ACCOUNTING.permissions)}
                  className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface text-foreground border border-border hover:bg-secondary hover:border-border-strong transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Calculator className="size-3.5 text-slate-500 shrink-0" />
                  <span>Kế toán & Đối soát</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset([])}
                  className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface text-muted border border-border hover:bg-secondary hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <RotateCcw className="size-3 text-muted shrink-0" />
                  <span>Bỏ chọn tất cả</span>
                </button>
              </div>
            </div>

            {/* Scrollable Checklist */}
            <div className="overflow-y-auto space-y-2 pr-1 max-h-[380px] text-xs">
              <div className="flex items-center justify-between text-muted text-[11px] px-1">
                <span>Danh sách quyền hạn ({userPermissions.length}/{BRANCH_PERMISSIONS.length} được chọn):</span>
              </div>
              {BRANCH_PERMISSIONS.map((perm) => {
                const isChecked = userPermissions.includes(perm.key);
                return (
                  <div
                    key={perm.key}
                    onClick={() => handleTogglePermission(perm.key)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-primary/5 border-primary/40 shadow-xs'
                        : 'bg-surface border-border hover:bg-secondary/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent div onClick
                      className="mt-0.5 rounded border-border-strong text-primary focus:ring-primary/20 size-4 cursor-pointer"
                    />
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-xs">{perm.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${perm.badgeColor}`}>
                          {perm.key}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted leading-relaxed">{perm.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border shrink-0">
              <span className="text-[11px] text-muted">
                Đã chọn <strong className="text-foreground">{userPermissions.length}</strong> quyền
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPermissionsUser(null)}
                  disabled={isSavingPermissions}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  variant="primary"
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
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-md w-full p-6 border border-border shadow-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <UserPlus className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Tạo Tài Khoản Mới</h3>
                  <p className="text-[11px] text-muted">Thêm thành viên, quản trị viên cơ sở hoặc học sinh</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer outline-hidden"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block font-medium text-foreground">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-border-strong rounded-xl text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-medium text-foreground">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="student@school.edu.vn"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border-strong rounded-xl text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-foreground">Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="0912345678"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border-strong rounded-xl text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-medium text-foreground">Vai trò hệ thống *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border-strong rounded-xl text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden cursor-pointer"
                  >
                    <option value="USER">Học sinh / Người ăn</option>
                    <option value="PARENT">Phụ huynh học sinh</option>
                    <option value="ADMIN">Admin Cơ sở / Nhân viên</option>
                    <option value="SUPER_ADMIN">Super Admin Tổng HQ</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-foreground">Cơ sở trực thuộc</label>
                  <select
                    value={createForm.canteenId}
                    onChange={(e) => setCreateForm({ ...createForm, canteenId: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border-strong rounded-xl text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden cursor-pointer"
                  >
                    <option value="">-- Mặc định cơ sở đầu tiên --</option>
                    {canteens.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {createForm.role === 'ADMIN' && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-foreground block">
                      Phân quyền cơ sở ({createPermissions.length}/8)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCreatePermissions([...PERMISSION_PRESETS.FULL.permissions])}
                        className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                      >
                        Toàn quyền
                      </button>
                      <span className="text-muted text-[10px]">·</span>
                      <button
                        type="button"
                        onClick={() => setCreatePermissions([])}
                        className="text-[10px] text-muted hover:underline cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 border border-border rounded-xl p-2 bg-secondary/20">
                    {BRANCH_PERMISSIONS.map((p) => {
                      const checked = createPermissions.includes(p.key);
                      return (
                        <label
                          key={p.key}
                          className={`flex items-start gap-2 p-1.5 rounded-lg border cursor-pointer transition-colors ${
                            checked
                              ? 'bg-primary/5 border-primary/30 text-foreground'
                              : 'bg-surface border-border text-muted hover:bg-secondary'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setCreatePermissions((prev) =>
                                prev.includes(p.key) ? prev.filter((k) => k !== p.key) : [...prev, p.key]
                              )
                            }
                            className="mt-0.5 rounded border-border-strong text-primary focus:ring-primary size-3.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-foreground leading-tight">{p.name}</div>
                            <div className="text-[10px] text-muted truncate">{p.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block font-medium text-foreground">Mật khẩu ban đầu</label>
                <input
                  type="text"
                  placeholder="Mặc định: password123"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-border-strong rounded-xl text-xs text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden font-mono"
                />
                <p className="text-[10px] text-muted">Người dùng có thể đổi lại mật khẩu hoặc đăng nhập nhanh bằng mã PIN / Zalo.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreatingUser}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isCreatingUser}
                  icon={<UserPlus className="size-3.5" />}
                >
                  Xác nhận tạo tài khoản
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
