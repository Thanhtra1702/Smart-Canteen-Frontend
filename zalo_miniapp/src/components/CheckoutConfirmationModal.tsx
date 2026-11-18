import React, { useState } from 'react';
import {
  XIcon as X,
  MapPinIcon as MapPin,
  CalendarBlankIcon as Calendar,
  ClockIcon as Clock,
  UserIcon as User,
  ForkKnifeIcon as Utensils,
  SparkleIcon as Sparkles,
  CreditCardIcon as CreditCard,
  QrCodeIcon as QrCode,
  ShieldCheckIcon as ShieldCheck,
  WarningCircleIcon as AlertCircle,
  ArrowRightIcon as ArrowRight,
  CheckIcon as Check,
} from '@phosphor-icons/react';
import { DishImage } from './DishImage';

const formatVND = (num: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

export type CheckoutPaymentMethod = 'PASS' | 'WALLET' | 'VIETQR' | 'MOMO';

interface CheckoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  canteen: any;
  mealSlot: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  orderDate: string;
  todayStr: string;
  tomorrowStr: string;
  orderQuantity: number;
  selectedDishes: any[];
  wallet: any;
  user: any;
  unitPrice: number;
  isBreakfast: boolean;
  hasActivePass: boolean;
  remainingMeals: number;
  isSubmitting: boolean;
  onConfirmCheckout: (method: CheckoutPaymentMethod, note: string) => Promise<any>;
}

