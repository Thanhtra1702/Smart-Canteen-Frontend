import React, { useState } from 'react';
import {
  CalendarIcon as Calendar,
  CaretLeftIcon as ChevronLeft,
  CaretRightIcon as ChevronRight,
  XIcon as X,
} from '@phosphor-icons/react';

interface DatePickerButtonProps {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  title?: string;
  allowClear?: boolean;
  className?: string;
}

const formatIsoToDisplay = (iso: string): string => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const toIsoDate = (year: number, monthIndex: number, day: number): string =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** Centered Vietnamese calendar popup matching the Zalo MiniApp date picker style. */
export const DatePickerButton: React.FC<DatePickerButtonProps> = ({
  value,
  onChange,
  placeholder = 'Chọn ngày',
  title = 'Chọn ngày',
  allowClear = false,
  className = '',
}) => {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const [open, setOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>(() => {
    const base = value || todayStr;
    const [y, m] = base.split('-').map(Number);
    return { year: y || new Date().getFullYear(), month: (m || 1) - 1 };
  });

  const openPicker = () => {
    const base = value || todayStr;
    const [y, m] = base.split('-').map(Number);
    setCalendarMonth({ year: y || new Date().getFullYear(), month: (m || 1) - 1 });
    setOpen(true);
  };

  const shiftMonth = (delta: number) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
  const firstDayOffset = (new Date(calendarMonth.year, calendarMonth.month, 1).getDay() + 6) % 7;
  const display = formatIsoToDisplay(value);

  return (
    <>
      <div className={`inline-flex items-center relative ${className}`}>
        <button
          type="button"
          onClick={openPicker}
          className={`w-full h-9 px-3 bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition cursor-pointer shadow-2xs ${
            allowClear && value ? 'pr-8' : ''
          }`}
        >
          <span className={`font-mono tabular-nums truncate ${display ? 'text-slate-900 font-semibold' : 'text-slate-400 font-sans'}`}>
            {display || placeholder}
          </span>
          <Calendar className="size-3.5 text-[#0057b8] shrink-0" />
        </button>

        {allowClear && value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="absolute right-7 p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
            title="Xóa ngày"
            aria-label="Xóa ngày"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {open && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 modal-backdrop animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-xs rounded-2xl border border-slate-200/80 p-4 shadow-modal space-y-3"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900">{title}</h4>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                aria-label="Đóng lịch"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="size-7 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
                  aria-label="Tháng trước"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="text-xs font-bold text-slate-900 px-1.5">
                  Tháng {calendarMonth.month + 1}/{calendarMonth.year}
                </span>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="size-7 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
                  aria-label="Tháng sau"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onChange(todayStr);
                  setOpen(false);
                }}
                className="text-[11px] font-bold text-[#0057b8] hover:underline cursor-pointer px-1.5 py-0.5"
              >
                Hôm nay
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                <span key={d} className="py-0.5">
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <span key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, idx) => {
                const day = idx + 1;
                const iso = toIsoDate(calendarMonth.year, calendarMonth.month, day);
                const isSelected = iso === value;
                const isToday = iso === todayStr;

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                    className={`h-8 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#0057b8] text-white shadow-2xs'
                        : isToday
                        ? 'bg-[#EFF6FF] text-[#0057b8] border border-blue-200'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
