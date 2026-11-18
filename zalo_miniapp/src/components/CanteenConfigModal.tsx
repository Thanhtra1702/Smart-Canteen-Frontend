import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useModalScrollLock } from '../hooks/useModalScrollLock';
import {
  XIcon as X,
  SunIcon as Sun,
  ForkKnifeIcon as Utensils,
  MoonIcon as Moon,
  LockIcon as Lock,
  WarningCircleIcon as AlertCircle,
  CheckCircleIcon as CheckCircle2,
  ClockIcon as Clock,
} from '@phosphor-icons/react';

interface CanteenConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CanteenConfigModal: React.FC<CanteenConfigModalProps> = ({ isOpen, onClose }) => {
  const { selectedCanteen, hasPermission, updateCanteenConfig } = useApp();
  useModalScrollLock(isOpen);

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
  const [editingTimeSlot, setEditingTimeSlot] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | null>(null);
  const [tempHour, setTempHour] = useState('07');
  const [tempMinute, setTempMinute] = useState('00');

  const openTimePicker = (slot: 'BREAKFAST' | 'LUNCH' | 'DINNER', val: string) => {
    if (!canEdit || isSaving) return;
    const [h = '07', m = '00'] = (val || '07:00').split(':');
    setTempHour(String(Math.min(23, Math.max(0, parseInt(h, 10) || 0))).padStart(2, '0'));
    setTempMinute(String(Math.min(59, Math.max(0, parseInt(m, 10) || 0))).padStart(2, '0'));
    setEditingTimeSlot(slot);
  };

