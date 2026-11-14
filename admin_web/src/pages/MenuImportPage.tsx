import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Building2,
  Utensils,
  Clock,
  X,
  Tv,
  Search,
  Sun,
  Moon,
  FileSpreadsheet,
  LayoutGrid,
  CalendarDays,
  UtensilsCrossed,
  Info,
  CalendarRange,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { useToast } from '../context/ToastContext';
import { ImportStepper } from '../components/ui/ImportStepper';
import { ExcelValidationTable } from '../components/ui/ExcelValidationTable';
import { ExcelCommitModal } from '../components/ui/ExcelCommitModal';

interface MenuImportPageProps {
  onNavigateTab?: (tab: any) => void;
}

export const MenuImportPage: React.FC<MenuImportPageProps> = ({ onNavigateTab }) => {
  const { user, selectedCanteenId } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<'weekly' | 'dishes' | 'import'>('weekly');
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [matrixShiftFilter, setMatrixShiftFilter] = useState<'ALL' | 'BREAKFAST' | 'LUNCH' | 'DINNER'>('ALL');

  // ==========================================
  // CANTEEN SELECTION STATE
  // ==========================================
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

  // ==========================================
  // WEEKLY MENU STATE & LOGIC
  // ==========================================
  const formatYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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

  // 7 ngày trong tuần từ Thứ Hai đến Chủ Nhật
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

  // Ngày được chọn trong chế độ xem theo ngày
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

  // Tự động nhảy sang hôm nay khi đổi tuần (nếu tuần đó chứa hôm nay)
  useEffect(() => {
    const todayIdx = weekDays.findIndex((d) => d.isToday);
    if (todayIdx !== -1) {
      setSelectedDayIndex(todayIdx);
    } else {
      setSelectedDayIndex(0);
    }
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
      const startDateStr = weekDays[0].dateStr;
      const endDateStr = weekDays[6].dateStr;

      const res = await api.get('/menu', {
        params: {
          canteenId: activeCanteenId !== 'ALL' ? activeCanteenId : undefined,
          startDate: startDateStr,
          endDate: endDateStr,
        },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setWeeklyMenus(data);
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

  const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const picked = new Date(e.target.value);
    setCurrentWeekMonday(getMonday(picked));
  };

  // Map menus theo ngày (YYYY-MM-DD) và ca (BREAKFAST, LUNCH, DINNER)
  const menusByDateAndMeal = useMemo(() => {
    const map = new Map<string, any>();
    weeklyMenus.forEach((m) => {
      const dStr = typeof m.date === 'string' ? m.date.slice(0, 10) : formatYYYYMMDD(new Date(m.date));
      const key = `${dStr}_${m.mealType}`;
      map.set(key, m);
    });
    return map;
  }, [weeklyMenus]);

  // Thống kê tuần
  const weeklyStats = useMemo(() => {
    const mealCount = weeklyMenus.length;
    const dishSet = new Set<string>();
    let totalBomIngredients = 0;

    weeklyMenus.forEach((m) => {
      m.items?.forEach((item: any) => {
        if (item.dish) {
          dishSet.add(item.dish.id);
          totalBomIngredients += item.dish.recipes?.length || 0;
        }
      });
    });

    return {
      mealCount,
      uniqueDishes: dishSet.size,
      totalBomIngredients,
    };
  }, [weeklyMenus]);

  // ==========================================
  // DISHES CATALOG STATE
  // ==========================================
  const [dishes, setDishes] = useState<any[]>([]);
  const [dishesLoading, setDishesLoading] = useState(false);
  const [dishSearch, setDishSearch] = useState('');
  const [dishCategoryFilter, setDishCategoryFilter] = useState<string>('ALL');

  const fetchDishes = useCallback(async () => {
    try {
      setDishesLoading(true);
      const res = await api.get('/menu/dishes', {
        params: { canteenId: activeCanteenId !== 'ALL' ? activeCanteenId : undefined },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setDishes(data);
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

  const filteredDishes = useMemo(() => {
    return dishes.filter((d) => {
      const matchSearch =
        !dishSearch.trim() || d.name?.toLowerCase().includes(dishSearch.trim().toLowerCase());
      const matchCat =
        dishCategoryFilter === 'ALL'
          ? true
          : dishCategoryFilter === 'FOOD'
          ? d.category === 'MAIN' || d.category === 'SIDE'
          : d.category === dishCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [dishes, dishSearch, dishCategoryFilter]);

  // ==========================================
  // EXCEL IMPORT STATE & LOGIC
  // ==========================================
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
      toast.success('Đã tải file Excel mẫu thực đơn kèm hướng dẫn thành công!');
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

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const getMealTypeBadge = (mealType: string) => {
    switch (mealType) {
      case 'BREAKFAST':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Sun className="w-3 h-3 text-amber-500" />
            Ca Sáng
          </span>
        );
      case 'LUNCH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-[#0057b8] border border-blue-200">
            <Utensils className="w-3 h-3 text-[#0057b8]" />
            Ca Trưa
          </span>
        );
      case 'DINNER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Moon className="w-3 h-3 text-indigo-600" />
            Ca Tối
          </span>
        );
      default:
        return <Badge variant="neutral" size="sm">{mealType}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'MAIN':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            Món chính
          </span>
        );
      case 'SIDE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Món phụ
          </span>
        );
      case 'SOUP':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Món canh
          </span>
        );
      case 'DRINK':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
            Đồ uống
          </span>
        );
      case 'DESSERT':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            Tráng miệng
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {category || 'Món ăn'}
          </span>
        );
    }
  };

  const getCategoryDot = (category: string) => {
    switch (category) {
      case 'MAIN':
        return <span className="size-1.5 rounded-full bg-blue-500 shrink-0" title="Món chính" />;
      case 'SIDE':
        return <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" title="Món phụ" />;
      case 'SOUP':
        return <span className="size-1.5 rounded-full bg-amber-500 shrink-0" title="Món canh" />;
      case 'DRINK':
        return <span className="size-1.5 rounded-full bg-cyan-500 shrink-0" title="Đồ uống" />;
      case 'DESSERT':
        return <span className="size-1.5 rounded-full bg-purple-500 shrink-0" title="Tráng miệng" />;
      default:
        return <span className="size-1.5 rounded-full bg-slate-400 shrink-0" title="Món ăn" />;
    }
  };

  const currentCanteenName = useMemo(() => {
    if (activeCanteenId === 'ALL') return 'Tất cả cơ sở';
    const c = canteens.find((x) => x.id === activeCanteenId);
    return c?.name || 'Cơ sở đã chọn';
  }, [canteens, activeCanteenId]);

  const selectedDay = weekDays[selectedDayIndex] || weekDays[0];

  const shiftDefinitions = [
    {
      type: 'BREAKFAST',
      title: 'Ca Sáng',
      time: '06:30 – 08:30',
      badgeLabel: 'Bữa Sáng',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
      accentBg: 'bg-amber-50/30',
      bannerGradient: '',
      borderClass: 'border-slate-200',
      dishHoverBorder: 'hover:border-amber-300 hover:bg-amber-50/20',
    },
    {
      type: 'LUNCH',
      title: 'Ca Trưa',
      time: '11:00 – 13:00',
      badgeLabel: 'Bữa Trưa',
      icon: <Utensils className="w-4 h-4 text-[#0057b8]" />,
      tagColor: 'bg-blue-50 text-[#0057b8] border-blue-200',
      accentBg: 'bg-blue-50/30',
      bannerGradient: '',
      borderClass: 'border-slate-200',
      dishHoverBorder: 'hover:border-blue-300 hover:bg-blue-50/20',
    },
    {
      type: 'DINNER',
      title: 'Ca Tối',
      time: '17:00 – 19:00',
      badgeLabel: 'Bữa Tối',
      icon: <Moon className="w-4 h-4 text-indigo-600" />,
      tagColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      accentBg: 'bg-indigo-50/30',
      bannerGradient: '',
      borderClass: 'border-slate-200',
      dishHoverBorder: 'hover:border-indigo-300 hover:bg-indigo-50/20',
    },
  ];

  const visibleShiftsInMatrix = useMemo(() => {
    if (matrixShiftFilter === 'ALL') return shiftDefinitions;
    return shiftDefinitions.filter((s) => s.type === matrixShiftFilter);
  }, [matrixShiftFilter, shiftDefinitions]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* ======================================================== */}
      {/* 1. UNIFIED CLEAN TOP ACTION & TAB BAR                    */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-0">
        <div className="flex items-center gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'weekly'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Thực đơn theo tuần</span>
            {weeklyStats.mealCount > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-blue-50 text-primary font-bold">
                {weeklyStats.mealCount} ca
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('dishes')}
            className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'dishes'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Danh mục món & BOM</span>
            {dishes.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 font-bold">
                {dishes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'import'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Nhập thực đơn từ Excel</span>
          </button>
        </div>

        {/* Action buttons aligned right */}
        <div className="flex items-center gap-2 pb-2.5 shrink-0">
          {activeCanteenId && activeCanteenId !== 'ALL' && (
            <Button
              variant="outline"
              size="sm"
              icon={<Tv className="w-3.5 h-3.5 text-primary" />}
              onClick={() => window.open(`/display/${activeCanteenId}`, '_blank')}
            >
              Màn hình TV
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleDownloadTemplate}
          >
            Tải Excel mẫu
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<UploadCloud className="w-3.5 h-3.5" />}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            {/* Week navigation */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5">
                <button
                  onClick={handlePrevWeek}
                  className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition cursor-pointer"
                  title="Tuần trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCurrentWeek}
                  className="px-3 py-1 hover:bg-white text-slate-800 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Tuần này
                </button>
                <button
                  onClick={handleNextWeek}
                  className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition cursor-pointer"
                  title="Tuần kế tiếp"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold font-mono text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>
                  {currentWeekMonday.toLocaleDateString('vi-VN')} – {sundayDate.toLocaleDateString('vi-VN')}
                </span>
              </div>

              <input
                type="date"
                value={weekDays[0].dateStr}
                onChange={handleDatePick}
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 cursor-pointer focus:outline-hidden focus:border-primary"
                title="Chọn ngày để nhảy đến tuần"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'day'
                    ? 'bg-white text-primary font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Xem theo Ngày</span>
              </button>

              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-white text-primary font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Toàn tuần (Ma trận phân khu)</span>
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {weeklyLoading && (
            <div className="py-16 text-center text-xs text-muted flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span>Đang tải thực đơn tuần...</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW MODE 1: XEM THEO NGÀY (DAILY FOCUS VIEW - SIÊU THOÁNG MẮT) */}
          {/* ============================================================== */}
          {!weeklyLoading && viewMode === 'day' && (
            <div className="space-y-4">
              {/* 7-Day Pill Selector Strip */}
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
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20'
                          : day.isToday
                          ? 'bg-blue-50/70 border-blue-200 text-slate-800 hover:bg-blue-50'
                          : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {day.isToday && (
                        <span
                          className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider ${
                            isSelected ? 'bg-white text-slate-900 border border-slate-200' : 'bg-slate-900 text-white'
                          }`}
                        >
                          Hôm nay
                        </span>
                      )}

                      <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {day.dayLabel}
                      </div>

                      <div
                        className={`font-mono text-sm font-extrabold mt-0.5 ${
                          isSelected ? 'text-white' : 'text-slate-800'
                        }`}
                      >
                        {day.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </div>

                      <div className="mt-1.5 text-[11px]">
                        {dayMealsCount > 0 ? (
                          <span
                            className={`inline-block px-2 py-0.2 rounded-full font-medium ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-50 text-emerald-700 font-semibold'
                            }`}
                          >
                            {dayMealsCount} ca có món
                          </span>
                        ) : (
                          <span className={isSelected ? 'text-white/60' : 'text-slate-400'}>
                            Trống lịch
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Day Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">
                    Thực đơn {selectedDay.dayLabel}, ngày {selectedDay.date.toLocaleDateString('vi-VN')}
                  </span>
                  {selectedDay.isToday && (
                    <Badge variant="brand" size="sm">
                      Hôm nay
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  Nhấp vào món ăn bất kỳ để xem chi tiết định mức nguyên liệu BOM
                </span>
              </div>

              {/* 3 Spacious Columns (Sáng, Trưa, Tối) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {shiftDefinitions.map((shift) => {
                  const menuKey = `${selectedDay.dateStr}_${shift.type}`;
                  const menuData = menusByDateAndMeal.get(menuKey);
                  const dishesList = menuData?.items || [];

                  return (
                    <div
                      key={shift.type}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col"
                    >
                      {/* Shift Column Header */}
                      <div className={`p-4 border-b border-slate-200 flex items-center justify-between ${shift.accentBg}`}>
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            {shift.icon}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900">{shift.title}</h3>
                            <span className="text-xs font-mono text-slate-500">{shift.time}</span>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${shift.tagColor}`}
                        >
                          {dishesList.length} món
                        </span>
                      </div>

                      {/* Dishes List */}
                      <div className="p-4 space-y-3 flex-1">
                        {dishesList.length > 0 ? (
                          dishesList.map((item: any) => {
                            const dish = item.dish;
                            if (!dish) return null;
                            const recipeCount = dish.recipes?.length || 0;

                            return (
                              <div
                                key={dish.id}
                                onClick={() =>
                                  setSelectedDishModal({
                                    ...dish,
                                    canteenName: menuData?.canteen?.name,
                                    mealType: shift.type,
                                    mealTitle: shift.title,
                                  })
                                }
                                className="p-3.5 rounded-xl border border-slate-200/90 hover:border-primary/40 hover:bg-slate-50/60 transition cursor-pointer group shadow-2xs space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                      {getCategoryBadge(dish.category)}
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-primary transition leading-snug">
                                      {dish.name}
                                    </h4>
                                  </div>

                                  {dish.extraPrice > 0 ? (
                                    <span className="font-mono text-xs font-bold text-primary bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 shrink-0">
                                      +{formatVND(Number(dish.extraPrice))}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 font-medium shrink-0">
                                      0 ₫
                                    </span>
                                  )}
                                </div>

                                {dish.description && (
                                  <p className="text-xs text-slate-500 line-clamp-2">
                                    {dish.description}
                                  </p>
                                )}

                                <div className="pt-1 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                                  {recipeCount > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                                      <Layers className="w-3 h-3 text-primary" />
                                      {recipeCount} nguyên liệu BOM
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 italic">Chưa gắn BOM</span>
                                  )}

                                  <span className="text-primary text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition">
                                    Xem chi tiết →
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="h-44 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center p-4">
                            <span className="text-xs font-medium text-slate-400">
                              Chưa có món ăn nào cho {shift.title}
                            </span>
                            <span className="text-[11px] text-slate-400 mt-1">
                              Nhập file Excel để đồng bộ thực đơn ca này
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW MODE 2: XEM MA TRẬN TOÀN TUẦN PHÂN KHU (RÕ RÀNG, TÁCH BẠCH) */}
          {/* ============================================================== */}
          {!weeklyLoading && viewMode === 'week' && (
            <div className="space-y-6">
              {/* Shift Quick Filter Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-primary" />
                    Lọc ca ăn hiển thị:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'ALL', label: 'Tất cả 3 ca', count: '21 ô' },
                      { id: 'LUNCH', label: 'Chỉ Ca Trưa', count: '7 ngày' },
                      { id: 'BREAKFAST', label: 'Chỉ Ca Sáng', count: '7 ngày' },
                      { id: 'DINNER', label: 'Chỉ Ca Tối', count: '7 ngày' },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => setMatrixShiftFilter(btn.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          matrixShiftFilter === btn.id
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-200'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>Món chính • Canh • Món phụ • Tráng miệng</span>
                </div>
              </div>

              {/* RENDER EACH SHIFT AS A DISTINCT, INDEPENDENT SECTION */}
              <div className="space-y-6">
                {visibleShiftsInMatrix.map((shift) => (
                  <div
                    key={shift.type}
                    className={`bg-white rounded-2xl border ${shift.borderClass} shadow-2xs overflow-hidden`}
                  >
                    {/* Shift Banner Header */}
                    <div
                      className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                          {shift.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-tight">
                              {shift.title} ({shift.time})
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                              {shift.badgeLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Theo dõi thực đơn 7 ngày từ Thứ Hai đến Chủ Nhật
                          </p>
                        </div>
                      </div>

                      {/* Shift Stats */}
                      {(() => {
                        const activeDays = weekDays.filter(
                          (d) =>
                            (menusByDateAndMeal.get(`${d.dateStr}_${shift.type}`)?.items?.length || 0) > 0
                        ).length;
                        return (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${shift.tagColor}`}>
                              {activeDays}/7 ngày đã lên món
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* 7 Distinct Columns with Physical Separation (12px gap) */}
                    <div className="p-4 overflow-x-auto">
                      <div className="grid grid-cols-7 gap-3 min-w-[1100px]">
                        {weekDays.map((day) => {
                          const menuKey = `${day.dateStr}_${shift.type}`;
                          const menuData = menusByDateAndMeal.get(menuKey);
                          const dishesList = menuData?.items || [];

                          return (
                            <div
                              key={day.dateStr}
                              className={`rounded-2xl border transition-all flex flex-col ${
                                day.isToday
                                  ? 'bg-slate-50/70 border-slate-900 shadow-xs ring-1 ring-slate-900'
                                  : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {/* Day Header Box */}
                              <div
                                className={`p-2.5 text-center border-b rounded-t-2xl ${
                                  day.isToday
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <div className="text-xs font-bold">{day.dayLabel}</div>
                                <div
                                  className={`font-mono text-[11px] font-semibold mt-0.5 ${
                                    day.isToday ? 'text-slate-300' : 'text-slate-500'
                                  }`}
                                >
                                  {day.date.toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                  })}
                                </div>
                                {day.isToday && (
                                  <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-200 mt-1 uppercase tracking-wider">
                                    Hôm nay
                                  </span>
                                )}
                              </div>

                              {/* Dishes in this Day */}
                              <div className="p-2 space-y-2 flex-1 min-h-[140px]">
                                {dishesList.length > 0 ? (
                                  dishesList.map((item: any) => {
                                    const dish = item.dish;
                                    if (!dish) return null;
                                    const recipeCount = dish.recipes?.length || 0;

                                    return (
                                      <div
                                        key={dish.id}
                                        onClick={() =>
                                          setSelectedDishModal({
                                            ...dish,
                                            canteenName: menuData?.canteen?.name,
                                            mealType: shift.type,
                                            mealTitle: shift.title,
                                          })
                                        }
                                        className={`p-2.5 rounded-xl bg-white border border-slate-200/90 ${shift.dishHoverBorder} transition cursor-pointer group text-left space-y-1 shadow-2xs hover:-translate-y-0.5`}
                                      >
                                        {/* Category Chip & Price */}
                                        <div className="flex items-center justify-between gap-1">
                                          <div className="flex items-center gap-1">
                                            {getCategoryDot(dish.category)}
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                              {dish.category === 'MAIN'
                                                ? 'Chính'
                                                : dish.category === 'SIDE'
                                                ? 'Phụ'
                                                : dish.category === 'SOUP'
                                                ? 'Canh'
                                                : dish.category === 'DESSERT'
                                                ? 'Tráng miệng'
                                                : 'Món ăn'}
                                            </span>
                                          </div>

                                          {dish.extraPrice > 0 && (
                                            <span className="text-[10px] font-mono font-bold text-primary">
                                              +{formatVND(Number(dish.extraPrice))}
                                            </span>
                                          )}
                                        </div>

                                        {/* Dish Name */}
                                        <div className="font-bold text-xs text-slate-900 group-hover:text-primary transition line-clamp-2 leading-tight">
                                          {dish.name}
                                        </div>

                                        {/* BOM Mini Chip */}
                                        {recipeCount > 0 && (
                                          <div className="pt-0.5 flex items-center gap-1 text-[9.5px] font-mono text-slate-500">
                                            <Layers className="w-2.5 h-2.5 text-primary" />
                                            <span>BOM {recipeCount}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="h-full min-h-[110px] rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center p-2 text-center">
                                    <span className="text-[11px] font-medium text-slate-400">— Trống —</span>
                                    <span className="text-[10px] text-slate-300 mt-0.5">Chưa có món</span>
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
      {/* TAB 2: DANH MỤC MÓN ĂN & BOM                             */}
      {/* ======================================================== */}
      {activeTab === 'dishes' && (
        <Card flush className="space-y-0 overflow-hidden shadow-2xs">
          {/* Search & Filter Toolbar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên món ăn..."
                value={dishSearch}
                onChange={(e) => setDishSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-primary shadow-2xs"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'FOOD', label: 'Món chính & phụ' },
                { id: 'SOUP', label: 'Canh' },
                { id: 'DESSERT', label: 'Tráng miệng' },
                { id: 'DRINK', label: 'Đồ uống' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setDishCategoryFilter(c.id)}
                  className={`h-8 px-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    dishCategoryFilter === c.id
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dishes Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Tên món ăn</th>
                  <th className="px-5 py-3.5">Nhóm phân loại</th>
                  <th className="px-5 py-3.5 text-right">Phụ thu suất ăn</th>
                  <th className="px-5 py-3.5 text-center">Định mức BOM</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDishes.map((d) => {
                  const recipeCount = d.recipes?.length || 0;
                  return (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDishModal(d)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 group-hover:text-primary transition">
                          {d.name}
                        </div>
                        {d.description && (
                          <div className="text-[11px] text-slate-500 truncate max-w-sm mt-0.5">
                            {d.description}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">{getCategoryBadge(d.category)}</td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-slate-900">
                        {d.extraPrice > 0 ? (
                          <span className="text-primary">+{formatVND(Number(d.extraPrice))}</span>
                        ) : (
                          <span className="text-slate-500 font-normal">0 ₫ (Tiêu chuẩn)</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {recipeCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-blue-50 text-primary border border-blue-200">
                            <Layers className="w-3 h-3" />
                            {recipeCount} nguyên liệu
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Chưa gắn</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={d.isAvailable ? 'success' : 'neutral'} size="sm" dot>
                          {d.isAvailable ? 'Đang phục vụ' : 'Tạm ngưng'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredDishes.length === 0 && (
            <div className="py-16 text-center text-xs text-muted">
              {dishesLoading ? 'Đang tải danh mục món...' : 'Không tìm thấy món ăn nào phù hợp với bộ lọc.'}
            </div>
          )}
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 3: NHẬP TỪ EXCEL (4-STEP WIZARD)                     */}
      {/* ======================================================== */}
      {activeTab === 'import' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <ImportStepper
            currentStep={importStep}
            onStepClick={(step) => {
              if (step < importStep) setImportStep(step);
            }}
          />

          {importStep <= 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-2">
                    <span className="size-6 rounded-full bg-blue-50 text-primary text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    Tải file Excel mẫu chuẩn
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={handleDownloadTemplate}
                  >
                    Tải file .xlsx
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  File mẫu chuẩn có 2 sheet đồng bộ: <strong>Sheet 1</strong> (Thực đơn tuần & ca ăn) và <strong>Sheet 2</strong> (Định mức BOM nguyên liệu). Dữ liệu mẫu đã điền sẵn tên cơ sở: <strong>{canteens.find((c) => c.id === activeCanteenId)?.name || 'Cơ sở hiện tại'}</strong>.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                  <span className="size-6 rounded-full bg-blue-50 text-primary text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  Kéo thả file đã điền dữ liệu
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Hệ thống tự động kiểm tra định dạng ngày UTC độc lập múi giờ, đối soát danh mục món, và liên kết công thức nấu với kho bếp.
                </p>
              </div>
            </div>
          )}

          {importStep <= 2 && (
            <div className="bg-white p-10 rounded-2xl border-2 border-dashed border-slate-300 hover:border-primary text-center relative flex flex-col items-center justify-center transition cursor-pointer shadow-2xs group">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="text-sm font-bold text-slate-900">
                Kéo thả hoặc nhấp để chọn file Excel thực đơn
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Chấp nhận định dạng chuẩn .xlsx hoặc .xls (tối đa 10MB)
              </p>
              {selectedFile && (
                <span className="text-xs font-mono font-bold text-primary bg-blue-50 px-3.5 py-1.5 rounded-xl mt-4 border border-blue-200">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
          )}

          {isUploading && (
            <div className="py-8 text-center text-xs text-muted flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span>Đang kiểm tra và xác thực dữ liệu file Excel...</span>
            </div>
          )}

          {importStep >= 3 && previewData && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Bảng đối soát dữ liệu thực đơn ({previewData.validCount} dòng hợp lệ)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Phân loại trạng thái dòng và định mức BOM nguyên liệu trước khi lưu
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
                    Tiến hành Lưu ({previewData.validCount})
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
            <Card className="border-emerald-200 bg-emerald-50/60 space-y-3 p-5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{importResult.message}</span>
              </div>
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  onClick={() => setActiveTab('weekly')}
                >
                  Xem ngay thực đơn tuần
                </Button>
                {onNavigateTab && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                    onClick={() => onNavigateTab('forecast')}
                  >
                    Xem dự báo nguyên liệu bếp
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
                  Tiếp tục nhập đợt mới
                </Button>
              </div>
            </Card>
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

      {/* ======================================================== */}
      {/* 4. MODAL: CHI TIẾT MÓN ĂN & ĐỊNH MỨC NGUYÊN LIỆU BOM     */}
      {/* ======================================================== */}
      {selectedDishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-4 p-6 text-xs animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between pb-3.5 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{selectedDishModal.name}</h3>
                  {getCategoryBadge(selectedDishModal.category)}
                </div>
                {selectedDishModal.description && (
                  <p className="text-slate-500 text-xs">{selectedDishModal.description}</p>
                )}
                <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                  {selectedDishModal.canteenName && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {selectedDishModal.canteenName}
                    </span>
                  )}
                  {selectedDishModal.mealType && (
                    <span>{getMealTypeBadge(selectedDishModal.mealType)}</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                onClick={() => setSelectedDishModal(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-600 font-medium">Phụ thu suất ăn:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {selectedDishModal.extraPrice > 0
                    ? `+${formatVND(Number(selectedDishModal.extraPrice))}`
                    : '0 ₫ (Suất cơm tiêu chuẩn)'}
                </span>
              </div>

              <div>
                <div className="font-bold text-slate-900 flex items-center gap-2 mb-2.5">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Công thức BOM (Định lượng cho 1 suất ăn):</span>
                </div>

                {selectedDishModal.recipes && selectedDishModal.recipes.length > 0 ? (
                  <div className="overflow-hidden border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2.5">Nguyên liệu</th>
                          <th className="px-3.5 py-2.5 text-right">Định lượng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedDishModal.recipes.map((rec: any, idx: number) => {
                          const ingName = rec.ingredient?.name || rec.ingredientName || 'Nguyên liệu';
                          const unit = rec.ingredient?.unit || rec.unit || 'kg';
                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3.5 py-2.5 text-slate-900 font-medium">
                                {ingName}
                                {rec.prepNote && (
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    {rec.prepNote}
                                  </span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 font-mono">
                                {rec.amountPerServing || rec.amount} {unit}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-5 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Món ăn này chưa có công thức định mức BOM nguyên liệu.
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 text-[11px] text-slate-600 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Dữ liệu thực đơn và định mức BOM được đồng bộ tự động từ file Excel. Để điều chỉnh món hoặc định lượng, vui lòng cập nhật file Excel và nhập lại.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
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
