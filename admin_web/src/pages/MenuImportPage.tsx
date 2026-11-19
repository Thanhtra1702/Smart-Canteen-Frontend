import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DownloadSimpleIcon as Download,
  CloudArrowUpIcon as UploadCloud,
  CheckCircleIcon as CheckCircle2,
  ArrowRightIcon as ArrowRight,
  CalendarIcon as Calendar,
  CaretLeftIcon as ChevronLeft,
  CaretRightIcon as ChevronRight,
  XIcon as X,
  MagnifyingGlassIcon as Search,
  EyeIcon as Eye,
  SpinnerGapIcon as Loader2,
  CaretUpDownIcon as ChevronsUpDown,
  SunIcon as Sun,
  ForkKnifeIcon as Utensils,
  MoonIcon as Moon,
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { DatePickerButton } from '../components/ui/DatePickerButton';
import { useToast } from '../context/ToastContext';
import { ImportStepper } from '../components/ui/ImportStepper';
import { ExcelValidationTable } from '../components/ui/ExcelValidationTable';
import { ExcelCommitModal } from '../components/ui/ExcelCommitModal';

interface MenuImportPageProps {
  onNavigateTab?: (tab: any) => void;
}

const SHIFT_DEFINITIONS = [
  {
    type: 'BREAKFAST',
    title: 'Ca Sáng',
    time: '06:30 – 08:30',
    dot: 'bg-amber-500',
    iconBg: 'bg-amber-50 text-amber-600',
  },
  {
    type: 'LUNCH',
    title: 'Ca Trưa',
    time: '11:00 – 13:00',
    dot: 'bg-[#0057b8]',
    iconBg: 'bg-[#EFF6FF] text-[#0057b8]',
  },
  {
    type: 'DINNER',
    title: 'Ca Tối',
    time: '17:00 – 19:00',
    dot: 'bg-indigo-500',
    iconBg: 'bg-indigo-50 text-indigo-600',
  },
] as const;

const renderShiftIcon = (type: string) => {
  if (type === 'BREAKFAST') return <Sun className="size-4" />;
  if (type === 'DINNER') return <Moon className="size-4" />;
  return <Utensils className="size-4" />;
};

