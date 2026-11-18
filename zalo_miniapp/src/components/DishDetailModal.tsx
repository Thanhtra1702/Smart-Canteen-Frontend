import React from 'react';
import {
  XIcon as X,
  CheckIcon as Check,
  SparkleIcon as Sparkles,
  ForkKnifeIcon as Utensils,
  InfoIcon as Info,
} from '@phosphor-icons/react';
import { useModalScrollLock } from '../hooks/useModalScrollLock';
import { DishImage } from './DishImage';

interface DishDetailModalProps {
  dish: any | null;
  isOpen: boolean;
  isSelected?: boolean;
  maxDishes?: number;
  currentSelectedCount?: number;
  readOnly?: boolean;
  onClose: () => void;
  onToggleSelect?: (dish: any) => void;
}

export const DishDetailModal: React.FC<DishDetailModalProps> = ({
  dish,
  isOpen,
  isSelected = false,
  maxDishes = 3,
  currentSelectedCount = 0,
  readOnly = false,
  onClose,
  onToggleSelect,
}) => {
  useModalScrollLock(isOpen);

  if (!isOpen || !dish) return null;

  const canSelectMore = currentSelectedCount < maxDishes || isSelected;

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col overscroll-contain modal-scrollable touch-pan-y"
      >

        {/* Hero Image */}
        <div className="relative h-56 w-full bg-slate-100 shrink-0 overflow-hidden">
          <DishImage
            src={dish.image}
            alt={dish.name}
            className="w-full h-full"
            imgClassName="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-xs hover:bg-black/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {dish.isBestSeller && (
            <span className="absolute bottom-3 left-3 bg-[#0057b8] text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Món ăn yêu thích nhất
            </span>
          )}
        </div>

        {/* Scrollable Content */}
        <div
          className="p-4 overflow-y-auto space-y-4 flex-1 overscroll-contain modal-scrollable touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Title & Tag */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-black text-[#131B2E] leading-snug">
                {dish.name}
              </h3>
              {dish.extraPrice > 0 && (
                <span className="bg-slate-100 text-slate-800 font-bold text-xs px-2 py-0.5 rounded-lg shrink-0">
                  +{formatVND(dish.extraPrice)}
                </span>
              )}
            </div>

            {/* Category Badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {dish.tag && (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Utensils className="w-3 h-3" />
                  {dish.tag}
                </span>
              )}

              <span className="text-[10px] text-slate-500 font-medium">
                Suất ăn tiêu chuẩn học đường
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-700">Mô tả & Chế biến:</h4>
            <p className="text-xs text-slate-600 leading-relaxed bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100">
              {dish.description ||
                dish.desc ||
                'Món ăn được các đầu bếp canteen sơ chế từ nguồn thực phẩm tươi sạch trong ngày, nêm nếm vừa khẩu vị dinh dưỡng học đường.'}
            </p>
          </div>

          {/* Complimentary Free Refill Note */}
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-slate-600">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Suất ăn đã bao gồm <strong className="text-slate-800">Cơm trắng / Cơm lứt</strong> và <strong className="text-slate-800">Canh nóng súp tự chọn 0đ</strong> không giới hạn tại quầy tiếp thực.
            </p>
          </div>
        </div>

        {/* Bottom CTA Action Button */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          {readOnly ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              Đóng chi tiết món
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onToggleSelect?.(dish);
                onClose();
              }}
              disabled={!isSelected && !canSelectMore}
              className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
                isSelected
                  ? 'bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100'
                  : canSelectMore
                  ? 'bg-[#0057b8] text-white hover:bg-[#004593] shadow-[#0057b8]/25'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isSelected ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Bỏ chọn món này khỏi suất ăn</span>
                </>
              ) : canSelectMore ? (
                <>
                  <Check className="w-4 h-4 stroke-[3px]" />
                  <span>Chọn món này vào suất ({currentSelectedCount}/{maxDishes})</span>
                </>
              ) : (
                <span>Đã đủ tối đa {maxDishes} món/suất</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
