import React, { useState } from 'react';
import { ClockIcon as Clock, XIcon as X } from '@phosphor-icons/react';

interface TimePickerButtonProps {
  value: string;
  onChange: (hhmm: string) => void;
  title?: string;
  className?: string;
}

/** Centered 24-hour time picker popup matching the Zalo MiniApp time selector style. */
export const TimePickerButton: React.FC<TimePickerButtonProps> = ({
  value,
  onChange,
  title = 'Chọn thời gian',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [tempHour, setTempHour] = useState('10');
  const [tempMinute, setTempMinute] = useState('30');

  const openPicker = () => {
    const [h = '10', m = '30'] = (value || '10:30').split(':');
    setTempHour(h.padStart(2, '0'));
    setTempMinute(m.padStart(2, '0'));
    setOpen(true);
  };

  const confirm = () => {
    onChange(`${tempHour}:${tempMinute}`);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className={`h-9 px-3 bg-slate-50 hover:bg-white border border-slate-200/90 rounded-xl font-mono font-bold text-xs text-slate-900 flex items-center justify-between gap-2 transition cursor-pointer shadow-2xs ${className}`}
      >
        <span className="tabular-nums">{value || '--:--'}</span>
        <Clock className="size-3.5 text-[#0057b8] shrink-0" />
      </button>

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
                aria-label="Đóng chọn giờ"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <span className="text-2xl font-bold font-mono text-[#0057b8] tabular-nums tracking-wider">
                {tempHour}:{tempMinute}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <span className="text-[10.5px] font-semibold text-slate-400 block text-center">Giờ</span>
                <div className="h-44 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50/70 p-1 space-y-1">
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
                <div className="h-44 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50/70 p-1 space-y-1">
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
                onClick={() => setOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirm}
                className="flex-1 py-2 rounded-xl bg-[#0057b8] hover:bg-[#004593] text-white font-bold text-xs transition cursor-pointer shadow-xs"
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
