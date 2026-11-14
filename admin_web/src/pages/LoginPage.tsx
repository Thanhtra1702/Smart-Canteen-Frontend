import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  AlertCircle,
  Loader2,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Crown,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  // Ping backend to confirm live connectivity
  useEffect(() => {
    let isMounted = true;
    api.get('/canteens')
      .then(() => {
        if (isMounted) setServerOnline(true);
      })
      .catch((err) => {
        if (err.response) {
          if (isMounted) setServerOnline(true);
        } else {
          if (isMounted) setServerOnline(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Support ?demo=admin or ?demo=staff in URL for 1-click frictionless testing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demoRole = params.get('demo');
    if (demoRole === 'admin') {
      setEmail('admin@smartcanteen.vn');
      setPassword('123456');
      performLogin('admin@smartcanteen.vn', '123456');
    } else if (demoRole === 'staff') {
      setEmail('staff@smartcanteen.vn');
      setPassword('123456');
      performLogin('staff@smartcanteen.vn', '123456');
    }
  }, []);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError('');
    setIsLoading(true);

    try {
      const cleanEmail = String(loginEmail || '').trim().toLowerCase();
      const cleanPass = String(loginPass || '').trim();
      const res = await api.post('/auth/login', { email: cleanEmail, password: cleanPass });
      const { token, user } = res.data;

      if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
        setError('Cổng Web Quản trị dành riêng cho Ban Quản trị (Admin Tổng HQ & Admin Cơ sở). Học sinh và phụ huynh vui lòng sử dụng Zalo Mini App.');
        setIsLoading(false);
        return;
      }

      login(token, user);
    } catch (err: any) {
      console.error('Login error details:', err);
      const backendMsg = err.response?.data?.message;
      const netMsg = err.message;
      const status = err.response?.status;

      if (backendMsg) {
        setError(status ? `${backendMsg} (Mã lỗi: ${status})` : backendMsg);
      } else if (netMsg === 'Network Error' || !err.response) {
        setError('Lỗi kết nối mạng: Trình duyệt đang giữ cache cũ. Vui lòng bấm nút "Làm mới & Tải phiên bản mới nhất" bên dưới.');
      } else {
        setError(netMsg || 'Email hoặc mật khẩu không chính xác.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const handleQuickLogin = async (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword('123456');
    await performLogin(quickEmail, '123456');
  };

  const handleForceReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    const cleanUrl = window.location.origin + window.location.pathname + '?reload=' + Date.now();
    window.location.href = cleanUrl;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans antialiased selection:bg-blue-100 selection:text-primary">
      {/* Main Login Container */}
      <div className="w-full max-w-[430px] bg-white rounded-2xl border border-slate-200 p-7 sm:p-9 shadow-sm">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <ChefHat className="size-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                Smart Canteen
              </span>
              <span className="text-[11px] font-medium text-slate-500 block leading-none mt-0.5">
                Chuỗi Căn Tin Học Đường
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 font-mono">
            <ShieldCheck className="size-3.5 text-slate-500" />
            <span>HQ Portal</span>
          </span>
        </div>

        {/* Server Status Indicator */}
        <div className="mb-5 flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px]">
          <span className="text-slate-500 font-medium">Trạng thái máy chủ:</span>
          {serverOnline === null ? (
            <span className="text-amber-600 font-semibold flex items-center gap-1">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse"></span>
              Đang kiểm tra...
            </span>
          ) : serverOnline ? (
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              Sẵn sàng kết nối
            </span>
          ) : (
            <span className="text-rose-600 font-semibold flex items-center gap-1">
              <span className="size-2 rounded-full bg-rose-500"></span>
              Chưa kết nối API
            </span>
          )}
        </div>

        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Đăng nhập Ban Quản Trị
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
            Vui lòng nhập thông tin xác thực để vào hệ thống điều hành.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium space-y-2 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="flex-1 leading-relaxed">{error}</span>
            </div>
            <button
              type="button"
              onClick={handleForceReload}
              className="w-full py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs"
            >
              <RotateCcw className="size-3" />
              Bấm vào đây để Tải lại trang (F5) & Xóa cache
            </button>
          </div>
        )}

        {/* 1-Click Fast Login for Testing & Demos */}
        <div className="mb-5 p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
              ⚡ Đăng nhập nhanh (Bản Demo)
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Mật khẩu: 123456</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickLogin('admin@smartcanteen.vn')}
              className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-left cursor-pointer group shadow-2xs disabled:opacity-60"
              title="Đăng nhập tài khoản Tổng quản trị HQ"
            >
              <div className="size-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Crown className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">Super Admin</p>
                <p className="text-[10px] text-slate-500 truncate">admin@smartcanteen.vn</p>
              </div>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickLogin('admin.cs1@smartcanteen.vn')}
              className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-left cursor-pointer group shadow-2xs disabled:opacity-60"
              title="Đăng nhập tài khoản Quản trị Cơ sở 1"
            >
              <div className="size-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Building2 className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">Admin CS1</p>
                <p className="text-[10px] text-slate-500 truncate">admin.cs1@smartcanteen.vn</p>
              </div>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Địa chỉ Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="size-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-10 pl-9.5 pr-3.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 outline-hidden transition-all shadow-xs"
                placeholder="admin@smartcanteen.vn"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-700">
                Mật khẩu
              </label>
              <span className="text-[11px] text-slate-400 font-normal">
                Mặc định: 123456
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="size-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-10 pl-9.5 pr-10 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 outline-hidden transition-all shadow-xs"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10.5 mt-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-medium text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <span>Đăng nhập hệ thống</span>
            )}
          </button>
        </form>

        {/* Reload Helper */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center">
          <button
            type="button"
            onClick={handleForceReload}
            className="text-xs text-slate-500 hover:text-primary flex items-center gap-1.5 font-medium cursor-pointer transition"
          >
            <RotateCcw className="size-3.5" />
            <span>Làm mới & Tải phiên bản mới nhất</span>
          </button>
        </div>
      </div>

      {/* Outside Footer */}
      <footer className="mt-6 flex flex-col items-center gap-1 text-center text-xs text-slate-500">
        <p>Hệ thống Quản trị Vận hành & Căn Tin Chuỗi Học Đường</p>
        <p className="text-[11px] text-slate-400">© 2026 Smart Canteen System • Tiêu chuẩn an toàn & bảo mật</p>
      </footer>
    </div>
  );
};
