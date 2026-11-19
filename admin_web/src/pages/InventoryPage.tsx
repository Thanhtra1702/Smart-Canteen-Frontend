import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DownloadSimpleIcon as Download,
  CloudArrowUpIcon as UploadCloud,
  CheckCircleIcon as CheckCircle2,
  MagnifyingGlassIcon as Search,
  XIcon as X,
  InfoIcon as Info,
  SpinnerGapIcon as Loader2,
  WarningIcon as AlertTriangle,
  CaretUpDownIcon as ChevronsUpDown,
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { ImportStepper } from '../components/ui/ImportStepper';
import { ExcelValidationTable } from '../components/ui/ExcelValidationTable';
import { ExcelCommitModal } from '../components/ui/ExcelCommitModal';

export const InventoryPage: React.FC = () => {
  const { toast } = useToast();
  const { selectedCanteenId } = useAuth();
  const [activeTab, setActiveTab] = useState<'stock' | 'history' | 'import'>('stock');

  // Stock State
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'currentQty'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // History State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Quick Transaction Modal
  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  const [txType, setTxType] = useState<'IMPORT' | 'EXPORT' | 'WASTE' | 'ADJUSTMENT'>('IMPORT');
  const [txQty, setTxQty] = useState('');
  const [txPrice, setTxPrice] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txSubmitAttempted, setTxSubmitAttempted] = useState(false);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // Excel Import State
  const [importStep, setImportStep] = useState<number>(1);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [showCommitConfirmModal, setShowCommitConfirmModal] = useState(false);
  const [allowPartialImport, setAllowPartialImport] = useState(true);

  const fetchIngredients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory', {
        params: {
          canteenId: selectedCanteenId !== 'ALL' ? selectedCanteenId : undefined,
          isLowStock: filterLowStock ? 'true' : undefined,
          search: search.trim() || undefined,
        },
      });
      setIngredients(Array.isArray(res.data) ? res.data : res.data?.items || []);
    } catch (err) {
      console.error('Failed to load ingredients', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCanteenId, filterLowStock, search]);

  const fetchTransactions = useCallback(async () => {
    try {
      setTxLoading(true);
      const res = await api.get('/inventory/transactions', {
        params: {
          canteenId: selectedCanteenId !== 'ALL' ? selectedCanteenId : undefined,
        },
      });
      setTransactions(Array.isArray(res.data) ? res.data : res.data?.items || []);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setTxLoading(false);
    }
  }, [selectedCanteenId]);

  useEffect(() => {
    if (activeTab === 'stock') {
      fetchIngredients();
    } else if (activeTab === 'history') {
      fetchTransactions();
    }
  }, [activeTab, fetchIngredients, fetchTransactions]);

  const toggleSort = (field: 'name' | 'currentQty') => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const displayedIngredients = useMemo(() => {
    const factor = sortDir === 'asc' ? 1 : -1;
    return [...ingredients].sort((a, b) => {
      if (sortField === 'currentQty') {
        return (Number(a.currentQty || 0) - Number(b.currentQty || 0)) * factor;
      }
      return String(a.name || '').localeCompare(String(b.name || ''), 'vi') * factor;
    });
  }, [ingredients, sortField, sortDir]);

  const lowStockCount = useMemo(
    () =>
      ingredients.filter(
        (ing) => Number(ing.currentQty || 0) <= Number(ing.minQty ?? ing.minThreshold ?? 0)
      ).length,
    [ingredients]
  );

  const getTxQuantityError = (
    type: 'IMPORT' | 'EXPORT' | 'WASTE' | 'ADJUSTMENT',
    rawQty: string,
    currentStock: number
  ): string | null => {
    const trimmed = rawQty.trim();
    if (!trimmed) {
      if ((type === 'EXPORT' || type === 'WASTE') && currentStock <= 0) {
        return 'Tồn kho hiện tại bằng 0, không thể xuất thêm';
      }
      return 'Vui lòng nhập số lượng';
    }

    const qty = Number(trimmed);
    if (!Number.isFinite(qty)) {
      return 'Số lượng không hợp lệ';
    }

    if (type === 'IMPORT') {
      if (qty <= 0) {
        return 'Nhập kho chỉ được cộng thêm, số lượng phải lớn hơn 0';
      }
      return null;
    }

    if (type === 'EXPORT' || type === 'WASTE') {
      if (currentStock <= 0) {
        return 'Tồn kho hiện tại bằng 0, không thể xuất thêm';
      }
      if (qty <= 0) {
        return type === 'EXPORT'
          ? 'Xuất kho chỉ được trừ đi, số lượng phải lớn hơn 0'
          : 'Số lượng xuất hủy phải lớn hơn 0';
      }
      if (qty > currentStock) {
        return `Số lượng xuất không được vượt quá tồn kho (${currentStock.toLocaleString('vi-VN')})`;
      }
      return null;
    }

    if (qty < 0) {
      return 'Số lượng tồn kho thực tế không được âm';
    }
    return null;
  };

  const openTxModal = (ing: any, type: 'IMPORT' | 'EXPORT' | 'WASTE' | 'ADJUSTMENT') => {
    setSelectedIngredient(ing);
    setTxType(type);
    setTxQty(type === 'ADJUSTMENT' ? ing.currentQty?.toString() || '0' : '');
    setTxPrice(ing.unitPrice?.toString() || '');
    setTxSubmitAttempted(false);
    setTxNote(
      type === 'IMPORT'
        ? 'Nhập bổ sung kho'
        : type === 'EXPORT'
        ? 'Xuất ca bếp'
        : type === 'ADJUSTMENT'
        ? 'Kiểm kê kho thực tế'
        : 'Hao hụt / Hết hạn'
    );
    setShowTxModal(true);
  };

  const currentStockNum = Number(selectedIngredient?.currentQty || 0);
  const txQtyError = selectedIngredient
    ? getTxQuantityError(txType, txQty, currentStockNum)
    : null;
  const showQtyError = Boolean(
    txQtyError &&
      (txSubmitAttempted ||
        txQty.trim() !== '' ||
        ((txType === 'EXPORT' || txType === 'WASTE') && currentStockNum <= 0))
  );

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient) return;

    setTxSubmitAttempted(true);

    if (txQtyError) {
      toast.error(txQtyError);
      return;
    }

    if ((txType === 'WASTE' || txType === 'ADJUSTMENT') && !txNote.trim()) {
      toast.error('Vui lòng nhập lý do bắt buộc cho phiếu hủy hoặc điều chỉnh kho');
      return;
    }

    try {
      setIsSubmittingTx(true);
      await api.post('/inventory/transactions', {
        ingredientId: selectedIngredient.id,
        canteenId: selectedIngredient.canteenId,
        type: txType,
        quantity: Number(txQty),
        unitPrice: txPrice ? Number(txPrice) : undefined,
        note: txNote,
      });

      setShowTxModal(false);
      fetchIngredients();
      toast.success('Tạo phiếu kho thành công!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi lưu giao dịch kho');
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/excel/template/inventory', {
        params: { canteenId: selectedCanteenId !== 'ALL' ? selectedCanteenId : undefined },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Mau_Ton_Kho_Nguyen_Lieu.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Đã tải file Excel mẫu thành công!');
      setImportStep(2);
    } catch (err) {
      toast.error('Lỗi tải file mẫu: ' + err);
    }
  };

  const handleInventoryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setPreviewData(null);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      setImportStep(2);
      const res = await api.post('/excel/validate/inventory', formData, {
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
    const header = 'Dong,Nguyen_nhan_loi,Co_so,Ten_nguyen_lieu,Nhom,DVT,Ton_kho,Don_gia\n';
    const rows = previewData.errors
      .map((e: any) => {
        const d = e.rawData || {};
        return `"${e.row}","${e.error.replace(/"/g, '""')}","${d.canteenInput || ''}","${d.name || ''}","${d.category || ''}","${d.unit || ''}","${d.currentQty || ''}","${d.unitPrice || ''}"`;
      })
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Danh_sach_dong_loi_TonKho.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.info('Đã tải danh sách các dòng lỗi về máy!');
  };

  const handleCommitInventory = async () => {
    if (!previewData?.validRows?.length) return;

    try {
      setIsCommitting(true);
      const res = await api.post('/excel/import/inventory', {
        rows: previewData.validRows,
      });
      setImportResult(res.data);
      setPreviewData(null);
      setExcelFile(null);
      setShowCommitConfirmModal(false);
      setImportStep(4);
      fetchIngredients();
      toast.success('Đã import tồn kho thành công!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi import');
    } finally {
      setIsCommitting(false);
    }
  };

  const getTxMeta = (type: string) => {
    switch (type) {
      case 'IMPORT':
        return { label: 'Nhập hàng', dot: 'bg-emerald-500', sign: '+', textClass: 'text-emerald-700' };
      case 'EXPORT':
        return { label: 'Xuất bếp', dot: 'bg-[#0057b8]', sign: '-', textClass: 'text-slate-700' };
      case 'ADJUSTMENT':
        return { label: 'Kiểm kê', dot: 'bg-amber-500', sign: '=', textClass: 'text-slate-700' };
      case 'WASTE':
      default:
        return { label: 'Xuất hủy', dot: 'bg-rose-500', sign: '-', textClass: 'text-rose-600' };
    }
  };

  const tabs = [
    { id: 'stock' as const, label: 'Tồn kho nguyên liệu' },
    { id: 'history' as const, label: 'Sổ kho biến động' },
    { id: 'import' as const, label: 'Nhập Excel' },
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Unified Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {tabs.map((tab) => {
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

        {activeTab === 'stock' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56 sm:flex-none">
              <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên nguyên liệu..."
                className="w-full pl-9 pr-3 h-9 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#0057b8] focus:ring-1 focus:ring-[#0057b8] outline-hidden transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={() => setFilterLowStock((prev) => !prev)}
              className={`h-9 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer inline-flex items-center gap-2 ${
                filterLowStock
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  lowStockCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
              />
              <span>Sắp hết{lowStockCount > 0 ? ` (${lowStockCount})` : ''}</span>
            </button>
          </div>
        )}

        {activeTab === 'import' && (
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} icon={Download}>
            Tải file mẫu .xlsx
          </Button>
        )}
      </div>

      {/* VIEW 1: TỒN KHO (FLOATING ROW-CARDS) */}
      {activeTab === 'stock' && (
        <div className="space-y-3">
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[720px] space-y-2">
              <div className="grid grid-cols-[minmax(200px,1.4fr)_minmax(160px,1.1fr)_120px_110px_210px] items-center gap-3 px-4 py-1 text-xs font-medium text-slate-400">
                <button
                  type="button"
                  onClick={() => toggleSort('name')}
                  className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer text-left"
                >
                  <span>Nguyên liệu</span>
                  <ChevronsUpDown className="size-3 text-slate-300" />
                </button>
                <span>Cơ sở</span>
                <button
                  type="button"
                  onClick={() => toggleSort('currentQty')}
                  className="inline-flex items-center justify-end gap-1 hover:text-slate-700 transition-colors cursor-pointer text-right"
                >
                  <span>Tồn kho</span>
                  <ChevronsUpDown className="size-3 text-slate-300" />
                </button>
                <span className="text-right">Định mức</span>
                <span className="text-right">Thao tác</span>
              </div>

              {displayedIngredients.map((ing) => {
                const minQty = Number(ing.minQty ?? ing.minThreshold ?? 0);
                const isLow = Number(ing.currentQty || 0) <= minQty;

                return (
                  <div
                    key={ing.id}
                    className="bg-white rounded-xl border border-slate-200/75 hover:border-[#0057b8] hover:shadow-xs px-4 py-3 grid grid-cols-[minmax(200px,1.4fr)_minmax(160px,1.1fr)_120px_110px_210px] items-center gap-3 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`size-1.5 rounded-full shrink-0 ${
                            isLow ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                        />
                        <span className="text-xs font-medium text-slate-800 truncate" title={ing.name}>
                          {ing.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5 pl-3.5">
                        {ing.category || 'Nguyên liệu'}
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 truncate" title={ing.canteen?.name || ''}>
                      {ing.canteen?.name || 'Toàn chuỗi'}
                    </div>

                    <div
                      className={`text-right font-mono text-xs font-medium tabular-nums ${
                        isLow ? 'text-rose-600' : 'text-slate-800'
                      }`}
                    >
                      {Number(ing.currentQty || 0).toLocaleString('vi-VN')}{' '}
                      <span className="font-sans text-[11px] text-slate-400">{ing.unit}</span>
                    </div>

                    <div className="text-right font-mono text-xs text-slate-400 tabular-nums">
                      {minQty.toLocaleString('vi-VN')}{' '}
                      <span className="font-sans text-[11px]">{ing.unit}</span>
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openTxModal(ing, 'IMPORT')}
                        className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 transition-colors cursor-pointer"
                      >
                        Nhập
                      </button>
                      <button
                        type="button"
                        onClick={() => openTxModal(ing, 'EXPORT')}
                        className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 transition-colors cursor-pointer"
                      >
                        Xuất
                      </button>
                      <button
                        type="button"
                        onClick={() => openTxModal(ing, 'ADJUSTMENT')}
                        className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 transition-colors cursor-pointer"
                      >
                        Kiểm
                      </button>
                      <button
                        type="button"
                        onClick={() => openTxModal(ing, 'WASTE')}
                        className="h-7 px-2.5 rounded-lg text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                );
              })}

              {displayedIngredients.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200/75 py-12 text-center text-xs text-slate-400">
                  {loading ? 'Đang tải danh mục kho...' : 'Không có nguyên liệu nào phù hợp.'}
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-400">
            {displayedIngredients.length} nguyên liệu
          </div>
        </div>
      )}

      {/* VIEW 2: SỔ KHO BIẾN ĐỘNG (FLOATING ROW-CARDS) */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[680px] space-y-2">
              <div className="grid grid-cols-[150px_minmax(170px,1.2fr)_110px_110px_minmax(170px,1.2fr)] items-center gap-3 px-4 py-1 text-xs font-medium text-slate-400">
                <span>Thời gian</span>
                <span>Nguyên liệu</span>
                <span>Loại phiếu</span>
                <span className="text-right">Số lượng</span>
                <span>Ghi chú</span>
              </div>

              {transactions.map((tx) => {
                const meta = getTxMeta(tx.type);
                const created = new Date(tx.createdAt);
                const timeStr = created.toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const dateStr = created.toLocaleDateString('vi-VN');

                return (
                  <div
                    key={tx.id}
                    className="bg-white rounded-xl border border-slate-200/75 hover:border-[#0057b8] hover:shadow-xs px-4 py-3 grid grid-cols-[150px_minmax(170px,1.2fr)_110px_110px_minmax(170px,1.2fr)] items-center gap-3 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono tabular-nums flex items-center gap-1.5">
                        <span className="text-slate-700">{timeStr}</span>
                        <span className="text-slate-400">{dateStr}</span>
                      </div>
                      {(tx.actor?.fullName || tx.ingredient?.canteen?.name) && (
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {tx.actor?.fullName || tx.ingredient?.canteen?.name}
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-medium text-slate-800 truncate">
                      {tx.ingredient?.name || 'Nguyên liệu'}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`size-1.5 rounded-full shrink-0 ${meta.dot}`} />
                      <span className="text-xs text-slate-700">{meta.label}</span>
                    </div>

                    <div className={`text-right font-mono text-xs font-medium tabular-nums ${meta.textClass}`}>
                      {meta.sign}
                      {tx.quantity} {tx.ingredient?.unit || ''}
                    </div>

                    <div className="text-xs text-slate-500 truncate" title={tx.note || ''}>
                      {tx.note || '—'}
                    </div>
                  </div>
                );
              })}

              {transactions.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200/75 py-12 text-center text-xs text-slate-400">
                  {txLoading ? 'Đang tải dữ liệu biến động...' : 'Chưa có biến động kho nào.'}
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-400">{transactions.length} phiếu kho</div>
        </div>
      )}

      {/* VIEW 3: NHẬP EXCEL */}
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
                    1. Tải file mẫu kiểm kê kho
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Download}
                    onClick={handleDownloadTemplate}
                  >
                    Tải mẫu .xlsx
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Gồm Sheet Danh mục &amp; Tồn kho và Sheet Tra cứu cơ sở, đơn vị tính để nhập đồng loạt nhanh chóng.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="font-semibold text-xs text-slate-800">
                  2. Tải lên file đã cập nhật
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Tên nguyên liệu khớp với công thức BOM giúp hệ thống tự động trừ kho và cảnh báo thiếu hụt theo ca nấu.
                </p>
              </div>
            </div>
          )}

          {importStep <= 2 && (
            <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#0057b8]/60 text-center relative flex flex-col items-center justify-center transition cursor-pointer shadow-2xs">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleInventoryFileChange}
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
                  ? 'Đang đọc và kiểm tra file Excel...'
                  : 'Kéo thả hoặc nhấp để chọn file Excel tồn kho'}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isUploading ? 'Vui lòng chờ trong giây lát' : 'Hỗ trợ .xlsx hoặc .xls (tối đa 10MB)'}
              </p>
              {excelFile && (
                <span className="text-xs font-mono font-medium text-[#0057b8] bg-[#EFF6FF] px-3 py-1 rounded-lg mt-3">
                  {excelFile.name} ({(excelFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
          )}

          {importStep >= 3 && previewData && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Bảng đối soát tồn kho ({previewData.validCount} dòng hợp lệ)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Kiểm tra biến động tồn kho trước khi lưu
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewData(null);
                      setExcelFile(null);
                      setImportStep(2);
                    }}
                  >
                    Chọn file khác
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isCommitting || previewData.validCount === 0}
                    onClick={() => setShowCommitConfirmModal(true)}
                  >
                    Lưu ({previewData.validCount})
                  </Button>
                </div>
              </div>

              <ExcelValidationTable
                type="inventory"
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
                <Button variant="primary" size="sm" onClick={() => setActiveTab('stock')}>
                  Xem danh mục kho
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('history')}>
                  Kiểm tra Sổ kho
                </Button>
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

          {showCommitConfirmModal && previewData && (
            <ExcelCommitModal
              isOpen={showCommitConfirmModal}
              type="inventory"
              summary={{
                total: previewData.validCount,
                inserts:
                  previewData.validRows?.filter((r: any) => r.status === 'INSERT').length || 0,
                updates:
                  previewData.validRows?.filter((r: any) => r.status === 'UPDATE').length || 0,
                canteenName: previewData.validRows?.[0]?.canteenName,
              }}
              isSubmitting={isCommitting}
              onClose={() => setShowCommitConfirmModal(false)}
              onConfirm={handleCommitInventory}
            />
          )}
        </div>
      )}

      {/* Modal Phiếu Kho */}
      {showTxModal && selectedIngredient && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTxModal(false);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200/80 shadow-modal space-y-4 text-xs">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  {txType === 'IMPORT'
                    ? 'Nhập kho nguyên liệu'
                    : txType === 'EXPORT'
                    ? 'Xuất ca bếp'
                    : txType === 'ADJUSTMENT'
                    ? 'Kiểm kê tồn kho thực tế'
                    : 'Xuất hủy hao hụt'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedIngredient.name} • Tồn hiện tại {selectedIngredient.currentQty}{' '}
                  {selectedIngredient.unit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTxModal(false)}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Đóng"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <form noValidate onSubmit={handleSaveTransaction} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block font-medium text-slate-700">
                  {txType === 'ADJUSTMENT'
                    ? `Số lượng tồn thực tế (${selectedIngredient.unit}) *`
                    : `Số lượng ${txType === 'IMPORT' ? 'nhập thêm' : 'xuất đi'} (${selectedIngredient.unit}) *`}
                </label>
                <div className="relative">
                  {txType !== 'ADJUSTMENT' && (
                    <span
                      className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold pointer-events-none ${
                        txType === 'IMPORT' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {txType === 'IMPORT' ? '+' : '-'}
                    </span>
                  )}
                  <input
                    type="number"
                    step="0.01"
                    min={txType === 'ADJUSTMENT' ? '0' : '0.01'}
                    max={
                      txType === 'EXPORT' || txType === 'WASTE'
                        ? String(Math.max(0, currentStockNum))
                        : undefined
                    }
                    required
                    autoFocus
                    value={txQty}
                    onKeyDown={(e) => {
                      if (['-', '+', 'e', 'E'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => setTxQty(e.target.value)}
                    placeholder={txType === 'ADJUSTMENT' ? '0' : 'Nhập số lớn hơn 0...'}
                    className={`w-full h-9 ${
                      txType !== 'ADJUSTMENT' ? 'pl-7 pr-3' : 'px-3'
                    } bg-white border rounded-xl text-xs font-mono text-slate-800 outline-hidden transition-colors ${
                      showQtyError
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-200 focus:border-[#0057b8]'
                    }`}
                  />
                </div>

                {showQtyError ? (
                  <p className="text-[11px] text-rose-600 font-medium">{txQtyError}</p>
                ) : (
                  txQty.trim() !== '' &&
                  !txQtyError &&
                  txType !== 'ADJUSTMENT' && (
                    <p className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Tồn sau giao dịch</span>
                      <span
                        className={`font-mono font-semibold ${
                          txType === 'IMPORT' ? 'text-emerald-700' : 'text-[#0057b8]'
                        }`}
                      >
                        {Number(
                          (txType === 'IMPORT'
                            ? currentStockNum + Number(txQty)
                            : Math.max(0, currentStockNum - Number(txQty))
                          ).toFixed(2)
                        ).toLocaleString('vi-VN')}{' '}
                        {selectedIngredient.unit}
                      </span>
                    </p>
                  )
                )}
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-slate-700">
                  Ghi chú {txType === 'WASTE' || txType === 'ADJUSTMENT' ? '(Bắt buộc) *' : ''}
                </label>
                <input
                  type="text"
                  required={txType === 'WASTE' || txType === 'ADJUSTMENT'}
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  placeholder={
                    txType === 'WASTE' || txType === 'ADJUSTMENT'
                      ? 'Nhập lý do...'
                      : 'Ghi chú thêm...'
                  }
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-[#0057b8] outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTxModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={showQtyError}
                  isLoading={isSubmittingTx}
                >
                  Lưu phiếu
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Excel Import */}
      {showCommitConfirmModal && previewData && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCommitting) setShowCommitConfirmModal(false);
          }}
          className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200/80 shadow-modal space-y-4 text-xs">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">
                    Xác nhận cập nhật tồn kho
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Kiểm tra lại trước khi lưu vào hệ thống
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCommitConfirmModal(false)}
                disabled={isCommitting}
                className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-slate-50/40">
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500">Số nguyên liệu hợp lệ</span>
                <span className="font-mono font-semibold text-slate-800">
                  {previewData.validRows?.length || previewData.validCount || 0} dòng
                </span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-500">File Excel</span>
                <span className="font-medium text-slate-800 truncate max-w-[200px]">
                  {excelFile?.name || 'File tồn kho'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-600 flex items-start gap-2">
              <Info className="size-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Hành động này sẽ cập nhật số lượng tồn kho và định mức tối thiểu của các nguyên liệu trong file.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isCommitting}
                onClick={() => setShowCommitConfirmModal(false)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={isCommitting}
                onClick={handleCommitInventory}
              >
                Xác nhận lưu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
