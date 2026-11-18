import React, { useState } from 'react';
import { useApp, checkIsCutoffPassed } from '../context/AppContext';
import { api } from '../services/api';
import type { TabKey } from '../components/BottomNavigation';
import {
  ShoppingBagIcon as ShoppingBag,
  TrashIcon as Trash2,
  ArrowLeftIcon as ArrowLeft,
  CheckCircleIcon as CheckCircle2,
  WarningCircleIcon as AlertCircle,
  CalendarBlankIcon as Calendar,
  MapPinIcon as MapPin,
  SparkleIcon as Sparkles,
} from '@phosphor-icons/react';

interface CartPageProps {
  onNavigateTab: (tab: TabKey) => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onNavigateTab }) => {
  const {
    cart,
    removeFromCart,
    clearCart,
    surchargeTotal,
    standardPrice,
    selectedCanteen,
    selectedMealType,
    selectedDate,
    wallet,
    refreshUserData,
    refreshOrders,
    maxDishes,
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const effectiveMaxDishes = maxDishes || 3;

  const mealLabels: Record<string, string> = {
    BREAKFAST: 'Bữa Sáng',
    LUNCH: 'Bữa Trưa',
    DINNER: 'Bữa Tối',
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!selectedCanteen?.id) {
      setErrorMsg('Vui lòng chọn cơ sở căn tin');
      return;
    }

    if (cart.length > effectiveMaxDishes) {
      setErrorMsg(`Mỗi suất ăn tại cơ sở này chỉ cho phép chọn tối đa ${effectiveMaxDishes} món.`);
      return;
    }

    const { isPassed: isCutoff, cutoffTimeStr } = checkIsCutoffPassed(
      selectedDate,
      selectedMealType,
      selectedCanteen
    );
    if (isCutoff) {
      setErrorMsg(`Đã quá thời hạn chốt đặt trước (${cutoffTimeStr}) cho ca ăn này theo quy tắc BR-01 & BR-02.`);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const remainingMealsCount = wallet?.remainingMeals || 0;
      const remainingBreakfastCount = wallet?.remainingBreakfastMeals || 0;
      const isPassCovered = selectedMealType === 'BREAKFAST' ? remainingBreakfastCount > 0 : remainingMealsCount > 0;

      const payload = {
        canteenId: selectedCanteen.id,
        mealType: selectedMealType,
        orderDate: selectedDate,
        paymentMethod: isPassCovered ? 'PASS' : 'WALLET',
        sets: [
          {
            quantity: 1,
            items: cart.map((item) => ({
              dishId: item.id,
              quantity: item.quantity,
            })),
          },
        ],
      };

      const res = await api.post('/orders', payload);
      const createdOrderId = res.data?.order?.id || res.data?.orders?.[0]?.id || (Array.isArray(res.data) ? res.data[0]?.id : undefined);
      if (createdOrderId) {
        try {
          localStorage.setItem('canteen_last_created_order_id', createdOrderId);
        } catch {}
      }
      await refreshUserData();
      await refreshOrders();

      const successNotice = res.data?.message || 'Đặt món & thanh toán thành công! Bạn có thể chỉnh sửa trước giờ chốt món.';
      setSuccessMsg(successNotice);
      clearCart();

      setTimeout(() => {
        onNavigateTab('qr');
      }, 1200);
    } catch (err: any) {
      console.error('Checkout error:', err);
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const remainingMeals = wallet?.remainingMeals || 0;
  const remainingBreakfast = wallet?.remainingBreakfastMeals || 0;
  const balance = Number(wallet?.balance || 0);
  const basePrice = standardPrice || 30000;
  const isCoveredByPackage =
    selectedMealType === 'BREAKFAST' ? remainingBreakfast > 0 : remainingMeals > 0;
  const currentCoverageCredits =
    selectedMealType === 'BREAKFAST' ? remainingBreakfast : remainingMeals;
  const totalDue = isCoveredByPackage ? surchargeTotal : basePrice + surchargeTotal;

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigateTab('menu')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Tiếp tục chọn món
        </button>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Làm trống
          </button>
        )}
      </div>

      {/* Target Info Badge */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-sm space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-sky-300 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            {mealLabels[selectedMealType] || 'Suất Ăn'}
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(selectedDate).toLocaleDateString('vi-VN', {
              weekday: 'short',
              day: '2-digit',
              month: '2-digit',
            })}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-300 truncate">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span>{selectedCanteen?.name || 'Căn tin Trường'}</span>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-[#EFF6FF] border border-[#B9E0FE] rounded-xl flex items-center gap-2 text-xs text-[#003E82] font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0057b8]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Cart Content */}
      {cart.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Khay cơm chưa có món</h3>
            <p className="text-xs text-slate-500 mt-1">
              Hãy quay lại thực đơn để chọn món mặn, rau và canh cho bữa ăn của bạn nhé.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('menu')}
            className="w-full py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition"
          >
            Xem thực đơn hôm nay
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Dish List */}
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Chọn tối đa {effectiveMaxDishes} món cho suất ăn (Đã chọn: {cart.length}/{effectiveMaxDishes})</span>
              <span className="text-[11px] text-slate-500">Tối đa {effectiveMaxDishes} món/suất</span>
            </div>
            {cart.map((item) => (
              <div key={item.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.category === 'MAIN' || item.category === 'SIDE' || item.category === 'FOOD' ? 'Món ăn' : item.category}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                  </div>
                  {item.extraPrice > 0 && (
                    <p className="text-[11px] text-[#003E82] font-medium mt-0.5">
                      +{(item.extraPrice * item.quantity).toLocaleString('vi-VN')} đ (phụ thu món)
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600">x{item.quantity}</span>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                    title="Bỏ món"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Payment & Deduction Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm text-xs">
            <h4 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">
              Phương thức thanh toán & trừ gói
            </h4>

            {isCoveredByPackage ? (
              <div className="p-2.5 bg-[#EFF6FF] border border-[#B9E0FE] rounded-xl flex items-center justify-between text-[#003E82]">
                <div className="space-y-0.5">
                  <p className="font-bold text-xs">Trừ 1 suất vào Gói cơm tháng</p>
                  <p className="text-[11px] text-[#003E82]/80">
                    Số suất còn lại sau bữa này: {currentCoverageCredits - 1} suất
                  </p>
                </div>
                <span className="font-bold text-[#003E82] bg-white px-2 py-1 rounded-lg border border-[#B9E0FE] text-[11px]">
                  0 đ tiêu chuẩn
                </span>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-slate-800">
                <div className="space-y-0.5">
                  <p className="font-bold text-xs">Trừ trực tiếp số dư ví điện tử</p>
                  <p className="text-[11px] text-slate-500">
                    Số dư hiện có: {Number(balance).toLocaleString('vi-VN')} đ
                  </p>
                </div>
                <span className="font-bold text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-200 text-[11px]">
                  {basePrice.toLocaleString('vi-VN')} đ
                </span>
              </div>
            )}

            {surchargeTotal > 0 && (
              <div className="flex items-center justify-between text-slate-600 pt-1">
                <span>Phụ thu món gọi thêm:</span>
                <span className="font-semibold text-slate-900">{surchargeTotal.toLocaleString('vi-VN')} đ</span>
              </div>
            )}

            <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
              <span className="font-bold text-slate-800">Tổng thanh toán:</span>
              <span className="font-extrabold text-sm text-[#0057b8]">
                {totalDue === 0 ? 'Miễn phí (Thuộc gói)' : `${totalDue.toLocaleString('vi-VN')} đ`}
              </span>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Xác nhận đặt suất ăn</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
