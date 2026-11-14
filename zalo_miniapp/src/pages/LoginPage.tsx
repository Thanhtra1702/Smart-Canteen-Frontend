import React, { useState } from 'react';
import { ChefHat, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LoginPage: React.FC = () => {
  const { switchAccount, loading, brand } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const success = await switchAccount(email.trim(), password);
      if (!success) {
        setError('Email hoặc mật khẩu không chính xác.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Email hoặc mật khẩu không chính xác.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = loading || isSubmitting;

  return (
    <div className="min-h-screen bg-[#fbfaf9] flex flex-col items-center justify-center p-4 selection:bg-blue-100 selection:text-primary font-sans">
      {/* Main Login Card - Clean & Minimalist layout matching Web Admin */}
      <div className="w-full max-w-[400px] bg-white rounded-xl border border-gray-200 p-7 sm:p-9 shadow-[0_2px_16px_rgba(0,92,172,0.06)]">
        {/* Brand Logo - Top-left aligned */}
        <div className="flex items-center gap-2 mb-7">
          <div className="size-8 rounded-lg bg-[#003E82] text-white flex items-center justify-center shadow-xs">
            <ChefHat className="size-4.5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#003E82]">
            smartcanteen
          </span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider ml-auto font-mono">
            Mobile App
          </span>
        </div>

        {/* Heading & Subtitle */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#222d39] tracking-tight leading-tight">
            Welcome back!
          </h1>
          <p className="text-sm text-[#627284] mt-1.5">
            Đăng nhập vào tài khoản của bạn
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
            <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Demo 1-Tap Login Buttons */}
        <div className="mb-5 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#003E82] uppercase tracking-wider">
              ⚡ Đăng nhập nhanh 1 chạm (Demo)
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Khuyên dùng</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={async () => {
                setEmail('parent@smartcanteen.vn');
                setPassword('123456');
                setIsSubmitting(true);
                setError(null);
                try {
                  await switchAccount('parent@smartcanteen.vn', '123456');
                } catch (err: any) {
                  setError(err?.message || 'Lỗi đăng nhập');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="py-2.5 px-2 rounded-lg bg-white border border-[#003E82]/30 hover:border-[#003E82] hover:bg-[#003E82]/5 text-[#003E82] text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer text-center shadow-xs"
            >
              <span className="flex items-center gap-1">👨‍👩‍👧 Phụ Huynh</span>
              <span className="text-[9.5px] font-normal text-slate-500">Nguyễn Văn Ba</span>
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={async () => {
                setEmail('student@smartcanteen.vn');
                setPassword('123456');
                setIsSubmitting(true);
                setError(null);
                try {
                  await switchAccount('student@smartcanteen.vn', '123456');
                } catch (err: any) {
                  setError(err?.message || 'Lỗi đăng nhập');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="py-2.5 px-2 rounded-lg bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer text-center shadow-xs"
            >
              <span className="flex items-center gap-1">🎒 Học Sinh</span>
              <span className="text-[9.5px] font-normal text-slate-500">Nguyễn Văn An</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#222d39]">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-3.5 bg-white border border-gray-300 rounded-lg text-sm text-[#222d39] placeholder:text-slate-400 focus:border-[#003E82] focus:ring-1 focus:ring-[#003E82] outline-hidden transition-all shadow-xs"
              placeholder="student@smartcanteen.vn"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#222d39]">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-11 pl-3.5 pr-10 bg-white border border-gray-300 rounded-lg text-sm text-[#222d39] placeholder:text-slate-400 focus:border-[#003E82] focus:ring-1 focus:ring-[#003E82] outline-hidden transition-all shadow-xs"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={isBusy}
            className="w-full h-11 mt-3 bg-[#003E82] hover:bg-[#004e92] active:bg-[#003875] text-white font-medium text-sm rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed outline-hidden focus-visible:ring-2 focus-visible:ring-[#003E82] focus-visible:ring-offset-2"
          >
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>
        </form>
      </div>

      {/* Outside Card Footer */}
      <div className="mt-6 flex flex-col items-center gap-1.5 text-center text-xs text-[#627284]">
        <p>Hệ thống Suất ăn Học đường Thông minh</p>
        <p className="text-[11px] text-slate-400">© 2026 Smart Canteen • Bảo mật cấp cao</p>
      </div>
    </div>
  );
};
