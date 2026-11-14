import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Settings,
  Clock,
  Sun,
  Utensils,
  Moon,
  ShieldCheck,
  Lock,
  Building2,
  AlertCircle,
  Save,
  CheckCircle2,
  Percent,
  CreditCard,
  Mail,
  Sliders,
} from 'lucide-react';

interface CanteenConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CanteenConfigModal: React.FC<CanteenConfigModalProps> = ({ isOpen, onClose }) => {
  const { selectedCanteen, hasPermission, updateCanteenConfig } = useApp();

  const canEdit = hasPermission('CANTEEN_CONFIG');

  // Form State
  const [cutoffBreakfast, setCutoffBreakfast] = useState('07:00');
  const [cutoffLunch, setCutoffLunch] = useState('10:30');
  const [cutoffDinner, setCutoffDinner] = useState('16:00');
  const [maxDishes, setMaxDishes] = useState<number>(3);
  const [standardMealPrice, setStandardMealPrice] = useState<number>(30000);
  const [bufferMarginPercent, setBufferMarginPercent] = useState<number>(10);

  // Banking & Notification state
  const [bankBin, setBankBin] = useState('VietinBank');
  const [bankAccountNumber, setBankAccountNumber] = useState('110022334455');
  const [bankAccountName, setBankAccountName] = useState('CANTEEN TRƯỜNG FPT CS1');
  const [notificationEmail, setNotificationEmail] = useState('canteen.cs1@smartcanteen.vn');

