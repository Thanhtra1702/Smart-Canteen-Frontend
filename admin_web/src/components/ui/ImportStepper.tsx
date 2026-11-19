import React from 'react';
import { CheckIcon as Check } from '@phosphor-icons/react';

export interface StepItem {
  id: number;
  title: string;
  description: string;
}

interface ImportStepperProps {
  currentStep: number;
  steps?: StepItem[];
  onStepClick?: (step: number) => void;
}

const DEFAULT_STEPS: StepItem[] = [
  { id: 1, title: 'Tải file mẫu', description: 'Chọn cơ sở & tải file .xlsx' },
  { id: 2, title: 'Tải tệp lên', description: 'Kéo thả file đã điền' },
  { id: 3, title: 'Đối soát & Tiền kiểm', description: 'Kiểm tra lỗi & phân loại' },
  { id: 4, title: 'Xác nhận lưu', description: 'Lưu CSDL & ghi sổ cái' },
];

export const ImportStepper: React.FC<ImportStepperProps> = ({
  currentStep,
  steps = DEFAULT_STEPS,
  onStepClick,
}) => {
  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-4 shadow-2xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
        {steps.map((step) => {
          const isDone = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable = Boolean(onStepClick && isDone);

          return (
            <div
              key={step.id}
              onClick={() => isClickable && onStepClick?.(step.id)}
              className={`flex items-center gap-3 p-3 rounded-xl transition ${
                isCurrent
                  ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20 shadow-xs'
                  : isDone
                  ? 'bg-secondary/40 hover:bg-secondary cursor-pointer border border-border/60'
                  : 'opacity-50 border border-transparent'
              }`}
            >
              <div
                className={`size-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition ${
                  isDone
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isCurrent
                    ? 'bg-primary text-white ring-4 ring-primary/20 shadow-xs'
                    : 'bg-muted/20 text-muted'
                }`}
              >
                {isDone ? <Check weight="bold" className="size-4" /> : step.id}
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-semibold truncate ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                  {step.title}
                </div>
                <div className="text-[11px] text-muted truncate">{step.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

