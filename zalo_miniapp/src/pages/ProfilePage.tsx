import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { TabKey } from '../components/BottomNavigation';
import {
  User,
  CreditCard,
  QrCode,
  History,
  PlusCircle,
  X,
  Phone,
  Mail,
  Sparkles,
  MessageSquareHeart,
  Star,
  Copy,
  Check,
  RotateCcw,
  Calendar,
  Building2,
  Users,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Bell,
  Lock,
  BarChart3,
  ChefHat,
  ScanLine,
  Settings,
  CheckCircle2,
  KeyRound,
  Edit3,
  GraduationCap,
} from 'lucide-react';
import { FeedbackModal } from '../components/FeedbackModal';
import { CanteenConfigModal } from '../components/CanteenConfigModal';
import { SelectCanteenModal } from '../components/SelectCanteenModal';
import { KitchenForecastModal } from '../components/KitchenForecastModal';
import { EditProfileModal } from '../components/EditProfileModal';

interface ProfilePageProps {
  onNavigateTab: (tab: TabKey) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigateTab }) => {
  const {
    user,
    zaloProfile,
    wallet,
    refreshUserData,
    selectedCanteen,
    currentRole,
    logout,
    switchAccount,
    activeOrders,
    refreshOrders,
    myFeedbacks,
    hasPermission,
    userPermissions,
  } = useApp();

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showChangeFacilityModal, setShowChangeFacilityModal] = useState(false);
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Feedback Modal
  const [selectedOrderForFeedback, setSelectedOrderForFeedback] = useState<any | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Cancel order state
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const remainingMeals = Number(wallet?.remainingMeals ?? 0);
  const balance = Number(wallet?.balance ?? 0);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn đặt suất ăn này?')) return;
    try {
      setCancellingOrderId(orderId);
      await api.put(`/orders/${orderId}/cancel`);
      setCancelMessage('Đã hủy đơn hàng thành công. Lượt ăn/tiền đã được hoàn lại.');
      await refreshOrders();
      await refreshUserData();
      setTimeout(() => setCancelMessage(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể hủy đơn hàng này.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleLogout = async () => {
    if (confirm(`Bạn có chắc chắn muốn đăng xuất tài khoản "${fullName}" khỏi Zalo Mini App?`)) {
      await logout();
    }
  };

  const userIdentifier = user?.studentCode || user?.phone || user?.id || 'HS-FPT';

  const mealLabels: Record<string, string> = {
    BREAKFAST: 'Bữa Sáng',
    LUNCH: 'Bữa Trưa',
    DINNER: 'Bữa Tối',
  };

  const fullName = user?.fullName || zaloProfile?.name || 'Nguyễn Thanh Trà';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  const roleColor = 'bg-[#0057b8]';

  return (
    <div className="p-4 space-y-4 pb-28 bg-[#F7FAFE] min-h-screen">
      {/* 1. HERO PROFILE SECTION (1:1 with Flutter UserProfileScreen Hero Section) */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-sm text-center space-y-3">
        {/* Large Avatar */}
        <div className="relative inline-block">
          {zaloProfile?.avatar ? (
            <img
              src={zaloProfile.avatar}
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md mx-auto"
            />
          ) : (
            <div
              className={`w-20 h-20 rounded-full ${roleColor} text-white flex items-center justify-center font-black text-2xl shadow-md mx-auto`}
            >
              {initials || 'TR'}
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white" />
        </div>

        {/* User Details */}
        <div>
          <h3 className="text-lg font-black text-[#131B2E]">{fullName}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {user?.email || (currentRole === 'STUDENT' ? 'student@smartcanteen.vn' : currentRole === 'PARENT' ? 'parent@smartcanteen.vn' : 'canteen.admin@smartcanteen.vn')}
          </p>
          <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
            {currentRole === 'STUDENT' && user?.studentCode && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-[#EFF6FF] text-[#003E82] border border-[#D0E7FF]">
                <GraduationCap className="w-3.5 h-3.5 text-[#003E82]" />
                <span>MSSV: {user.studentCode}</span>
              </span>
            )}
            {user?.phone && (
              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{user.phone}</span>
              </span>
            )}
          </div>
        </div>

        {/* Role Pill & Edit Button */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2">
          {currentRole === 'PARENT' ? (
            <button
              type="button"
              onClick={async () => {
                await switchAccount('student@smartcanteen.vn', '123456');
                onNavigateTab('menu');
              }}
              className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-[#003E82] text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            >
              <span>🎒 Chuyển sang Học Sinh (Nguyễn Văn An)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await switchAccount('parent@smartcanteen.vn', '123456');
                onNavigateTab('children');
              }}
              className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            >
              <span>👨‍👩‍👧 Chuyển sang Phụ Huynh (Nguyễn Văn Ba)</span>
            </button>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 pt-0.5 flex-wrap">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EFF6FF] text-[#003E82]">
            {currentRole === 'STUDENT'
              ? 'Học sinh / Thành viên'
              : currentRole === 'PARENT'
              ? 'Phụ huynh'
              : 'Quản trị Cơ sở (Admin Canteen)'}
          </span>
          <button
            type="button"
            onClick={() => setShowEditProfileModal(true)}
            className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition cursor-pointer border border-slate-200 shadow-2xs active:scale-95"
            title="Chỉnh sửa thông tin cá nhân"
          >
            <Edit3 className="w-3 h-3 text-[#003E82]" />
            <span>Chỉnh sửa hồ sơ</span>
          </button>
        </div>
      </div>

      {/* 2. BRANCH ASSIGNMENT CARD FOR STAFF / BRANCH ADMIN */}
      {(currentRole === 'STAFF' || user?.role === 'ADMIN') && (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#EFF6FF] text-[#003E82] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cơ sở được phân công</p>
                <h4 className="text-sm font-black text-[#131B2E]">
                  {selectedCanteen?.name || user?.canteen?.name || 'THPT FPT Quy Nhơn • Cơ sở 1'}
                </h4>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <Lock className="w-3 h-3" />
              Cố định
            </span>
          </div>

          <div className="bg-[#F7FAFE] rounded-2xl p-3 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#003E82] shrink-0 mt-0.5" />
            <p>
              Tài khoản Quản trị cơ sở được gán phạm vi cố định với cơ sở này. Tất cả dữ liệu doanh thu, hàng đợi nhận cơm và phản hồi CSAT chỉ hiển thị thuộc phạm vi cơ sở được phân công.
            </p>
          </div>

          {/* Quick shortcuts */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('overview')}
                className="py-2.5 px-2 rounded-2xl bg-[#003E82] hover:bg-[#004b8c] text-white font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
              >
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span>Doanh thu</span>
              </button>
              <button
                type="button"
                onClick={() => setShowForecastModal(true)}
                className="py-2.5 px-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-[#131B2E] font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <ChefHat className="w-3.5 h-3.5 text-[#003E82] shrink-0" />
                <span>Dự báo BOM</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('scan')}
                className="py-2.5 px-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-[#131B2E] font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <ScanLine className="w-3.5 h-3.5 text-[#003E82] shrink-0" />
                <span>Quét QR</span>
              </button>
            </div>

            {/* Canteen & Meal Shift Config Trigger */}
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className={`w-full py-2.5 px-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                hasPermission('CANTEEN_CONFIG')
                  ? 'bg-[#0057b8] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              {hasPermission('CANTEEN_CONFIG') ? (
                <Settings className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4 text-amber-500" />
              )}
              <span>Cấu hình cơ sở & Ca ăn (Giờ chốt Cut-off)</span>
              {!hasPermission('CANTEEN_CONFIG') && (
                <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold ml-1">
                  Bị khóa
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 2.1 PERMISSION RBAC CARD FOR STAFF / BRANCH ADMIN */}
      {(currentRole === 'STAFF' || user?.role === 'ADMIN') && (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#003E82]" />
              <h4 className="text-xs font-bold text-[#131B2E] uppercase tracking-wider">
                Phân quyền tài khoản cơ sở (RBAC)
              </h4>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500">
              {userPermissions.length}/8 quyền
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Quyền hạn được Quản trị viên cấp cao (Web Admin) phân bổ tập trung. Tính năng không được cấp quyền sẽ tự động bị khóa trên thiết bị.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {[
              {
                key: 'CANTEEN_CONFIG',
                name: 'Cấu hình cơ sở & Ca ăn',
                desc: 'Giờ chốt ca (Cut-off), maxDishes, giá suất',
              },
              {
                key: 'FINANCE_VIEW',
                name: 'Báo cáo doanh thu & Ví',
                desc: 'Xem báo cáo tài chính, biểu đồ 7 ngày',
              },
              {
                key: 'FINANCE_WITHDRAW',
                name: 'Đối soát & Rút doanh thu',
                desc: 'Yêu cầu đối soát tiền về ngân hàng cơ sở',
              },
              {
                key: 'SERVING_OPERATION',
                name: 'Vận hành quầy gắp & Check-in',
                desc: 'Quét QR nhận cơm, điều phối KDS',
              },
              {
                key: 'FEEDBACK_RESOLVE',
                name: 'Xử lý phản hồi CSAT',
                desc: 'Xem & gửi phản hồi giải quyết cho học sinh',
              },
              {
                key: 'MENU_MANAGEMENT',
                name: 'Quản lý thực đơn & Món ăn',
                desc: 'Đồng bộ thực đơn tuần từ Excel',
              },
              {
                key: 'INVENTORY_MANAGEMENT',
                name: 'Quản lý kho & Nguyên liệu',
                desc: 'Quản lý định lượng BOM và tồn kho',
              },
              {
                key: 'PACKAGE_MANAGEMENT',
                name: 'Quản lý gói ăn & Vé tháng',
                desc: 'Quản lý các gói ăn tháng cơ sở',
              },
            ].map((p) => {
              const granted = hasPermission(p.key);
              return (
                <div
                  key={p.key}
                  className={`p-2.5 rounded-2xl border flex items-start gap-2.5 transition ${
                    granted
                      ? 'bg-emerald-50/40 border-emerald-200/80'
                      : 'bg-slate-50 border-slate-200/80 opacity-70'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {granted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-[11px] text-[#131B2E] truncate">
                        {p.name}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono shrink-0 ${
                          granted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {granted ? 'Đã cấp' : 'Khóa'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. FACILITY LOCK & CONFIGURATION CARD FOR STUDENT & PARENT */}
      {(currentRole === 'STUDENT' || currentRole === 'PARENT') && (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-sm space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] text-[#003E82] flex items-center justify-center shrink-0 border border-[#D0E7FF]">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Cơ sở học tập & Canteen phục vụ
                </p>
                <h4 className="text-sm font-black text-[#131B2E] truncate">
                  {selectedCanteen?.name || 'THPT FPT Quy Nhơn • Cơ sở 1'}
                </h4>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#003E82] border border-[#D0E7FF] shrink-0">
              <Lock className="w-3 h-3 text-[#003E82]" />
              Cố định
            </span>
          </div>

          <div className="bg-[#F7FAFE] rounded-2xl p-3 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-[#003E82] shrink-0 mt-0.5" />
            <p>
              Cơ sở đã được <strong>khóa chặt</strong> theo tài khoản để tránh việc đặt nhầm suất ăn tại trường khác. Thực đơn hôm nay và giỏ hàng được đồng bộ tự động theo cơ sở này.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowChangeFacilityModal(true)}
            className="w-full py-2.5 px-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer bg-white border border-[#003E82] text-[#003E82] hover:bg-[#EFF6FF] shadow-xs active:scale-[0.99]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Thay đổi cơ sở học tập / Canteen</span>
          </button>
        </div>
      )}

      {/* 2. QUICK SHORTCUTS & WALLET SUMMARY FOR STUDENT (Clean & Minimalist) */}
      {currentRole === 'STUDENT' && (
        <div className="bg-gradient-to-br from-[#003E82] via-[#0057b8] to-[#0284C7] text-white rounded-3xl p-5 shadow-[0_8px_24px_rgba(0,87,184,0.22)] space-y-3.5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs relative z-10">
            <span className="font-bold text-white/90">Ví Canteen & Vé Tháng</span>
            <span className="bg-white/20 text-white font-semibold text-[9.5px] px-2 py-0.5 rounded-full backdrop-blur-xs">
              Đang hoạt động
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 relative z-10">
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/20">
              <p className="text-[10px] text-white/80 font-medium">Vé Tháng Bán Trú</p>
              <p className="text-xl font-bold mt-0.5 font-mono">{remainingMeals} suất</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/20">
              <p className="text-[10px] text-white/80 font-medium">Số Dư Ví</p>
              <p className="text-xl font-bold mt-0.5 font-mono">
                {Number(balance).toLocaleString('vi-VN')}đ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5 relative z-10">
            <button
              type="button"
              onClick={() => onNavigateTab('wallet')}
              className="py-2.5 rounded-xl bg-white text-[#0057b8] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50 cursor-pointer shadow-2xs active:scale-95 transition"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Nạp ví / Xem vé</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('qr')}
              className="py-2.5 rounded-xl bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-white/30 cursor-pointer active:scale-95 transition backdrop-blur-xs"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Nhận Cơm</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. MENU OPTIONS LIST (1:1 with Flutter UserProfileScreen) */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm divide-y divide-slate-100 overflow-hidden text-xs">
        {currentRole === 'STAFF' || user?.role === 'ADMIN' ? (
          <>
            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-[#131B2E]">Tài khoản học sinh & phụ huynh</p>
                  <p className="text-[10.5px] text-slate-500">Xem danh sách, số dư ví và vé tháng cơ sở</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('feedbacks')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#003E82] flex items-center justify-center">
                  <MessageSquareHeart className="w-4 h-4 text-[#003E82]" />
                </div>
                <div>
                  <p className="font-bold text-[#131B2E]">Xử lý phản hồi CSAT của học sinh & phụ huynh</p>
                  <p className="text-[10.5px] text-slate-500">Tiếp nhận và phản hồi đánh giá món ăn cơ sở</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                alert('Chính sách An toàn Thực phẩm: Canteen tuân thủ quy chuẩn ATVSTP Bộ Y tế và lưu mẫu thức ăn 24h đối với 100% bữa ăn.');
              }}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#003E82] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-[#131B2E]">Tiêu chuẩn ATVSTP & Lưu mẫu 24h</p>
                  <p className="text-[10.5px] text-slate-500">Chứng nhận đạt chuẩn loại A & Kiểm thực 3 bước</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowEditProfileModal(true)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 cursor-pointer transition border-b border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#003E82] flex items-center justify-center">
                  <User className="w-4 h-4 text-[#003E82]" />
                </div>
                <div>
                  <p className="font-bold text-[#131B2E]">Thông tin cá nhân & Hồ sơ</p>
                  <p className="text-[10.5px] text-slate-500">Chỉnh sửa họ tên, số điện thoại, đổi mật khẩu</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('feedback')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center">
                  <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                </div>
                <div>
                  <p className="font-bold text-[#131B2E]">Đánh giá trải nghiệm ăn uống (CSAT)</p>
                  <p className="text-[10.5px] text-slate-500">Góp ý trực tiếp tới Bếp Canteen trường</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                alert(`Tính năng liên kết phụ huynh: Mã kết nối học sinh của bạn là ${userIdentifier}. Phụ huynh có thể nhập mã này trên Zalo Mini App để đồng bộ.`);
              }}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-[#131B2E]">Liên kết tài khoản Phụ huynh</p>
                  <p className="text-[10.5px] text-slate-500">Mã liên kết học sinh: {userIdentifier}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                alert('Chính sách An toàn Thực phẩm: Canteen đạt chuẩn ATVSTP loại A, 100% nguyên liệu truy xuất nguồn gốc mỗi ngày.');
              }}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-[#131B2E]">Tiêu chuẩn An toàn Vệ sinh Thực phẩm</p>
                  <p className="text-[10.5px] text-slate-500">Chứng nhận ISO & Nguồn gốc nguyên liệu</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </>
        )}
      </div>

      {/* 4. ĐĂNG XUẤT TÀI KHOẢN */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-4 shadow-sm">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3 px-4 rounded-2xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-rose-500" />
          <span>Đăng xuất tài khoản</span>
        </button>
      </div>

      {/* Canteen & Meal Shift Configuration Modal */}
      <CanteenConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} />

      {/* Kitchen Forecast & BOM Modal for Branch Admin */}
      <KitchenForecastModal
        isOpen={showForecastModal}
        onClose={() => setShowForecastModal(false)}
      />

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
    </div>
  );
};
