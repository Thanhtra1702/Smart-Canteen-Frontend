import React, { useState, useEffect, useRef } from 'react';
import {
  XIcon as X,
  UploadSimpleIcon as Upload,
  BuildingsIcon as Building2,
  ArrowCounterClockwiseIcon as RotateCcw,
  ChefHatIcon as ChefHat,
  CheckIcon as Check,
  WarningCircleIcon as AlertCircle,
  LinkIcon,
} from '@phosphor-icons/react';
import { useBrand, DEFAULT_BRAND } from '../context/BrandContext';
import { useToast } from '../context/ToastContext';

export const BrandSettingsModal: React.FC = () => {
  const { brand, isBrandModalOpen, closeBrandModal, updateBrand } = useBrand();
  const toast = useToast();

  const [brandName, setBrandName] = useState(brand.brandName);
  const [brandSubtitle, setBrandSubtitle] = useState(brand.brandSubtitle);
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl);
  const [activeLogoTab, setActiveLogoTab] = useState<'upload' | 'url'>('upload');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state whenever modal opens or brand changes
  useEffect(() => {
    if (isBrandModalOpen) {
      setBrandName(brand.brandName || DEFAULT_BRAND.brandName);
      setBrandSubtitle(brand.brandSubtitle || DEFAULT_BRAND.brandSubtitle);
      setLogoUrl(brand.logoUrl || '');
      setErrorMessage(null);
    }
  }, [isBrandModalOpen, brand]);

  if (!isBrandModalOpen) return null;

  // Tự động nén và thu nhỏ ảnh logo về kích thước tối ưu (tối đa 320x320 px, ~15-30KB) để upload tức thì, không bị lỗi 502/timeout
  const compressImageForLogo = (file: File, maxDimension = 320): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Không thể đọc tệp SVG'));
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const compressed = canvas.toDataURL(outputMime, 0.9);
          resolve(compressed);
        };
        img.onerror = () => reject(new Error('Tệp hình ảnh không hợp lệ hoặc bị lỗi'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Vui lòng chọn tệp định dạng hình ảnh hợp lệ (PNG, JPG, SVG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Kích thước ảnh tối đa cho phép là 5MB');
      return;
    }

    setErrorMessage(null);
    try {
      const compressedDataUrl = await compressImageForLogo(file, 320);
      setLogoUrl(compressedDataUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể xử lý tệp ảnh. Vui lòng thử lại.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleResetToDefault = () => {
    setBrandName(DEFAULT_BRAND.brandName);
    setBrandSubtitle(DEFAULT_BRAND.brandSubtitle);
    setLogoUrl('');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      setErrorMessage('Tên thương hiệu không được để trống');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await updateBrand({
        brandName: brandName.trim(),
        brandSubtitle: brandSubtitle.trim(),
        logoUrl: logoUrl.trim(),
      });
      toast.success('Đã cập nhật logo và tên thương hiệu thành công!');
      closeBrandModal();
    } catch (err: any) {
      let msg = err.response?.data?.message || err.message || 'Không thể lưu thông tin thương hiệu';
      if (err.response?.status === 502) {
        msg = 'Máy chủ backend đang khởi động lại hoặc không phản hồi (Mã 502). Vui lòng nhấn "Lưu thay đổi" lại sau vài giây.';
      }
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Cấu hình thương hiệu & Logo</h2>
              <p className="text-xs text-gray-500 mt-0.5">Tùy biến tên thương hiệu, câu khẩu hiệu và biểu trưng trên hệ thống</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeBrandModal}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Brand Name Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Tên thương hiệu <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="VD: Smart Canteen HQ, Canteen FPT Cần Thơ..."
              maxLength={100}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
              required
            />
            <p className="text-[11px] text-gray-400 mt-1">Tên này sẽ hiển thị ở đầu thanh điều hướng, tiêu đề trang và hóa đơn.</p>
          </div>

          {/* Brand Subtitle Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Khẩu hiệu / Phụ đề thương hiệu
            </label>
            <input
              type="text"
              value={brandSubtitle}
              onChange={(e) => setBrandSubtitle(e.target.value)}
              placeholder="VD: Hệ thống F&B Chuỗi, Dinh dưỡng học đường..."
              maxLength={150}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
            />
          </div>

          {/* Brand Logo Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700">
                Ảnh Logo thương hiệu
              </label>
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveLogoTab('upload')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    activeLogoTab === 'upload'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Upload className="size-3 inline mr-1" />
                  Tải tệp ảnh
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLogoTab('url')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    activeLogoTab === 'url'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <LinkIcon className="size-3 inline mr-1" />
                  Đường dẫn URL
                </button>
              </div>
            </div>

            {activeLogoTab === 'upload' ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Upload className="size-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-primary hover:underline">
                      Nhấn để tải ảnh lên
                    </span>{' '}
                    <span className="text-xs text-gray-500">hoặc kéo thả tệp vào đây</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Hỗ trợ PNG, JPG, SVG, WebP (tối đa 3MB, tỉ lệ vuông 1:1 đẹp nhất)</p>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png hoặc data:image/..."
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
                />
                <p className="text-[11px] text-gray-400 mt-1">Dán liên kết hình ảnh trực tiếp (HTTPS) hoặc Data URL.</p>
              </div>
            )}

            {/* Logo Clear / Reset action if logo exists */}
            {logoUrl && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="size-3" /> Đã chọn ảnh logo mới
                </span>
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline cursor-pointer"
                >
                  Xóa logo (Dùng icon mặc định)
                </button>
              </div>
            )}
          </div>

          {/* Live Preview Box */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">
                Xem trước thực tế trên Sidebar
              </span>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
                title="Khôi phục lại giá trị mặc định của hệ thống"
              >
                <RotateCcw className="size-3" />
                Khôi phục mặc định
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-xs">
              <div className="h-14 flex items-center justify-between px-3 rounded-lg border border-gray-100 bg-gray-50/60">
                <div className="flex items-center gap-3 min-w-0">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Brand Logo Preview"
                      className="size-8.5 rounded-lg object-contain bg-white border border-gray-200 p-0.5 shrink-0 shadow-xs"
                      onError={() => {
                        setErrorMessage('Không thể tải trước ảnh logo từ liên kết đã nhập.');
                      }}
                    />
                  ) : (
                    <div className="size-8.5 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                      <ChefHat className="size-4.5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-gray-900 text-sm tracking-tight block truncate">
                      {brandName || DEFAULT_BRAND.brandName}
                    </span>
                    <span className="text-[11px] text-gray-500 block truncate font-normal">
                      {brandSubtitle || DEFAULT_BRAND.brandSubtitle}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                  Live
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeBrandModal}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  Lưu thay đổi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