const formatYYYYMMDD = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const MenuImportPage: React.FC<MenuImportPageProps> = ({ onNavigateTab }) => {
  const { user, selectedCanteenId } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<'weekly' | 'dishes' | 'import'>('weekly');
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [matrixShiftFilter, setMatrixShiftFilter] = useState<'ALL' | 'BREAKFAST' | 'LUNCH' | 'DINNER'>('ALL');

  // Canteen Selection
  const [canteens, setCanteens] = useState<any[]>([]);
  const [activeCanteenId, setActiveCanteenId] = useState<string>('');

  useEffect(() => {
    if (selectedCanteenId && selectedCanteenId !== 'ALL') {
      setActiveCanteenId(selectedCanteenId);
    }
  }, [selectedCanteenId]);

  useEffect(() => {
    const fetchCanteens = async () => {
      try {
        const endpoint = isSuperAdmin ? '/admin-hq/canteens' : '/canteens';
        const res = await api.get(endpoint).catch(() => api.get('/canteens'));
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setCanteens(list);
        if (list.length > 0) {
          const defaultId =
            selectedCanteenId && selectedCanteenId !== 'ALL'
              ? selectedCanteenId
              : user?.canteenId || list[0].id;
          setActiveCanteenId(defaultId);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách cơ sở', err);
      }
    };
    fetchCanteens();
  }, [user, isSuperAdmin, selectedCanteenId]);

  // Weekly Menu State & Helpers
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() => getMonday(new Date()));
  const [weeklyMenus, setWeeklyMenus] = useState<any[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [selectedDishModal, setSelectedDishModal] = useState<any | null>(null);

  const weekDays = useMemo(() => {
    const days: { date: Date; dateStr: string; dayLabel: string; shortLabel: string; isToday: boolean }[] = [];
    const dayLabels = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    const shortLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekMonday);
      d.setDate(currentWeekMonday.getDate() + i);
      const dateStr = formatYYYYMMDD(d);
      days.push({
        date: d,
        dateStr,
        dayLabel: dayLabels[i],
        shortLabel: shortLabels[i],
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [currentWeekMonday]);

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const monday = getMonday(new Date());
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dateStr === todayStr) return i;
    }
    return 0;
  });

  useEffect(() => {
    const todayIdx = weekDays.findIndex((d) => d.isToday);
    setSelectedDayIndex(todayIdx !== -1 ? todayIdx : 0);
  }, [weekDays]);

  const sundayDate = useMemo(() => {
    const sun = new Date(currentWeekMonday);
    sun.setDate(currentWeekMonday.getDate() + 6);
    return sun;
  }, [currentWeekMonday]);

  const fetchWeeklyMenus = useCallback(async () => {
    if (!activeCanteenId && !isSuperAdmin) return;
    try {
      setWeeklyLoading(true);
      const res = await api.get('/menu', {
        params: {
          canteenId: activeCanteenId !== 'ALL' ? activeCanteenId : undefined,
          startDate: weekDays[0].dateStr,
          endDate: weekDays[6].dateStr,
        },
      });
      setWeeklyMenus(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Lỗi tải thực đơn tuần', err);
      setWeeklyMenus([]);
    } finally {
      setWeeklyLoading(false);
    }
  }, [activeCanteenId, isSuperAdmin, weekDays]);

  useEffect(() => {
    if (activeTab === 'weekly') {
      fetchWeeklyMenus();
    }
  }, [activeTab, fetchWeeklyMenus]);

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekMonday);
    prev.setDate(currentWeekMonday.getDate() - 7);
    setCurrentWeekMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekMonday);
    next.setDate(currentWeekMonday.getDate() + 7);
    setCurrentWeekMonday(next);
  };

  const handleCurrentWeek = () => {
    setCurrentWeekMonday(getMonday(new Date()));
  };

  const handleDatePick = (isoDate: string) => {
    if (!isoDate) return;
    const [y, m, d] = isoDate.split('-').map(Number);
    setCurrentWeekMonday(getMonday(new Date(y, (m || 1) - 1, d || 1)));
  };

  const menusByDateAndMeal = useMemo(() => {
    const map = new Map<string, any>();
    weeklyMenus.forEach((m) => {
      const dStr = typeof m.date === 'string' ? m.date.slice(0, 10) : formatYYYYMMDD(new Date(m.date));
      map.set(`${dStr}_${m.mealType}`, m);
    });
    return map;
  }, [weeklyMenus]);

  // Dishes Catalog State
  const [dishes, setDishes] = useState<any[]>([]);
  const [dishesLoading, setDishesLoading] = useState(false);
  const [dishSearch, setDishSearch] = useState('');
  const [dishCategoryFilter, setDishCategoryFilter] = useState<string>('ALL');
  const [dishSortDir, setDishSortDir] = useState<'asc' | 'desc'>('asc');

  const fetchDishes = useCallback(async () => {
    try {
      setDishesLoading(true);
      const res = await api.get('/menu/dishes', {
        params: { canteenId: activeCanteenId !== 'ALL' ? activeCanteenId : undefined },
      });
      setDishes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load dishes', err);
    } finally {
      setDishesLoading(false);
    }
  }, [activeCanteenId]);

  useEffect(() => {
    if (activeTab === 'dishes') {
      fetchDishes();
    }
  }, [activeTab, fetchDishes]);

  const toggleDishNameSort = () => {
    setDishSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const filteredDishes = useMemo(() => {
    const q = dishSearch.trim().toLowerCase();
    const factor = dishSortDir === 'asc' ? 1 : -1;

    return dishes
      .filter((d) => {
        const matchSearch = !q || d.name?.toLowerCase().includes(q);
        const matchCat =
          dishCategoryFilter === 'ALL'
            ? true
            : dishCategoryFilter === 'FOOD'
            ? d.category === 'MAIN' || d.category === 'SIDE'
            : d.category === dishCategoryFilter;
        return matchSearch && matchCat;
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi') * factor);
  }, [dishes, dishSearch, dishCategoryFilter, dishSortDir]);

  // Excel Import State
  const [importStep, setImportStep] = useState<number>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [allowPartialImport, setAllowPartialImport] = useState(true);

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/excel/template/menu', {
        params: { canteenId: activeCanteenId !== 'ALL' ? activeCanteenId : undefined },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Mau_Thuc_Don_Va_Dinh_Muc_BOM.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Đã tải file Excel mẫu thực đơn thành công!');
      setImportStep(2);
    } catch (err) {
      toast.error('Lỗi tải file mẫu: ' + err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewData(null);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      setImportStep(2);
      const res = await api.post('/excel/validate/menu', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewData(res.data);
      setImportStep(3);
      toast.info(
        `Đã kiểm tra file: ${res.data.validRows?.length || 0} dòng hợp lệ, ${
          res.data.errors?.length || 0
        } dòng lỗi.`
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi đọc file Excel');
      setImportStep(2);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportErrors = () => {
    if (!previewData?.errors?.length) return;
    const header = 'Dong,Nguyen_nhan_loi,Co_so,Mon_an,Ca_an,Ngay\n';
    const rows = previewData.errors
      .map((e: any) => {
        const d = e.rawData || {};
        return `"${e.row}","${e.error.replace(/"/g, '""')}","${d.canteenInput || ''}","${
          d.dishName || ''
        }","${d.mealTypeInput || ''}","${d.dateCell || ''}"`;
      })
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Danh_sach_dong_loi_Menu.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.info('Đã tải danh sách các dòng lỗi về máy!');
  };

  const handleCommitConfirm = async () => {
    if (!previewData?.validRows?.length) return;

    try {
      setIsCommitting(true);
      const res = await api.post('/excel/import/menu', {
        rows: previewData.validRows,
      });
      setImportResult(res.data);
      setShowCommitModal(false);
      setPreviewData(null);
      setSelectedFile(null);
      setImportStep(4);
      fetchWeeklyMenus();
      toast.success('Đã import thực đơn tuần và công thức BOM thành công!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi import thực đơn');
    } finally {
      setIsCommitting(false);
    }
  };

  const getCategoryMeta = (category?: string) => {
    switch (category) {
      case 'MAIN':
        return { label: 'Món chính', dot: 'bg-[#0057b8]' };
      case 'SIDE':
        return { label: 'Món phụ', dot: 'bg-emerald-500' };
      case 'SOUP':
        return { label: 'Món canh', dot: 'bg-amber-500' };
      case 'DRINK':
        return { label: 'Đồ uống', dot: 'bg-cyan-500' };
      case 'DESSERT':
        return { label: 'Tráng miệng', dot: 'bg-purple-500' };
      default:
        return { label: category || 'Món ăn', dot: 'bg-slate-400' };
    }
  };

  const getMealLabel = (mealType?: string) => {
    switch (mealType) {
      case 'BREAKFAST':
        return 'Ca Sáng';
      case 'LUNCH':
        return 'Ca Trưa';
      case 'DINNER':
        return 'Ca Tối';
      default:
        return mealType || '';
    }
  };

  const selectedDay = weekDays[selectedDayIndex] || weekDays[0];

  const visibleShiftsInMatrix = useMemo(() => {
    if (matrixShiftFilter === 'ALL') return SHIFT_DEFINITIONS;
    return SHIFT_DEFINITIONS.filter((s) => s.type === matrixShiftFilter);
  }, [matrixShiftFilter]);

  const topTabs = [
    { id: 'weekly' as const, label: 'Thực đơn theo tuần' },
    { id: 'dishes' as const, label: 'Danh mục món & BOM' },
    { id: 'import' as const, label: 'Nhập Excel' },
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Unified Top Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
          {topTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-7 px-3 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Download} onClick={handleDownloadTemplate}>
            Tải Excel mẫu
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={UploadCloud}
            onClick={() => setActiveTab('import')}
          >
            Nhập Excel
          </Button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: THỰC ĐƠN TUẦN                                     */}
      {/* ======================================================== */}
      {activeTab === 'weekly' && (
        <div className="space-y-4">
          {/* Week Control Bar + View Switcher */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center bg-slate-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={handlePrevWeek}
                  className="size-7 rounded-lg hover:bg-white text-slate-600 flex items-center justify-center transition cursor-pointer"
                  title="Tuần trước"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCurrentWeek}
                  className="h-7 px-2.5 rounded-lg hover:bg-white text-slate-800 text-xs font-medium transition cursor-pointer"
                >
                  Tuần này
                </button>
                <button
                  type="button"
                  onClick={handleNextWeek}
                  className="size-7 rounded-lg hover:bg-white text-slate-600 flex items-center justify-center transition cursor-pointer"
                  title="Tuần kế tiếp"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              <span className="font-mono text-xs text-slate-600 px-2">
                {currentWeekMonday.toLocaleDateString('vi-VN')} –{' '}
                {sundayDate.toLocaleDateString('vi-VN')}
              </span>

              <DatePickerButton
                value={weekDays[0].dateStr}
                onChange={handleDatePick}
                title="Chọn ngày để nhảy đến tuần"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setViewMode('day')}
                className={`h-7 px-3 rounded-lg text-xs transition-all cursor-pointer ${
                  viewMode === 'day'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                Theo ngày
              </button>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={`h-7 px-3 rounded-lg text-xs transition-all cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                Toàn tuần
              </button>
            </div>
          </div>

          {weeklyLoading && (
            <div className="py-14 text-center text-xs text-slate-400 flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200/80">
              <Loader2 className="size-4 text-[#0057b8] animate-spin" />
              <span>Đang tải thực đơn tuần...</span>
            </div>
          )}

          {/* VIEW 1: DAILY VIEW */}
          {!weeklyLoading && viewMode === 'day' && (
            <div className="space-y-4">
              {/* 7-Day Selector Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {weekDays.map((day, idx) => {
                  const isSelected = selectedDayIndex === idx;
                  const dayMealsCount = ['BREAKFAST', 'LUNCH', 'DINNER'].filter(
                    (shift) =>
                      (menusByDateAndMeal.get(`${day.dateStr}_${shift}`)?.items?.length || 0) > 0
                  ).length;

                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0057b8] text-white border-[#0057b8] shadow-xs'
                          : 'bg-white border-slate-200/80 text-slate-700 hover:border-[#0057b8]/50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 text-xs font-medium">
                        {day.isToday && (
                          <span
                            className={`size-1.5 rounded-full shrink-0 ${
                              isSelected ? 'bg-white' : 'bg-[#0057b8]'
                            }`}
                          />
                        )}
                        <span className={isSelected ? 'text-white' : 'text-slate-800'}>
                          {day.dayLabel}
                        </span>
                      </div>

                      <div
                        className={`font-mono text-xs font-semibold mt-0.5 ${
                          isSelected ? 'text-blue-50' : 'text-slate-600'
                        }`}
                      >
                        {day.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </div>

                      <div
                        className={`mt-1 text-[11px] ${
                          isSelected ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {dayMealsCount > 0 ? `${dayMealsCount} ca có món` : 'Trống'}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-medium text-slate-800">
                  {selectedDay.dayLabel}, {selectedDay.date.toLocaleDateString('vi-VN')}
                </span>
                <span className="text-[11px] text-slate-400">
                  Nhấp vào món để xem định mức nguyên liệu BOM
                </span>
              </div>

              {/* 3 Shift Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                {SHIFT_DEFINITIONS.map((shift) => {
                  const menuKey = `${selectedDay.dateStr}_${shift.type}`;
                  const menuData = menusByDateAndMeal.get(menuKey);
                  const dishesList = menuData?.items || [];

                  return (
                    <div
                      key={shift.type}
                      className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden"
                    >
                      {/* Shift Header */}
                      <div className="px-4 py-3.5 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${shift.iconBg}`}
                          >
                            {renderShiftIcon(shift.type)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-semibold text-slate-900">{shift.title}</h3>
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                              {shift.time}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-medium text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shrink-0 tabular-nums">
                          {dishesList.length} món
                        </span>
                      </div>

                      {/* Shift Dishes */}
                      {dishesList.length > 0 ? (
                        <div className="p-3 space-y-2">
                          {dishesList.map((item: any) => {
                            const dish = item.dish;
                            if (!dish) return null;
                            const catMeta = getCategoryMeta(dish.category);
                            const recipeCount = dish.recipes?.length || 0;

                            return (
                              <button
                                key={dish.id}
                                type="button"
                                onClick={() =>
                                  setSelectedDishModal({
                                    ...dish,
                                    canteenName: menuData?.canteen?.name,
                                    mealType: shift.type,
                                  })
                                }
                                className="w-full p-3 rounded-xl border border-slate-200/75 bg-white hover:border-[#0057b8] hover:shadow-2xs transition-all cursor-pointer group flex items-center justify-between gap-3 text-left"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-medium text-slate-900 group-hover:text-[#0057b8] line-clamp-2 leading-snug transition-colors">
                                    {dish.name}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400 mt-1">
                                    <span className="inline-flex items-center gap-1.5">
                                      <span className={`size-1.5 rounded-full shrink-0 ${catMeta.dot}`} />
                                      <span>{catMeta.label}</span>
                                    </span>
                                    {recipeCount > 0 && (
                                      <span>• BOM {recipeCount}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  <ChevronRight className="size-4 text-slate-300 group-hover:text-[#0057b8] group-hover:translate-x-0.5 transition-all" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-12 px-4 text-center text-xs text-slate-400">
                          Chưa có món cho {shift.title}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: WEEKLY MATRIX VIEW */}
          {!weeklyLoading && viewMode === 'week' && (
            <div className="space-y-4">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {[
                  { id: 'ALL', label: 'Tất cả 3 ca' },
                  { id: 'LUNCH', label: 'Ca Trưa' },
                  { id: 'BREAKFAST', label: 'Ca Sáng' },
                  { id: 'DINNER', label: 'Ca Tối' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setMatrixShiftFilter(btn.id as any)}
                    className={`h-7 px-3 rounded-lg text-xs transition-all cursor-pointer ${
                      matrixShiftFilter === btn.id
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-500 hover:text-slate-800 font-medium'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {visibleShiftsInMatrix.map((shift) => (
                  <div
                    key={shift.type}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`size-1.5 rounded-full ${shift.dot}`} />
                        <span className="text-xs font-semibold text-slate-800">{shift.title}</span>
                        <span className="text-[11px] font-mono text-slate-400">{shift.time}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">Thứ 2 – Chủ Nhật</span>
                    </div>

                    <div className="p-3 overflow-x-auto">
                      <div className="grid grid-cols-7 gap-2.5 min-w-[980px]">
                        {weekDays.map((day) => {
                          const menuKey = `${day.dateStr}_${shift.type}`;
                          const menuData = menusByDateAndMeal.get(menuKey);
                          const dishesList = menuData?.items || [];

                          return (
                            <div
                              key={day.dateStr}
                              className={`rounded-xl border flex flex-col ${
                                day.isToday
                                  ? 'border-[#0057b8] bg-[#EFF6FF]/30'
                                  : 'border-slate-200/75 bg-slate-50/40'
                              }`}
                            >
                              <div
                                className={`px-2.5 py-2 text-center border-b rounded-t-xl ${
                                  day.isToday
                                    ? 'bg-[#0057b8] text-white border-[#0057b8]'
                                    : 'bg-white border-slate-100'
                                }`}
                              >
                                <div className="text-[11px] font-medium">{day.shortLabel}</div>
                                <div
                                  className={`font-mono text-[11px] ${
                                    day.isToday ? 'text-blue-100' : 'text-slate-400'
                                  }`}
                                >
                                  {day.date.toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                  })}
                                </div>
                              </div>

                              <div className="p-2 space-y-1.5 flex-1 min-h-[110px]">
                                {dishesList.length > 0 ? (
                                  dishesList.map((item: any) => {
                                    const dish = item.dish;
                                    if (!dish) return null;
                                    const catMeta = getCategoryMeta(dish.category);
                                    return (
                                      <button
                                        key={dish.id}
                                        type="button"
                                        onClick={() =>
                                          setSelectedDishModal({
                                            ...dish,
                                            canteenName: menuData?.canteen?.name,
                                            mealType: shift.type,
                                          })
                                        }
                                        className="w-full p-2 rounded-lg bg-white border border-slate-200/75 hover:border-[#0057b8] transition text-left cursor-pointer space-y-1"
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <span className={`size-1.5 rounded-full shrink-0 ${catMeta.dot}`} />
                                          <span className="text-[11px] text-slate-400 truncate">
                                            {catMeta.label}
                                          </span>
                                        </div>
                                        <div className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug">
                                          {dish.name}
                                        </div>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="h-full min-h-[90px] flex items-center justify-center text-[11px] text-slate-300">
                                    —
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DANH MỤC MÓN ĂN & BOM (FLOATING ROW-CARDS)         */}
      {/* ======================================================== */}
      {activeTab === 'dishes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'FOOD', label: 'Chính & Phụ' },
                { id: 'SOUP', label: 'Canh' },
                { id: 'DESSERT', label: 'Tráng miệng' },
                { id: 'DRINK', label: 'Đồ uống' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setDishCategoryFilter(c.id)}
                  className={`h-7 px-3 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                    dishCategoryFilter === c.id
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 lg:w-64 lg:flex-none">
              <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm theo tên món ăn..."
                value={dishSearch}
                onChange={(e) => setDishSearch(e.target.value)}
                className="w-full pl-9 pr-3 h-9 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#0057b8] focus:ring-1 focus:ring-[#0057b8] outline-hidden transition-colors"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="overflow-x-auto pb-1">
              <div className="min-w-[680px] space-y-2">
                <div className="grid grid-cols-[minmax(220px,1.7fr)_140px_130px_130px_88px] items-center gap-3 px-4 py-1 text-xs font-medium text-slate-400">
                  <button
                    type="button"
                    onClick={toggleDishNameSort}
                    className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer text-left"
                  >
                    <span>Món ăn</span>
                    <ChevronsUpDown className="size-3 text-slate-300" />
                  </button>
                  <span>Phân loại</span>
                  <span className="text-right">Định mức BOM</span>
                  <span>Trạng thái</span>
                  <span className="text-right">Chi tiết</span>
                </div>

                {filteredDishes.map((d) => {
                  const catMeta = getCategoryMeta(d.category);
                  const recipeCount = d.recipes?.length || 0;
                  const available = d.isAvailable !== false;

                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDishModal(d)}
                      className="group bg-white rounded-xl border border-slate-200/75 hover:border-[#0057b8] hover:shadow-xs px-4 py-3 grid grid-cols-[minmax(220px,1.7fr)_140px_130px_130px_88px] items-center gap-3 transition-all cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-800 truncate" title={d.name}>
                          {d.name}
                        </div>
                        {d.description && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {d.description}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`size-1.5 rounded-full shrink-0 ${catMeta.dot}`} />
                        <span className="text-xs text-slate-700 truncate">{catMeta.label}</span>
                      </div>

                      <div className="text-right text-xs text-slate-600 tabular-nums">
                        {recipeCount > 0 ? `${recipeCount} mục` : <span className="text-slate-300">—</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`size-1.5 rounded-full shrink-0 ${
                            available ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span className={`text-xs ${available ? 'text-slate-700' : 'text-slate-400'}`}>
                          {available ? 'Đang bán' : 'Tạm ngưng'}
                        </span>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDishModal(d);
                          }}
                          className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 group-hover:bg-[#0057b8] group-hover:text-white group-hover:border-[#0057b8] text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Eye className="size-3.5" />
                          <span>Xem</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredDishes.length === 0 && (
                  <div className="bg-white rounded-xl border border-slate-200/75 py-12 text-center text-xs text-slate-400">
                    {dishesLoading ? 'Đang tải danh mục món...' : 'Không tìm thấy món ăn phù hợp.'}
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-400">{filteredDishes.length} món ăn</div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: NHẬP TỪ EXCEL (4-STEP WIZARD)                     */}
      {/* ======================================================== */}
      {activeTab === 'import' && (
        <div className="space-y-5 max-w-4xl mx-auto">
          <ImportStepper
            currentStep={importStep}
            onStepClick={(step) => {
              if (step < importStep) setImportStep(step);
            }}
          />

          {importStep <= 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-slate-800">
                    1. Tải file Excel mẫu chuẩn
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Download}
                    onClick={handleDownloadTemplate}
                  >
                    Tải file .xlsx
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Gồm Sheet Thực đơn tuần và Sheet Định mức BOM cho{' '}
                  <strong className="font-medium text-slate-700">
                    {canteens.find((c) => c.id === activeCanteenId)?.name || 'cơ sở hiện tại'}
                  </strong>
                  .
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="font-semibold text-xs text-slate-800">
                  2. Kéo thả file đã điền dữ liệu
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Hệ thống tự động kiểm tra định dạng ngày, đối soát danh mục món và liên kết công thức nấu với kho bếp.
                </p>
              </div>
            </div>
          )}

          {importStep <= 2 && (
            <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#0057b8]/60 text-center relative flex flex-col items-center justify-center transition cursor-pointer shadow-2xs">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="size-11 rounded-xl bg-[#EFF6FF] text-[#0057b8] flex items-center justify-center mb-2.5">
                {isUploading ? (
                  <Loader2 className="size-5 text-[#0057b8] animate-spin" />
                ) : (
                  <UploadCloud className="size-5" />
                )}
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {isUploading
                  ? 'Đang kiểm tra dữ liệu file Excel...'
                  : 'Kéo thả hoặc nhấp để chọn file Excel thực đơn'}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Hỗ trợ định dạng .xlsx hoặc .xls (tối đa 10MB)
              </p>
              {selectedFile && (
                <span className="text-xs font-mono font-medium text-[#0057b8] bg-[#EFF6FF] px-3 py-1 rounded-lg mt-3">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
          )}

          {importStep >= 3 && previewData && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Bảng đối soát thực đơn ({previewData.validCount} dòng hợp lệ)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Kiểm tra định mức BOM nguyên liệu trước khi lưu
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewData(null);
                      setSelectedFile(null);
                      setImportStep(2);
                    }}
                  >
                    Chọn file khác
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isCommitting || previewData.validCount === 0}
                    onClick={() => setShowCommitModal(true)}
                  >
                    Lưu ({previewData.validCount})
                  </Button>
                </div>
              </div>

              <ExcelValidationTable
                type="menu"
                previewData={previewData}
                allowPartialImport={allowPartialImport}
                onTogglePartialImport={setAllowPartialImport}
                onExportErrors={handleExportErrors}
              />
            </div>
          )}

          {importResult && (
            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>{importResult.message}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Calendar className="size-3.5" />}
                  onClick={() => setActiveTab('weekly')}
                >
                  Xem thực đơn tuần
                </Button>
                {onNavigateTab && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ArrowRight className="size-3.5" />}
                    onClick={() => onNavigateTab('forecast')}
                  >
                    Xem dự báo nguyên liệu
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImportResult(null);
                    setImportStep(1);
                  }}
                >
                  Nhập đợt mới
                </Button>
              </div>
            </div>
          )}

          {showCommitModal && previewData && (
            <ExcelCommitModal
              isOpen={showCommitModal}
              type="menu"
              summary={{
                total: previewData.validCount,
                inserts:
                  previewData.validRows?.filter((r: any) => r.status === 'INSERT').length || 0,
                updates:
                  previewData.validRows?.filter((r: any) => r.status === 'UPDATE').length || 0,
                canteenName: canteens.find((c) => c.id === activeCanteenId)?.name,
                totalBomIngredients: previewData.totalBomIngredients || 0,
              }}
              isSubmitting={isCommitting}
              onClose={() => setShowCommitModal(false)}
              onConfirm={handleCommitConfirm}
            />
          )}
        </div>
      )}

      {/* Modal Chi tiết Món ăn & BOM (Synced with AuditLogsPage style) */}
      {selectedDishModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDishModal(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl shadow-modal border border-slate-200/80 w-full max-w-md p-5 space-y-4 text-xs">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 text-sm">{selectedDishModal.name}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {getCategoryMeta(selectedDishModal.category).label}
                  {selectedDishModal.mealType ? ` • ${getMealLabel(selectedDishModal.mealType)}` : ''}
                  {selectedDishModal.canteenName ? ` • ${selectedDishModal.canteenName}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDishModal(null)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Đóng"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {selectedDishModal.description && (
              <p className="text-xs text-slate-500 leading-relaxed">
                {selectedDishModal.description}
              </p>
            )}

            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-700 block">
                Định mức nguyên liệu BOM (1 suất)
              </span>

              {selectedDishModal.recipes && selectedDishModal.recipes.length > 0 ? (
                <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-slate-50/40">
                  {selectedDishModal.recipes.map((rec: any, idx: number) => {
                    const ingName = rec.ingredient?.name || rec.ingredientName || 'Nguyên liệu';
                    const unit = rec.ingredient?.unit || rec.unit || 'kg';
                    const qty = rec.amountPerServing ?? rec.quantityRequired ?? rec.amount ?? 0;

                    return (
                      <div
                        key={idx}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800">{ingName}</div>
                          {rec.prepNote && (
                            <div className="text-[11px] text-slate-400 mt-0.5">{rec.prepNote}</div>
                          )}
                        </div>
                        <span className="font-mono font-medium text-slate-800 shrink-0 tabular-nums">
                          {qty} {unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  Món ăn này chưa gắn công thức BOM nguyên liệu.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedDishModal(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