  const confirmTimePicker = () => {
    const formatted = `${tempHour}:${tempMinute}`;
    if (editingTimeSlot === 'BREAKFAST') setCutoffBreakfast(formatted);
    else if (editingTimeSlot === 'LUNCH') setCutoffLunch(formatted);
    else if (editingTimeSlot === 'DINNER') setCutoffDinner(formatted);
    setEditingTimeSlot(null);
  };
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
      const safeMaxDishes = Math.max(1, Number(maxDishes) || 3);
      const res = await updateCanteenConfig({
        cutoffBreakfast,
        cutoffLunch,
        cutoffDinner,
        maxDishes: safeMaxDishes,
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
    <>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSaving) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        role="dialog"
        aria-modal="true"
      >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150"
      >
        {/* Header (tối giản) */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-white shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">Cấu hình cơ sở &amp; Ca ăn</h3>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {selectedCanteen?.name || 'THPT FPT Quy Nhơn • Cơ sở 1'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs modal-scrollable touch-pan-y">
          {/* Locked Notice only when not permitted */}
          {!canEdit && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2 text-[11.5px]">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Chế độ chỉ xem (chưa được cấp quyền chỉnh sửa cấu hình).</span>
            </div>
          )}

          {/* Feedback alert */}
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
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

          <form id="canteenConfigForm" onSubmit={handleSubmit} className="space-y-3.5">
            {/* 1. GIỜ CHỐT ĐƠN (1 khung trắng chia dòng gọn, không bị cắt AM/PM) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs">Giờ chốt nhận đơn</h4>
                <span className="text-[10.5px] text-slate-400">Trước giờ phục vụ</span>
              </div>

              <div className="divide-y divide-slate-100 px-3.5">
                {[
                  {
                    key: 'BREAKFAST' as const,
                    label: 'Ca Sáng',
                    range: '06:30–08:30',
                    value: cutoffBreakfast,
                    iconCls: 'bg-amber-50 text-amber-600',
                    Icon: Sun,
                  },
                  {
                    key: 'LUNCH' as const,
                    label: 'Ca Trưa',
                    range: '11:00–13:00',
                    value: cutoffLunch,
                    iconCls: 'bg-emerald-50 text-emerald-600',
                    Icon: Utensils,
                  },
                  {
                    key: 'DINNER' as const,
                    label: 'Ca Tối',
                    range: '17:00–19:00',
                    value: cutoffDinner,
                    iconCls: 'bg-indigo-50 text-indigo-600',
                    Icon: Moon,
                  },
                ].map(({ key, label, range, value, iconCls, Icon }) => (
                  <div key={key} className="py-2.5 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl ${iconCls} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{label}</p>
                        <p className="text-[10.5px] text-slate-400 font-mono">{range}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openTimePicker(key, value)}
                      disabled={!canEdit || isSaving}
                      className="min-w-[92px] h-8.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between gap-2 font-mono font-bold text-xs text-slate-900 transition cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed shrink-0"
                    >
                      <span className="tabular-nums">{value}</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. QUY CHUẨN SUẤT ĂN */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs">Quy chuẩn suất ăn</h4>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  Số món tối đa / suất
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxDishes > 0 ? maxDishes : ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (!raw) {
                      setMaxDishes(0);
                      return;
                    }
                    const parsed = parseInt(raw, 10);
                    if (!Number.isNaN(parsed)) {
                      setMaxDishes(Math.max(1, Math.min(20, parsed)));
                    }
                  }}
                  onBlur={() => {
                    if (!maxDishes || maxDishes < 1) setMaxDishes(3);
                  }}
                  disabled={!canEdit || isSaving}
                  placeholder="Nhập số món (VD: 3)"
                  aria-label="Số món tối đa mỗi suất"
                  className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-[#0057b8] focus:bg-white disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Dự phòng (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={bufferMarginPercent}
                    onChange={(e) => setBufferMarginPercent(Number(e.target.value))}
                    disabled={!canEdit || isSaving}
                    className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-[#0057b8] focus:bg-white disabled:bg-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Giá suất chuẩn (đ)</label>
                  <input
                    type="number"
                    step={1000}
                    value={standardMealPrice}
                    onChange={(e) => setStandardMealPrice(Number(e.target.value))}
                    disabled={!canEdit || isSaving}
                    className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-[#0057b8] focus:bg-white disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* 3. ĐỐI SOÁT & BÁO CÁO */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
              <h4 className="font-bold text-slate-900 text-xs">Đối soát &amp; Báo cáo</h4>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Ngân hàng</label>
                  <input
                    type="text"
                    value={bankBin}
                    onChange={(e) => setBankBin(e.target.value)}
                    disabled={!canEdit || isSaving}
                    className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0057b8] focus:bg-white disabled:bg-slate-100"
                    placeholder="VietinBank..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Số tài khoản</label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    disabled={!canEdit || isSaving}
                    className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:border-[#0057b8] focus:bg-white disabled:bg-slate-100"
                    placeholder="STK nhận tiền"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">Chủ tài khoản</label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  disabled={!canEdit || isSaving}
                  className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl uppercase text-xs text-slate-900 focus:outline-none focus:border-[#0057b8] focus:bg-white disabled:bg-slate-100"
                  placeholder="Tên đơn vị thụ hưởng"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">Email nhận báo cáo</label>
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  disabled={!canEdit || isSaving}
                  className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0057b8] focus:bg-white disabled:bg-slate-100"
                  placeholder="canteen@smartcanteen.vn"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 transition cursor-pointer"
          >
            Đóng
          </button>

          {canEdit && (
            <button
              type="submit"
              form="canteenConfigForm"
              disabled={isSaving}
              className="flex-2 py-2.5 rounded-xl bg-[#0057b8] hover:bg-[#003E82] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu cấu hình</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Centered 24h Time Picker Popup */}
    {editingTimeSlot && (
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) setEditingTimeSlot(null);
        }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-xs rounded-2xl border border-slate-100 p-4 shadow-2xl space-y-3 animate-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-900">
              Giờ chốt{' '}
              {editingTimeSlot === 'BREAKFAST' ? 'Ca Sáng' : editingTimeSlot === 'LUNCH' ? 'Ca Trưa' : 'Ca Tối'}
            </h4>
            <button
              type="button"
              onClick={() => setEditingTimeSlot(null)}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              aria-label="Đóng chọn giờ"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-2xl font-black font-mono text-[#0057b8] tabular-nums tracking-wider">
              {tempHour}:{tempMinute}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <span className="text-[10.5px] font-semibold text-slate-400 block text-center">Giờ</span>
              <div className="h-44 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50/70 p-1 space-y-1 modal-scrollable">
                {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setTempHour(h)}
                    className={`w-full py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      tempHour === h
                        ? 'bg-[#0057b8] text-white shadow-2xs'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10.5px] font-semibold text-slate-400 block text-center">Phút</span>
              <div className="h-44 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50/70 p-1 space-y-1 modal-scrollable">
                {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTempMinute(m)}
                    className={`w-full py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      tempMinute === m
                        ? 'bg-[#0057b8] text-white shadow-2xs'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditingTimeSlot(null)}
              className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={confirmTimePicker}
              className="flex-1 py-2 rounded-xl bg-[#0057b8] hover:bg-[#003E82] text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