export const CheckoutConfirmationModal: React.FC<CheckoutConfirmationModalProps> = ({
  isOpen,
  onClose,
  canteen,
  mealSlot,
  orderDate,
  todayStr,
  tomorrowStr,
  orderQuantity,
  selectedDishes,
  wallet,
  user,
  unitPrice,
  isBreakfast,
  hasActivePass,
  remainingMeals,
  isSubmitting,
  onConfirmCheckout,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<CheckoutPaymentMethod>(() => {
    return hasActivePass && remainingMeals > 0 ? 'PASS' : 'WALLET';
  });
  const [orderNote, setOrderNote] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // VietQR post-checkout dialog state
  const [createdOrderData, setCreatedOrderData] = useState<any | null>(null);

  if (!isOpen) return null;

  const totalOriginalAmount = unitPrice * orderQuantity;
  const isPassSelected = selectedMethod === 'PASS';
  const finalPayAmount = isPassSelected ? 0 : totalOriginalAmount;
  const walletBalance = Number(wallet?.balance ?? 0);
  const isWalletInsufficient = selectedMethod === 'WALLET' && walletBalance < totalOriginalAmount;

  const mealSlotName =
    mealSlot === 'BREAKFAST' ? 'Bữa Sáng' : mealSlot === 'LUNCH' ? 'Bữa Trưa' : 'Bữa Chiều';
  const mealSlotTime =
    mealSlot === 'BREAKFAST'
      ? '06:30 - 08:30'
      : mealSlot === 'LUNCH'
      ? '11:00 - 13:00'
      : '17:00 - 19:00';

  const dateLabel =
    orderDate === todayStr
      ? `Hôm nay (${new Date(`${todayStr}T00:00:00+07:00`).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })})`
      : orderDate === tomorrowStr
      ? `Ngày mai (${new Date(`${tomorrowStr}T00:00:00+07:00`).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })})`
      : orderDate;

  const handleConfirm = async () => {
    setValidationError(null);

    if (selectedMethod === 'PASS' && (!hasActivePass || remainingMeals <= 0)) {
      setValidationError('Bạn không có vé tháng còn hiệu lực hoặc đã hết lượt ăn.');
      return;
    }

    if (isWalletInsufficient) {
      setValidationError(
        `Số dư ví Canteen không đủ (${formatVND(walletBalance)}). Vui lòng chọn phương thức VietQR hoặc nạp thêm ví.`
      );
      return;
    }

    try {
      const res = await onConfirmCheckout(selectedMethod, orderNote);
      if (selectedMethod === 'VIETQR' && res?.vietqrUrl) {
        setCreatedOrderData(res);
      }
    } catch (err: any) {
      setValidationError(err?.message || 'Có lỗi khi đặt suất, vui lòng thử lại.');
    }
  };

  // If VietQR is created and waiting payment
  if (createdOrderData?.vietqrUrl) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl p-5 space-y-4 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Quét Mã VietQR Thanh Toán</h4>
                <p className="text-[11px] text-slate-500">Mã đơn: #{createdOrderData.orderCode}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center space-y-2">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 inline-block">
              <img
                src={createdOrderData.vietqrUrl}
                alt="VietQR"
                className="w-52 h-52 mx-auto object-contain rounded-xl"
              />
            </div>
            <div className="text-xs font-bold text-slate-900">
              Số tiền: <span className="text-[#0057b8] text-sm">{formatVND(createdOrderData.totalAmount)}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Mở ứng dụng ngân hàng bất kỳ để quét mã và hoàn tất thanh toán.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-[#0057b8] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#004593] transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Tôi đã thanh toán • Đi đến mã nhận món</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[65] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-base font-black text-[#131B2E]">Xác Nhận Đơn Hàng</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 touch-pan-y modal-scrollable">
          {validationError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Section 1: Canteen & Thời Gian Nhận (Minimalist) */}
          <div className="bg-slate-50/90 rounded-2xl px-3.5 py-3 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <MapPin className="w-4 h-4 text-[#0057b8] shrink-0" />
              <span className="truncate">{canteen?.name || 'Canteen Cơ Sở'}</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <strong className="text-slate-800">{dateLabel}</strong>
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <strong className="text-slate-800">{mealSlotName}</strong>
                <span className="text-slate-500">({mealSlotTime})</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-1.5 border-t border-slate-200/70">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                <strong className="text-slate-800">{user?.fullName || 'Nguyễn Văn An'}</strong>
                {user?.studentCode ? ` • ${user.studentCode}` : ''}
              </span>
            </div>
          </div>

          {/* Section 2: Thông Tin Món Ăn Đã Chọn (Minimalist + Thumbnails) */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Utensils className="w-4 h-4 text-[#0057b8] shrink-0" />
                <h4 className="text-xs font-bold text-slate-900 whitespace-nowrap">
                  Món đã chọn ({orderQuantity} suất)
                </h4>
              </div>
              <span className="text-[10.5px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg whitespace-nowrap shrink-0">
                {isBreakfast ? 'Điểm tâm' : 'Combo chuẩn'}
              </span>
            </div>

            {/* List of chosen dishes with thumbnails */}
            <div className="divide-y divide-slate-100">
              {selectedDishes.map((dish, idx) => (
                <div key={dish.id || idx} className="flex items-center justify-between gap-2.5 py-2 first:pt-1 last:pb-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <DishImage
                      src={dish.image}
                      alt={dish.name}
                      className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/70 shrink-0"
                    />
                    <span className="text-xs font-semibold text-slate-800 truncate">{dish.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 shrink-0">x{orderQuantity}</span>
                </div>
              ))}
            </div>

            {/* Compact Free Refill Strip */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-[11px] font-medium text-emerald-700">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" weight="bold" />
              <span className="truncate">Kèm cơm &amp; canh nóng miễn phí tại quầy</span>
            </div>
          </div>

          {/* Section 3: Phương Thức Thanh Toán (Minimalist) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
              Phương Thức Thanh Toán
            </label>

            <div className="space-y-1.5">
              {/* Option 1: Vé tháng bán trú */}
              {hasActivePass && (
                <button
                  type="button"
                  onClick={() => setSelectedMethod('PASS')}
                  className={`w-full px-3 py-2.5 rounded-xl border transition cursor-pointer flex items-center gap-2.5 text-left ${
                    selectedMethod === 'PASS'
                      ? 'border-[#0057b8] bg-[#EFF6FF] ring-1 ring-[#0057b8]/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="w-6 h-6 rounded-lg bg-[#0057b8] text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5" weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      Vé Tháng <span className="font-medium text-slate-500">({remainingMeals} suất)</span>
                    </span>
                    <span className="text-xs font-bold text-slate-900 shrink-0">0đ</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
                      selectedMethod === 'PASS'
                        ? 'border-[#0057b8] bg-[#0057b8]'
                        : 'border-slate-300'
                    }`}
                  >
                    {selectedMethod === 'PASS' && <Check className="w-2.5 h-2.5 text-white" weight="bold" />}
                  </div>
                </button>
              )}

              {/* Option 2: Số dư Ví Canteen */}
              <button
                type="button"
                onClick={() => setSelectedMethod('WALLET')}
                className={`w-full px-3 py-2.5 rounded-xl border transition cursor-pointer flex items-center gap-2.5 text-left ${
                  selectedMethod === 'WALLET'
                    ? 'border-[#0057b8] bg-[#EFF6FF] ring-1 ring-[#0057b8]/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 truncate">Ví Canteen</span>
                  <span
                    className={`text-xs font-bold shrink-0 tabular-nums ${
                      isWalletInsufficient ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {formatVND(walletBalance)}
                  </span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
                    selectedMethod === 'WALLET'
                      ? 'border-[#0057b8] bg-[#0057b8]'
                      : 'border-slate-300'
                  }`}
                >
                  {selectedMethod === 'WALLET' && <Check className="w-2.5 h-2.5 text-white" weight="bold" />}
                </div>
              </button>

              {/* Option 3: Chuyển khoản VietQR */}
              <button
                type="button"
                onClick={() => setSelectedMethod('VIETQR')}
                className={`w-full px-3 py-2.5 rounded-xl border transition cursor-pointer flex items-center gap-2.5 text-left ${
                  selectedMethod === 'VIETQR'
                    ? 'border-[#0057b8] bg-[#EFF6FF] ring-1 ring-[#0057b8]/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 truncate">VietQR Ngân Hàng</span>
                  <span className="text-[11px] font-semibold text-amber-700 shrink-0">Quét QR</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
                    selectedMethod === 'VIETQR'
                      ? 'border-[#0057b8] bg-[#0057b8]'
                      : 'border-slate-300'
                  }`}
                >
                  {selectedMethod === 'VIETQR' && <Check className="w-2.5 h-2.5 text-white" weight="bold" />}
                </div>
              </button>
            </div>
          </div>

          {/* Section 4: Ghi Chú Đơn Hàng */}
          <div>
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wide block mb-1.5">
              Ghi chú cho Canteen (Tùy chọn)
            </label>
            <input
              type="text"
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="VD: Lấy ít cơm, không chan nước béo, mang hộp..."
              maxLength={120}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#0057b8] focus:bg-white transition"
            />
          </div>

          {/* Section 5: Bảng Hóa Đơn Tóm Tắt */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Đơn giá suất ăn:</span>
              <span>{formatVND(unitPrice)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Số lượng suất:</span>
              <span>x{orderQuantity}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tạm tính:</span>
              <span className="font-semibold text-slate-800">{formatVND(totalOriginalAmount)}</span>
            </div>
            {isPassSelected && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Khấu trừ Vé Tháng:</span>
                <span>-{formatVND(totalOriginalAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Phí dịch vụ:</span>
              <span className="text-emerald-600 font-semibold">0 đ</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
              <span className="font-bold text-slate-900 text-xs">Tổng thanh toán:</span>
              <div className="text-right">
                <span className="font-black text-sm text-slate-900">
                  {formatVND(finalPayAmount)}
                </span>
                {isPassSelected && (
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    (Trừ 1 lượt vé tháng)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer Action */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[10px] text-slate-500 block leading-tight">Cần thanh toán:</span>
            <span className="text-base font-black text-slate-900">
              {formatVND(finalPayAmount)}
            </span>
          </div>

          <button
            type="button"
            disabled={isSubmitting || isWalletInsufficient}
            onClick={handleConfirm}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md active:scale-98 cursor-pointer ${
              isWalletInsufficient
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-[#0057b8] text-white hover:bg-[#004593] shadow-[#0057b8]/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang xử lý đặt đơn...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {isPassSelected
                    ? 'Xác nhận dùng vé tháng (0đ)'
                    : `Xác nhận & Thanh toán (${formatVND(finalPayAmount)})`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
