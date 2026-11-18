import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { TabKey } from '../components/BottomNavigation';
import {
  UserIcon as User,
  XIcon as X,
  CopyIcon as Copy,
  CheckIcon as Check,
  UsersIcon as Users,
  ShieldCheckIcon as ShieldCheck,
  CaretRightIcon as ChevronRight,
  SignOutIcon as LogOut,
  LockIcon as Lock,
  GearSixIcon as Settings,
  CheckCircleIcon as CheckCircle2,
  KeyIcon as KeyRound,
} from '@phosphor-icons/react';
import { CanteenConfigModal } from '../components/CanteenConfigModal';
import { SelectCanteenModal } from '../components/SelectCanteenModal';
import { EditProfileModal } from '../components/EditProfileModal';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

interface ProfilePageProps {
  onNavigateTab: (tab: TabKey) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigateTab: _onNavigateTab }) => {
  const {
    user,
    zaloProfile,
    currentRole,
    logout,
    hasPermission,
    userPermissions,
    childrenList,
    linkChild,
    showConfirm,
  } = useApp();

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showChangeFacilityModal, setShowChangeFacilityModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showParentLinkModal, setShowParentLinkModal] = useState(false);
  const [showFoodSafetyModal, setShowFoodSafetyModal] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  const [inputChildCode, setInputChildCode] = useState('');
  const [linkingChild, setLinkingChild] = useState(false);
  const [linkChildMsg, setLinkChildMsg] = useState<{ text: string; success: boolean } | null>(null);

  const handleLinkChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputChildCode.trim()) return;
    setLinkingChild(true);
    setLinkChildMsg(null);
    const res = await linkChild(inputChildCode.trim());
    setLinkingChild(false);
    setLinkChildMsg({ text: res.message, success: res.success });
    if (res.success) {
      setInputChildCode('');
    }
  };

  useModalScrollLock(showParentLinkModal || showFoodSafetyModal);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm({
      title: 'Đăng xuất tài khoản',
      message: `Bạn có chắc chắn muốn đăng xuất tài khoản "${fullName}" không?`,
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy',
      danger: true,
    });
    if (confirmed) {
      await logout();
    }
  };

  const userIdentifier = user?.studentCode || user?.phone || user?.id || 'HS-FPT';

  const fullName = user?.fullName || zaloProfile?.name || 'Nguyễn Thanh Trà';
  const displayName = fullName.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  const roleColor = 'bg-[#0057b8]';
  const linkedParent = user?.studentLinks?.[0]?.parent;
  const linkedParentLabel = linkedParent
    ? `${linkedParent.fullName || 'Phụ huynh'}${linkedParent.phone ? ` • ${linkedParent.phone}` : ''}`
    : 'Chưa liên kết';
  const isStaff = currentRole === 'STAFF' || user?.role === 'ADMIN';

  const rbacPermissions = [
    { key: 'CANTEEN_CONFIG', name: 'Cấu hình cơ sở & Ca ăn' },
    { key: 'FINANCE_VIEW', name: 'Báo cáo doanh thu & Ví' },
    { key: 'FINANCE_WITHDRAW', name: 'Đối soát & Rút doanh thu' },
    { key: 'SERVING_OPERATION', name: 'Vận hành quầy & QR' },
    { key: 'FEEDBACK_RESOLVE', name: 'Xử lý phản hồi CSAT' },
    { key: 'MENU_MANAGEMENT', name: 'Quản lý thực đơn' },
    { key: 'INVENTORY_MANAGEMENT', name: 'Quản lý kho & BOM' },
    { key: 'PACKAGE_MANAGEMENT', name: 'Quản lý gói vé tháng' },
  ];

  const menuRows = isStaff
    ? [
        {
          key: 'config',
          title: 'Cấu hình cơ sở & Ca ăn',
          sub: !hasPermission('CANTEEN_CONFIG') ? 'Bị khóa' : 'Giờ chốt ca, số món tối đa',
          Icon: hasPermission('CANTEEN_CONFIG') ? Settings : Lock,
          onClick: () => setShowConfigModal(true),
        },
        {
          key: 'safety',
          title: 'Tiêu chuẩn ATVSTP',
          Icon: ShieldCheck,
          onClick: () => setShowFoodSafetyModal(true),
        },
      ]
    : [
        {
          key: 'edit',
          title: 'Thông tin cá nhân & Hồ sơ',
          Icon: User,
          onClick: () => setShowEditProfileModal(true),
        },
        currentRole === 'PARENT'
          ? {
              key: 'parent',
              title: 'Liên kết Học sinh',
              sub:
                childrenList.length > 0
                  ? `Đã liên kết ${childrenList.length} học sinh`
                  : 'Nhập mã học sinh để liên kết',
              Icon: Users,
              onClick: () => {
                setLinkChildMsg(null);
                setShowParentLinkModal(true);
              },
            }
          : {
              key: 'parent',
              title: 'Liên kết Phụ huynh',
              sub: `Mã HS: ${userIdentifier}`,
              Icon: Users,
              onClick: () => setShowParentLinkModal(true),
            },
        {
          key: 'safety',
          title: 'Tiêu chuẩn An toàn Thực phẩm',
          Icon: ShieldCheck,
          onClick: () => setShowFoodSafetyModal(true),
        },
      ];

  return (
    <div className="px-3.5 pt-3 sm:px-5 sm:pt-4 pb-28 space-y-3 bg-[#F7FAFE] min-h-screen">
      {/* 1. HERO PROFILE SECTION (Tối giản) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            {zaloProfile?.avatar ? (
              <img
                src={zaloProfile.avatar}
                alt="Avatar"
                className="w-13 h-13 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div
                className={`w-13 h-13 rounded-full ${roleColor} text-white flex items-center justify-center font-bold text-base`}
              >
                {initials || 'TR'}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">{displayName}</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                {currentRole === 'STUDENT'
                  ? 'Học sinh'
                  : currentRole === 'PARENT'
                  ? 'Phụ huynh'
                  : 'Quản trị'}
              </span>
            </div>

            <p className="text-[11.5px] text-slate-500 truncate">
              {user?.email ||
                (currentRole === 'STUDENT'
                  ? 'student@smartcanteen.vn'
                  : currentRole === 'PARENT'
                  ? 'parent@smartcanteen.vn'
                  : 'canteen.admin@smartcanteen.vn')}
            </p>

            {(user?.studentCode || user?.phone) && (
              <p className="text-[11px] text-slate-400 font-mono truncate">
                {currentRole === 'STUDENT' && user?.studentCode ? user.studentCode : ''}
                {currentRole === 'STUDENT' && user?.studentCode && user?.phone ? ' • ' : ''}
                {user?.phone || ''}
              </p>
            )}
          </div>
        </div>

        {currentRole === 'STUDENT' && (
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-400 shrink-0">Phụ huynh liên kết:</span>
            <span className="font-semibold text-slate-700 truncate">{linkedParentLabel}</span>
          </div>
        )}
      </div>

      {/* 2. MENU OPTIONS LIST (Đồng nhất & tối giản cho mọi vai trò) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        {menuRows.map(({ key, title, sub, Icon, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 cursor-pointer transition active:bg-slate-100/70"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{title}</p>
                {sub && <p className="text-[10.5px] text-slate-500 truncate">{sub}</p>}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        ))}

        {/* Collapsible RBAC Permissions Row for Staff/Admin */}
        {isStaff && (
          <div>
            <button
              type="button"
              onClick={() => setShowPermissions((prev) => !prev)}
              className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-900">Phân quyền tài khoản</p>
                  <span className="text-[10.5px] font-mono font-semibold text-slate-500">
                    {userPermissions.length}/8
                  </span>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                  showPermissions ? 'rotate-90' : ''
                }`}
              />
            </button>

            {showPermissions && (
              <div className="px-4 pb-3 pt-1 flex flex-wrap gap-1.5 bg-slate-50/50">
                {rbacPermissions.map((p) => {
                  const granted = hasPermission(p.key);
                  return (
                    <span
                      key={p.key}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-semibold ${
                        granted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {granted ? (
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                      ) : (
                        <Lock className="w-3 h-3 shrink-0" />
                      )}
                      <span>{p.name}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. ĐĂNG XUẤT TÀI KHOẢN */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full py-3 px-4 rounded-2xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs active:scale-[0.99]"
      >
        <LogOut className="w-4 h-4 text-rose-500" />
        <span>Đăng xuất tài khoản</span>
      </button>

      {/* Canteen & Meal Shift Configuration Modal */}
      <CanteenConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} />

      {/* Select / Change Facility Modal for Student & Parent */}
      <SelectCanteenModal
        isOpen={showChangeFacilityModal}
        isInitial={false}
        onClose={() => setShowChangeFacilityModal(false)}
      />

      {/* Edit Personal Profile Modal */}
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        onOpenChangeFacility={() => setShowChangeFacilityModal(true)}
      />

      {/* Parent Link Info Modal (Centered) */}
      {showParentLinkModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowParentLinkModal(false);
          }}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3.5 shadow-2xl max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {currentRole === 'PARENT' ? 'Liên kết Học sinh' : 'Liên kết Phụ huynh'}
              </h3>
              <button
                type="button"
                onClick={() => setShowParentLinkModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {currentRole === 'PARENT' ? (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-500">
                    Con em đã liên kết ({childrenList.length})
                  </p>
                  {childrenList.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 text-center">
                      Chưa liên kết học sinh nào.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-slate-50/60 overflow-hidden">
                      {childrenList.map((child) => (
                        <div
                          key={child.studentId}
                          className="px-3 py-2.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-bold text-slate-900 truncate">{child.fullName}</span>
                          <span className="font-mono text-[11px] text-[#0057b8] font-semibold shrink-0">
                            {child.linkCode || child.studentId}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleLinkChildSubmit} className="space-y-2.5 pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-semibold text-slate-600 block">
                    Liên kết thêm học sinh
                  </label>
                  <input
                    type="text"
                    value={inputChildCode}
                    onChange={(e) => setInputChildCode(e.target.value)}
                    placeholder="Nhập mã HS (VD: HS-2026-0098) hoặc SĐT"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#0057b8] focus:bg-white uppercase transition"
                  />

                  {linkChildMsg && (
                    <div
                      className={`p-2.5 rounded-xl text-xs font-medium ${
                        linkChildMsg.success
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {linkChildMsg.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={linkingChild || !inputChildCode.trim()}
                    className="w-full py-2.5 rounded-xl bg-[#0057b8] hover:bg-[#004593] text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {linkingChild ? 'Đang liên kết...' : 'Liên kết học sinh'}
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">Đã liên kết:</span>
                  <span className="font-bold text-slate-900 truncate">{linkedParentLabel}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10.5px] text-slate-500">Mã liên kết học sinh</p>
                    <p className="text-sm font-bold font-mono text-slate-900 truncate">{userIdentifier}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(userIdentifier)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                  >
                    {copiedText === userIdentifier ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Phụ huynh nhập mã này trên Zalo Mini App để theo dõi suất ăn và nạp ví cho học sinh.
                </p>

                <button
                  type="button"
                  onClick={() => setShowParentLinkModal(false)}
                  className="w-full py-2.5 rounded-xl bg-[#0057b8] hover:bg-[#004593] text-white font-bold text-xs transition cursor-pointer"
                >
                  Đóng
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Food Safety Standards Modal (Centered) */}
      {showFoodSafetyModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFoodSafetyModal(false);
          }}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3.5 shadow-2xl max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Tiêu chuẩn An toàn Thực phẩm</h3>
              <button
                type="button"
                onClick={() => setShowFoodSafetyModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc pl-4">
              <li>Đạt chứng nhận ATVSTP loại A theo quy chuẩn Bộ Y tế.</li>
              <li>100% nguyên liệu truy xuất nguồn gốc và kiểm định đầu vào mỗi ngày.</li>
              <li>Thực hiện kiểm thực 3 bước và lưu mẫu thức ăn đủ 24 giờ.</li>
            </ul>

            <button
              type="button"
              onClick={() => setShowFoodSafetyModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#0057b8] hover:bg-[#004593] text-white font-bold text-xs transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