  // Submit / Feedback state
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Populate initial values from selectedCanteen
  useEffect(() => {
    if (selectedCanteen) {
      setCutoffBreakfast(selectedCanteen.cutoffBreakfast || '07:00');
      setCutoffLunch(selectedCanteen.cutoffLunch || '10:30');
      setCutoffDinner(selectedCanteen.cutoffDinner || '16:00');
      setMaxDishes(Number(selectedCanteen.maxDishes || selectedCanteen.mealPrices?.[0]?.maxDishes || 3));
      setStandardMealPrice(Number(selectedCanteen.standardMealPrice || selectedCanteen.mealPrices?.[0]?.price || 30000));
      setBufferMarginPercent(Number(selectedCanteen.bufferMarginPercent || 10));
      setBankBin(selectedCanteen.bankBin || 'VietinBank');
      setBankAccountNumber(selectedCanteen.bankAccountNumber || '110022334455');
      setBankAccountName(selectedCanteen.bankAccountName || 'CANTEEN TRƯỜNG FPT CS1');
      setNotificationEmail(selectedCanteen.notificationEmail || 'canteen.cs1@smartcanteen.vn');
    }
  }, [selectedCanteen, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setFeedbackMsg({
        type: 'error',
        text: 'Bạn không có quyền Cấu hình cơ sở & Ca ăn (CANTEEN_CONFIG). Chức năng này đã bị khóa!',
      });
      return;
    }

    try {
      setIsSaving(true);
      setFeedbackMsg(null);
      const res = await updateCanteenConfig({
        cutoffBreakfast,
        cutoffLunch,
        cutoffDinner,
        maxDishes: Number(maxDishes),
        standardMealPrice: Number(standardMealPrice),
        bufferMarginPercent: Number(bufferMarginPercent),
        bankBin,
        bankAccountNumber,
        bankAccountName,
        notificationEmail,
      });

      if (res.success) {
        setFeedbackMsg({ type: 'success', text: res.message });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedbackMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Lỗi khi lưu cấu hình cơ sở.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] text-[#003E82] flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#131B2E]">Cấu hình Cơ sở & Ca ăn</h3>
              <p className="text-xs text-slate-500 font-medium">
                {selectedCanteen?.name || 'THPT FPT Quy Nhơn • Cơ sở 1'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Permission Status Pill */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2">
              {canEdit ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <Lock className="w-4 h-4 text-amber-500" />
              )}
              <span className="font-bold text-[#131B2E]">
                Quyền hạn: {canEdit ? 'Được phép cấu hình' : 'Bị khóa (Chỉ xem)'}
              </span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                canEdit
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              CANTEEN_CONFIG
            </span>
          </div>

          {/* Locked Notice if not permitted */}
          {!canEdit && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Tính năng cấu hình bị khóa</p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Tài khoản của bạn chưa được Quản trị viên cấp cao (Web Admin) cấp quyền{' '}
                  <strong className="font-bold">Cấu hình cơ sở & Ca ăn (CANTEEN_CONFIG)</strong>. Bạn chỉ có thể xem
                  thông số hiện tại mà không thể thay đổi.
                </p>
              </div>
            </div>
          )}

          {/* Feedback alert */}
          {feedbackMsg && (
            <div
              className={`p-3 rounded-2xl border text-xs font-medium flex items-center gap-2 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          <form id="canteenConfigForm" onSubmit={handleSubmit} className="space-y-5">
            {/* 1. SECTION: GIỜ CHỐT ĐƠN (CUT-OFF TIMES) */}
            <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Clock className="w-4 h-4 text-[#003E82]" />
                <h4 className="font-bold text-[#131B2E] text-xs uppercase tracking-wider">
                  Giờ chốt đóng đơn ca ăn (Cut-off times)
                </h4>
              </div>
              <p className="text-[11px] text-slate-500">
                Sau thời điểm chốt đơn, học sinh và phụ huynh không thể đặt hoặc hủy suất ăn của ca đó.
              </p>

              <div className="space-y-3 pt-1">
                {/* Ca Sáng */}
                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/70 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[#131B2E]">Ca Sáng (06:30 – 08:30)</p>
                      <p className="text-[10.5px] text-slate-500">Giờ chốt nhận đơn trước ca</p>
                    </div>
                  </div>
                  <input
                    type="time"
                    value={cutoffBreakfast}
                    onChange={(e) => setCutoffBreakfast(e.target.value)}
                    disabled={!canEdit || isSaving}
                    className="w-24 h-8 px-2 bg-white border border-slate-200 rounded-lg text-center font-mono font-bold text-xs text-[#131B2E] focus:outline-none focus:border-[#003E82] disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                {/* Ca Trưa */}
                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/70 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Utensils className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[#131B2E]">Ca Trưa (11:00 – 13:00)</p>
                      <p className="text-[10.5px] text-slate-500">Giờ chốt nhận đơn trước ca</p>
                    </div>
                  </div>
                  <input
                    type="time"
                    value={cutoffLunch}
                    onChange={(e) => setCutoffLunch(e.target.value)}
                    disabled={!canEdit || isSaving}
                    className="w-24 h-8 px-2 bg-white border border-slate-200 rounded-lg text-center font-mono font-bold text-xs text-[#131B2E] focus:outline-none focus:border-[#003E82] disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                {/* Ca Tối */}
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/70 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[#131B2E]">Ca Tối (17:00 – 19:00)</p>
                      <p className="text-[10.5px] text-slate-500">Giờ chốt nhận đơn trước ca</p>
                    </div>
                  </div>
                  <input
                    type="time"
                    value={cutoffDinner}
                    onChange={(e) => setCutoffDinner(e.target.value)}
                    disabled={!canEdit || isSaving}
                    className="w-24 h-8 px-2 bg-white border border-slate-200 rounded-lg text-center font-mono font-bold text-xs text-[#131B2E] focus:outline-none focus:border-[#003E82] disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. SECTION: ĐỊNH MỨC SUẤT ĂN & DỰ PHÒNG */}
            <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Sliders className="w-4 h-4 text-[#003E82]" />
                <h4 className="font-bold text-[#131B2E] text-xs uppercase tracking-wider">
                  Quy chuẩn suất ăn cơ sở
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Số món tối đa */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <label className="font-bold text-[#131B2E] block">Số món tối đa / suất (maxDishes)</label>
                  <div className="flex items-center gap-2">
                    {[3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => canEdit && setMaxDishes(num)}
                        disabled={!canEdit || isSaving}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-xs border transition cursor-pointer ${
                          maxDishes === num
                            ? 'bg-[#003E82] text-white border-[#003E82]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {num} món
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">Giới hạn số món trong 1 suất ăn bán trú</p>
                </div>

                {/* Tỷ lệ suất đệm */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <label className="font-bold text-[#131B2E] block">Tỷ lệ suất đệm dự phòng (Buffer %)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={bufferMarginPercent}
                      onChange={(e) => setBufferMarginPercent(Number(e.target.value))}
                      disabled={!canEdit || isSaving}
                      className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-xs text-[#131B2E] focus:outline-none focus:border-[#003E82] disabled:bg-slate-100"
                    />
                    <span className="font-bold text-slate-600">%</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Bếp nấu tăng thêm % dự phòng phát sinh</p>
                </div>
              </div>

              {/* Giá suất tiêu chuẩn */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <label className="font-bold text-[#131B2E] block">Đơn giá suất ăn tiêu chuẩn</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={1000}
                    value={standardMealPrice}
                    onChange={(e) => setStandardMealPrice(Number(e.target.value))}
                    disabled={!canEdit || isSaving}
                    className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-xs text-[#131B2E] focus:outline-none focus:border-[#003E82] disabled:bg-slate-100"
                  />
                  <span className="font-bold text-slate-600">VNĐ</span>
                </div>
                <p className="text-[10px] text-slate-500">Giá cơ sở áp dụng khi học sinh/phụ huynh đặt suất lẻ</p>
              </div>
            </div>

            {/* 3. SECTION: TÀI KHOẢN ĐỐI SOÁT & THÔNG BÁO */}
            <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <CreditCard className="w-4 h-4 text-[#003E82]" />
                <h4 className="font-bold text-[#131B2E] text-xs uppercase tracking-wider">
                  Tài khoản đối soát & Thông báo
                </h4>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="font-bold text-[#131B2E] block mb-1">Ngân hàng thụ hưởng</label>
                  <input
                    type="text"
                    value={bankBin}
                    onChange={(e) => setBankBin(e.target.value)}
                    disabled={!canEdit || isSaving}
                    className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-[#131B2E] focus:outline-none focus:border-[#003E82] disabled:bg-slate-100"
                    placeholder="Ví dụ: VietinBank, Vietcombank..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-[#131B2E] block mb-1">Số tài khoản đối soát</label>
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      disabled={!canEdit || isSaving}
                      className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-[#131B2E] focus:outline-none focus:border-[#003E82] disabled:bg-slate-100"
                      placeholder="Số tài khoản nhận tiền"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#131B2E] block mb-1">Tên chủ tài khoản</label>
                    <input
                      type="text"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      disabled={!canEdit || isSaving}
                      className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg uppercase text-xs text-[#131B2E] focus:outline-none focus:border-[#003E82] disabled:bg-slate-100"
                      placeholder="Tên đơn vị thụ hưởng"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#131B2E] block mb-1">Email nhận báo cáo cơ sở</label>
                  <input
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    disabled={!canEdit || isSaving}
                    className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-[#131B2E] focus:outline-none focus:border-[#003E82] disabled:bg-slate-100"
                    placeholder="canteen@smartcanteen.vn"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700 transition cursor-pointer"
          >
            Đóng
          </button>

          {canEdit ? (
            <button
              type="submit"
              form="canteenConfigForm"
              disabled={isSaving}
              className="py-2.5 px-5 rounded-xl bg-[#003E82] hover:bg-[#004b8c] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu cấu hình</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="py-2.5 px-5 rounded-xl bg-slate-200 text-slate-500 font-bold text-xs flex items-center gap-1.5 cursor-not-allowed"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Bị khóa (Chưa phân quyền)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

