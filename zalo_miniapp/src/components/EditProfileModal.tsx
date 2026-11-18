import React, { useState, useEffect } from 'react';
import {
  XIcon as X,
  CheckCircleIcon as CheckCircle2,
  WarningCircleIcon as AlertCircle,
} from '@phosphor-icons/react';
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
}) => {
  useModalScrollLock(isOpen);
  const { user, refreshUserData, currentRole } = useApp();

  const [fullName, setFullName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [phone, setPhone] = useState('');
  const [wantChangePassword, setWantChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      setErrorMsg('Vui lòng nhập họ và tên');
      return;
    }

    if (wantChangePassword) {
      if (!newPassword || newPassword.length < 6) {
        setErrorMsg('Mật khẩu mới tối thiểu 6 ký tự');
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
        studentCode:
          currentRole === 'STUDENT'
            ? studentCode.trim()
              ? studentCode.trim().toUpperCase()
              : undefined
            : undefined,
      };

      if (wantChangePassword && newPassword) {
        payload.newPassword = newPassword;
      }

      await api.put('/users/me', payload);
      await refreshUserData();

      setSuccessMsg('Đã cập nhật thông tin!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Không thể cập nhật thông tin.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[85vh] overflow-y-auto overscroll-contain modal-scrollable touch-pan-y animate-in zoom-in-95 duration-150"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Thông tin cá nhân</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Họ và tên */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập họ và tên"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0057b8] focus:bg-white transition"
            />
          </div>

          {/* MSSV */}
          {currentRole === 'STUDENT' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">MSSV</label>
              <input
                type="text"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                placeholder="VD: HS-2026-0098"
                maxLength={30}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 uppercase font-mono focus:outline-none focus:border-[#0057b8] focus:bg-white transition"
              />
            </div>
          )}

          {/* Số điện thoại */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">Số điện thoại</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:outline-none focus:border-[#0057b8] focus:bg-white transition"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">Email</label>
            <input
              type="email"
              disabled
              value={user?.email || 'student@smartcanteen.vn'}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200/80 rounded-xl text-xs text-slate-500 cursor-not-allowed"
            />
          </div>

          {/* Đổi mật khẩu */}
          <div className="pt-1 border-t border-slate-100 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none py-0.5">
              <input
                type="checkbox"
                checked={wantChangePassword}
                onChange={(e) => setWantChangePassword(e.target.checked)}
                className="w-4 h-4 rounded accent-[#0057b8] cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-800">Đổi mật khẩu</span>
            </label>

            {wantChangePassword && (
              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[#0057b8]"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[#0057b8]"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#0057b8] hover:bg-[#004593] text-white font-bold text-xs transition cursor-pointer flex items-center justify-center active:scale-98 disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

