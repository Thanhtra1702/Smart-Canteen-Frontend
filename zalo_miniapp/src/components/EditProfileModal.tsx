import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Lock,
  Building2,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  ShieldCheck,
  RotateCcw,
  GraduationCap,
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChangeFacility?: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenChangeFacility,
}) => {
  useModalScrollLock(isOpen);
  const { user, refreshUserData, selectedCanteen, currentRole } = useApp();

  const [fullName, setFullName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [phone, setPhone] = useState('');
  const [wantChangePassword, setWantChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.fullName || '');
      setStudentCode(user.studentCode || '');
      setPhone(user.phone || '');
      setWantChangePassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên của bạn');
      return;
    }

    if (wantChangePassword) {
      if (!newPassword || newPassword.length < 6) {
        setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('Mật khẩu xác nhận không khớp');
        return;
      }
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const payload: any = {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        studentCode: currentRole === 'STUDENT' ? (studentCode.trim() ? studentCode.trim().toUpperCase() : undefined) : undefined,
      };

      if (wantChangePassword && newPassword) {
        payload.newPassword = newPassword;
      }

      await api.put('/users/me', payload);
      await refreshUserData();

      setSuccessMsg('Cập nhật thông tin cá nhân thành công!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Không thể cập nhật thông tin. Vui lòng thử lại!'
      );
    } finally {
      setLoading(false);
    }
  };

  const branchName = selectedCanteen?.name || user?.canteen?.name || 'Canteen Cơ Sở 1';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto overscroll-contain modal-scrollable touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] text-[#003E82] flex items-center justify-center border border-[#D0E7FF]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#131B2E]">Chỉnh Sửa Thông Tin Cá Nhân</h3>
              <p className="text-[11px] text-slate-500">Cập nhật hồ sơ tài khoản học sinh / người dùng</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-bold">{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Họ và tên */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#131B2E] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#003E82]" />
              <span>Họ và tên học sinh <strong className="text-rose-500">*</strong></span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn An"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#131B2E] focus:outline-none focus:border-[#003E82] focus:bg-white transition"
            />
          </div>

          {/* Mã số học sinh / sinh viên (MSSV) - Chỉ hiển thị cho Học sinh */}
          {currentRole === 'STUDENT' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#131B2E] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#003E82]" />
                  <span>Mã số học sinh / sinh viên (MSSV)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Phiếu ăn & Nhận diện</span>
              </label>
              <input
                type="text"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                placeholder="Ví dụ: HS-2026-0098 hoặc SE180123"
                maxLength={30}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#131B2E] uppercase font-mono focus:outline-none focus:border-[#003E82] focus:bg-white transition"
              />
              <p className="text-[10.5px] text-slate-400">
                Mã MSSV dùng để hiển thị trên Phiếu ăn điện tử (QR Pass) và để phụ huynh liên kết tài khoản con.
              </p>
            </div>
          )}

          {/* Số điện thoại */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#131B2E] flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#003E82]" />
              <span>Số điện thoại liên hệ</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ví dụ: 0903000001"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#131B2E] focus:outline-none focus:border-[#003E82] focus:bg-white transition"
            />
          </div>

          {/* Email (Readonly) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#131B2E] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Email tài khoản</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Cố định theo trường</span>
            </label>
            <input
              type="email"
              disabled
              value={user?.email || 'student@smartcanteen.vn'}
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed"
            />
          </div>

          {/* Cơ sở học tập / Canteen phục vụ */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-[#003E82] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Cơ sở học tập
                  </span>
                  <p className="text-xs font-bold text-[#131B2E] truncate">
                    {branchName}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#003E82] border border-[#D0E7FF] shrink-0">
                <ShieldCheck className="w-2.5 h-2.5 text-[#003E82]" />
                Cố định
              </span>
            </div>

            {onOpenChangeFacility && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChangeFacility();
                }}
                className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-[#003E82] font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Thay đổi cơ sở trường học</span>
              </button>
            )}
          </div>

          {/* Đổi mật khẩu toggle */}
          <div className="pt-1 border-t border-slate-100 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={wantChangePassword}
                onChange={(e) => setWantChangePassword(e.target.checked)}
                className="w-4 h-4 text-[#003E82] rounded accent-[#003E82] cursor-pointer"
              />
              <span className="text-xs font-bold text-[#131B2E] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#003E82]" />
                <span>Tôi muốn đổi mật khẩu đăng nhập</span>
              </span>
            </label>

            {wantChangePassword && (
              <div className="space-y-2 p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Mật khẩu mới (tối thiểu 6 ký tự)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[#003E82]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nhập lại mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Xác nhận mật khẩu mới..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[#003E82]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer text-center"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-2 py-3 px-4 rounded-2xl bg-[#003E82] hover:bg-[#004b8c] text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

